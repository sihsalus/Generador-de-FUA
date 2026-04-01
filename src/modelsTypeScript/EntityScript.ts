/**
 * EntityScript — Tipos para el sistema de ejecución de scripts dinámicos.
 *
 * Permite actualizar entidades inyectando código JS controlado,
 * usando un payload como fuente de datos y un script como transformador.
 */

import { BaseEntityInterface } from "./BaseEntity";

export interface ScriptExecutionParams {
  /** Objeto entidad a modificar (se clona internamente) */
  entity: Record<string, any>;
  /** Datos de entrada que el script puede leer */
  payload: Record<string, any>;
  /** Código JS como string — puede incluir líneas comentadas "//" */
  script: string;
  /** Máximo de caracteres permitidos para el script */
  maxChars: number;
  /** Tiempo máximo de ejecución en milisegundos */
  maxTimeMs: number;
}

export interface ScriptExecutionResult {
  success: boolean;
  /** Entidad modificada (solo si success=true) */
  entity: Record<string, any> | null;
  /** Mensaje de error (solo si success=false) */
  error?: string;
  /** Milisegundos que tardó la ejecución */
  executionTimeMs: number;
  /** Líneas del script que se ejecutaron (sin comentarios) */
  executedLines: number;
}

export interface EntityScriptRecord extends BaseEntityInterface {
  /** Nombre identificador del script (ej: "actualizar_paciente_fua") */
  name: string;
  /** Descripción legible del propósito del script */
  description?: string;
  /** Código JS como texto — soporta "//" para líneas opcionales */
  scriptContent: string;
  /** Entidad objetivo (ej: "FUAFormat", "Patient", "Visit") */
  targetEntity: string;
  /** Límite de caracteres permitido para este script */
  maxChars: number;
  /** Timeout en ms */
  maxTimeMs: number;
  /** Versión del script (para auditoría) */
  version: number;
}

/**
 * Ejemplo de uso del sistema:
 *
 * Script almacenado en BD:
 * ```
 * // entity.nombreCompleto = payload.nombres + ' ' + payload.apellidos;
 * entity.edad = payload.edad;
 * entity.estado = payload.activo ? 'ACTIVO' : 'INACTIVO';
 * entity.ultimaActualizacion = payload.fecha;
 * ```
 *
 * Las líneas con "//" son opcionales — se pueden descomentar
 * cuando se necesite que el script haga más cosas, sin cambiar el payload.
 */
