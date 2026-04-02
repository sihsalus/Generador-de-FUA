import { ScriptExecutorService } from "../ScriptExecutorService";
import testData from "./entity-script-test-data.json";

// --- Helpers ---

const defaults = {
    maxChars: 2000,
    maxTimeMs: 500,
};

function run(script: string, entity: Record<string, any> = {}, payload: Record<string, any> = {}, overrides: Record<string, any> = {}) {
    return ScriptExecutorService.execute({
        script,
        entity,
        payload,
        ...defaults,
        ...overrides,
    });
}

// --- Caso feliz ---

describe("ScriptExecutorService — ejecución normal", () => {
    it("asigna campos del payload a la entidad", () => {
        const result = run(
            `entity.nombre = payload.nombre;`,
            { nombre: "" },
            { nombre: "Juan" }
        );
        expect(result.success).toBe(true);
        expect(result.entity!.nombre).toBe("Juan");
    });

    it("ejecuta lógica condicional", () => {
        const script = `
            if (payload.edad >= 18) {
                entity.grupo = 'ADULTO';
            } else {
                entity.grupo = 'PEDIATRICO';
            }
        `;
        const result = run(script, { grupo: "" }, { edad: 25 });
        expect(result.success).toBe(true);
        expect(result.entity!.grupo).toBe("ADULTO");
    });

    it("no muta la entidad original", () => {
        const original = { valor: 1 };
        const result = run(`entity.valor = 999;`, original, {});
        expect(result.success).toBe(true);
        expect(result.entity!.valor).toBe(999);
        expect(original.valor).toBe(1);
    });

    it("cuenta líneas ejecutables (ignora comentarios y vacías)", () => {
        const script = `
            // comentario
            entity.a = 1;

            entity.b = 2;
            // otro comentario
        `;
        const result = run(script, {}, {});
        expect(result.success).toBe(true);
        expect(result.executedLines).toBe(2);
    });

    it("reporta executionTimeMs", () => {
        const result = run(`entity.x = 1;`, {}, {});
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
});

// --- Validación de tamaño ---

describe("ScriptExecutorService — validación de tamaño", () => {
    it("rechaza script vacío", () => {
        const result = run("", {}, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/vacío/);
    });

    it("rechaza script solo con espacios", () => {
        const result = run("   \n  \n  ", {}, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/vacío/);
    });

    it("rechaza script que excede maxChars", () => {
        const script = "entity.x = 1;".padEnd(2001, " ");
        const result = run(script, {}, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/excede/);
    });
});

// --- Inyección de código: keywords bloqueados ---

describe("ScriptExecutorService — keywords bloqueados", () => {
    const keywordsToBlock = [
        { keyword: "require", script: `var x = require('fs');` },
        { keyword: "import", script: `import('os');` },
        { keyword: "process", script: `process.exit(1);` },
        { keyword: "global", script: `global.x = 1;` },
        { keyword: "globalThis", script: `globalThis.y = 2;` },
        { keyword: "eval", script: `eval('1+1');` },
        { keyword: "Function", script: `new Function('return 1')();` },
        { keyword: "setTimeout", script: `setTimeout(function(){}, 0);` },
        { keyword: "setInterval", script: `setInterval(function(){}, 100);` },
        { keyword: "fetch", script: `fetch('http://evil.com');` },
        { keyword: "fs", script: `var x = fs.readFileSync('/etc/passwd');` },
        { keyword: "child_process", script: `child_process.exec('rm -rf /');` },
        { keyword: "http", script: `http.get('http://evil.com');` },
        { keyword: "net", script: `net.connect(80, 'evil.com');` },
        { keyword: "module", script: `module.exports = {};` },
        { keyword: "exports", script: `exports.x = 1;` },
        { keyword: "__dirname", script: `entity.x = __dirname;` },
        { keyword: "__filename", script: `entity.x = __filename;` },
        { keyword: "WebSocket", script: `new WebSocket('ws://evil.com');` },
        { keyword: "XMLHttpRequest", script: `new XMLHttpRequest();` },
        { keyword: "Proxy", script: `new Proxy({}, {});` },
        { keyword: "Reflect", script: `Reflect.ownKeys({});` },
        { keyword: "Symbol", script: `Symbol('x');` },
    ];

    keywordsToBlock.forEach(({ keyword, script }) => {
        it(`bloquea keyword: ${keyword}`, () => {
            const result = run(script, {}, {});
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/bloqueado/i);
        });
    });

    it("permite keyword dentro de comentario de linea", () => {
        const result = run(
            `// require('fs')\nentity.x = 1;`,
            {},
            {}
        );
        expect(result.success).toBe(true);
    });

    it("permite keyword dentro de comentario de bloque", () => {
        const result = run(
            `/* require('fs') */\nentity.x = 1;`,
            {},
            {}
        );
        expect(result.success).toBe(true);
    });

    it("bloquea keyword fuera de comentario de bloque", () => {
        const result = run(
            `/* comentario */ require('fs');`,
            {},
            {}
        );
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/bloqueado/i);
    });
});

