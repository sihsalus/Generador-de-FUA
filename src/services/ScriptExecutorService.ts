import * as vm from "vm";
import {
  ScriptExecutionParams,
  ScriptExecutionResult,
} from "../modelsTypeScript/EntityScript";

/**
 * ScriptExecutorService
 *
 * Ejecuta scripts JS en sandbox (Node VM) para transformar entidades
 * usando datos de un payload. Controla tamaño y tiempo de ejecución.
 *
 * Flujo:
 *   1. Validar tamaño del script (maxChars)
 *   2. Sanitizar script (bloquear imports, require, acceso a process/fs)
 *   3. Clonar entidad (proteger original ante errores parciales)
 *   4. Ejecutar en VM con timeout (maxTimeMs)
 *   5. Retornar entidad modificada o error
 */
export class ScriptExecutorService {
  // --- Palabras bloqueadas en scripts ---
  private static readonly BLOCKED_KEYWORDS: string[] = [
    "require",
    "import",
    "process",
    "global",
    "globalThis",
    "eval",
    "Function",
    "setTimeout",
    "setInterval",
    "setImmediate",
    "clearTimeout",
    "clearInterval",
    "clearImmediate",
    "__dirname",
    "__filename",
    "exports",
    "module",
    "child_process",
    "fs",
    "net",
    "http",
    "https",
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "Proxy",
    "Reflect",
    "Symbol",
  ];

  /**
   * Punto de entrada principal — ejecuta un script sobre una entidad.
   */
  static execute(params: ScriptExecutionParams): ScriptExecutionResult {
    const startTime = Date.now();

    try {
      const charValidation = this.validateChars(params.script, params.maxChars);
      if (!charValidation.ok) {
        return this.fail(charValidation.error!, startTime);
      }

      const sanitization = this.sanitize(params.script);
      if (!sanitization.ok) {
        return this.fail(sanitization.error!, startTime);
      }

      const entityClone = structuredClone(params.entity);
      const payloadClone = structuredClone(params.payload);
      const executedLines = this.countExecutableLines(params.script);

      const sandbox = this.buildSandbox(entityClone, payloadClone);
      const context = vm.createContext(sandbox);

      const vmScript = new vm.Script(params.script, {
        filename: "entity-script.js",
      });

      vmScript.runInContext(context, {
        timeout: params.maxTimeMs,
        breakOnSigint: true,
      });

      return {
        success: true,
        entity: sandbox.entity,
        executionTimeMs: Date.now() - startTime,
        executedLines,
      };
    } catch (err: any) {
      const message = this.formatError(err);
      return this.fail(message, startTime);
    }
  }

  /**
   * Ejecuta un script almacenado en BD (usa los límites del registro).
   */
  static executeFromRecord(
    record: { scriptContent: string; maxChars: number; maxTimeMs: number },
    entity: Record<string, any>,
    payload: Record<string, any>
  ): ScriptExecutionResult {
    return this.execute({
      entity,
      payload,
      script: record.scriptContent,
      maxChars: record.maxChars,
      maxTimeMs: record.maxTimeMs,
    });
  }

  // --- Métodos internos ---

  private static validateChars(
    script: string,
    maxChars: number
  ): { ok: boolean; error?: string } {
    if (!script || script.trim().length === 0) {
      return { ok: false, error: "El script está vacío." };
    }
    if (script.length > maxChars) {
      return {
        ok: false,
        error: `El script excede el límite: ${script.length}/${maxChars} caracteres.`,
      };
    }
    return { ok: true };
  }

  private static sanitize(script: string): { ok: boolean; error?: string } {
    const codeWithoutComments = script
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//")) return "";
        const commentIdx = line.indexOf("//");
        return commentIdx >= 0 ? line.substring(0, commentIdx) : line;
      })
      .join("\n");

    for (const keyword of this.BLOCKED_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, "g");
      if (regex.test(codeWithoutComments)) {
        return {
          ok: false,
          error: `Keyword bloqueado detectado: "${keyword}". No está permitido en scripts.`,
        };
      }
    }

    const dangerousPatterns = [
      /__proto__/,
      /constructor\s*\[/,
      /constructor\s*\(/,
      /\.prototype\b/,
      /\bthis\b/,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(codeWithoutComments)) {
        return {
          ok: false,
          error: `Patrón peligroso detectado: ${pattern.source}`,
        };
      }
    }

    return { ok: true };
  }

  /**
   * Construye el sandbox con solo las variables permitidas.
   */
  private static buildSandbox(
    entity: Record<string, any>,
    payload: Record<string, any>
  ): Record<string, any> {
    return {
      entity,
      payload,
      console: {
        log: (..._args: any[]) => {},
      },
      JSON: {
        parse: JSON.parse,
        stringify: JSON.stringify,
      },
      Math,
      Date: {
        now: () => Date.now(),
        toISOString: (ms: number) => new Date(ms).toISOString(),
      },
      String,
      Number,
      Boolean,
      Array: {
        isArray: Array.isArray,
      },
      Object: {
        keys: Object.keys,
        values: Object.values,
        entries: Object.entries,
        assign: Object.assign,
      },
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      formatDate: (date: string | number) => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split("T")[0];
      },
    };
  }

  private static countExecutableLines(script: string): number {
    return script.split("\n").filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("//");
    }).length;
  }

  private static formatError(err: any): string {
    if (err?.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") {
      return "El script excedió el tiempo máximo de ejecución.";
    }
    if (err instanceof SyntaxError) {
      return `Error de sintaxis en el script: ${err.message}`;
    }
    if (err instanceof ReferenceError) {
      return `Variable o función no definida: ${err.message}`;
    }
    if (err instanceof TypeError) {
      return `Error de tipo: ${err.message}`;
    }
    return `Error de ejecución: ${err?.message || "desconocido"}`;
  }

  private static fail(error: string, startTime: number): ScriptExecutionResult {
    return {
      success: false,
      entity: null,
      error,
      executionTimeMs: Date.now() - startTime,
      executedLines: 0,
    };
  }
}