// --- Inyección de código: patrones peligrosos ---

describe("ScriptExecutorService — patrones peligrosos", () => {
    it("bloquea __proto__", () => {
        const result = run(`entity.__proto__.polluted = true;`, {}, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/peligroso/i);
    });

    it("bloquea constructor[", () => {
        const result = run(`entity.constructor['name'];`, {}, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/peligroso/i);
    });

    it("bloquea constructor(", () => {
        const result = run(`entity.constructor('return 1');`, {}, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/peligroso/i);
    });

    it("bloquea .prototype", () => {
        const result = run(`String.prototype.x = 1;`, {}, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/peligroso/i);
    });

    it("bloquea this", () => {
        const result = run(`var x = this;`, {}, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/peligroso/i);
    });
});

// --- Timeout ---

describe("ScriptExecutorService — timeout", () => {
    it("aborta un loop infinito", () => {
        const result = ScriptExecutorService.execute({
            script: `while(true) {}`,
            entity: {},
            payload: {},
            maxChars: 2000,
            maxTimeMs: 100,
        });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/tiempo máximo/);
    });
});

// --- Errores de ejecución ---

describe("ScriptExecutorService — errores de ejecución", () => {
    it("reporta error de sintaxis", () => {
        const result = run(`entity.x = ;`, {}, {});
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    it("reporta variable no definida", () => {
        const result = run(`entity.x = variableQueNoExiste;`, {}, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/not defined/i);
    });

    it("reporta error de tipo (null access)", () => {
        const result = run(`entity.x = payload.a.b.c;`, {}, { a: null });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Cannot read properties/i);
    });
});

// --- Sandbox: solo APIs permitidas ---

describe("ScriptExecutorService — sandbox limitado", () => {
    it("permite JSON.parse y JSON.stringify", () => {
        const script = `entity.json = JSON.parse(JSON.stringify({ a: 1 }));`;
        const result = run(script, {}, {});
        expect(result.success).toBe(true);
        expect(result.entity!.json).toEqual({ a: 1 });
    });

    it("permite Math", () => {
        const result = run(`entity.x = Math.max(1, 5, 3);`, {}, {});
        expect(result.success).toBe(true);
        expect(result.entity!.x).toBe(5);
    });

    it("permite formatDate", () => {
        const result = run(`entity.fecha = formatDate('2025-06-15T10:00:00Z');`, {}, {});
        expect(result.success).toBe(true);
        expect(result.entity!.fecha).toBe("2025-06-15");
    });

    it("permite parseInt / parseFloat / isNaN", () => {
        const script = `
            entity.entero = parseInt('42');
            entity.decimal = parseFloat('3.14');
            entity.esNaN = isNaN('abc');
        `;
        const result = run(script, {}, {});
        expect(result.success).toBe(true);
        expect(result.entity!.entero).toBe(42);
        expect(result.entity!.decimal).toBe(3.14);
        expect(result.entity!.esNaN).toBe(true);
    });
});

// =======================================================
// Tests generados desde entity-script-test-data.json
// =======================================================

type TestCase = {
    body: {
        entity?: Record<string, any>;
        payload?: Record<string, any>;
        script?: string;
        scriptContent?: string;
        maxChars?: number;
        maxTimeMs?: number;
    };
    expect_success: boolean;
    expect_error?: string;
    expect_entity?: Record<string, any>;
};

function runFromTestCase(tc: TestCase) {
    const b = tc.body;
    const script = b.script || b.scriptContent || "";
    const overrides: Record<string, any> = {};
    if (b.maxChars !== undefined) overrides.maxChars = b.maxChars;
    if (b.maxTimeMs !== undefined) overrides.maxTimeMs = b.maxTimeMs;
    return run(script, b.entity || {}, b.payload || {}, overrides);
}

function extractCases(section: Record<string, any>): [string, TestCase][] {
    return Object.entries(section).filter(
        ([key]) => key !== "_instrucciones"
    ) as [string, TestCase][];
}

describe("Data JSON — 2: Ejecución ad-hoc (casos felices)", () => {
    const cases = extractCases(testData["2_EJECUCION_AD_HOC"]);

    cases.forEach(([name, tc]) => {
        it(name, () => {
            const result = runFromTestCase(tc);
            expect(result.success).toBe(tc.expect_success);
            if (tc.expect_entity) {
                for (const [key, value] of Object.entries(tc.expect_entity)) {
                    if (typeof value === "number" && !Number.isInteger(value)) {
                        expect(result.entity![key]).toBeCloseTo(value as number, 5);
                    } else {
                        expect(result.entity![key]).toEqual(value);
                    }
                }
            }
        });
    });
});

describe("Data JSON — 3: Inyección keywords", () => {
    const cases = extractCases(testData["3_INYECCION_KEYWORDS"]);

    cases.forEach(([name, tc]) => {
        it(name, () => {
            const result = runFromTestCase(tc);
            expect(result.success).toBe(false);
            if (tc.expect_error) {
                expect(result.error).toContain(tc.expect_error);
            }
        });
    });
});

describe("Data JSON — 4: Patrones peligrosos", () => {
    const cases = extractCases(testData["4_INYECCION_PATRONES_PELIGROSOS"]);

    cases.forEach(([name, tc]) => {
        it(name, () => {
            const result = runFromTestCase(tc);
            expect(result.success).toBe(false);
            if (tc.expect_error) {
                expect(result.error).toContain(tc.expect_error);
            }
        });
    });
});

describe("Data JSON — 5: Inyección en comentarios", () => {
    const cases = extractCases(testData["5_INYECCION_EN_COMENTARIOS"]);

    cases.forEach(([name, tc]) => {
        it(name, () => {
            const result = runFromTestCase(tc);
            expect(result.success).toBe(tc.expect_success);
            if (tc.expect_entity) {
                for (const [key, value] of Object.entries(tc.expect_entity)) {
                    expect(result.entity![key]).toEqual(value);
                }
            }
        });
    });
});

describe("Data JSON — 6: Timeout y límites", () => {
    const cases = extractCases(testData["6_TIMEOUT_Y_LIMITES"]);

    cases.forEach(([name, tc]) => {
        it(name, () => {
            const result = runFromTestCase(tc);
            expect(result.success).toBe(false);
            if (tc.expect_error) {
                expect(result.error).toContain(tc.expect_error);
            }
        });
    });
});

describe("Data JSON — 7: Errores de ejecución", () => {
    const cases = extractCases(testData["7_ERRORES_DE_EJECUCION"]);

    cases.forEach(([name, tc]) => {
        it(name, () => {
            const result = runFromTestCase(tc);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});