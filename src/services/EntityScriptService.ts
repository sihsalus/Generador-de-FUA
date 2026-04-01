import { z } from "zod";
import { isValidUUIDv4 } from "../utils/utils";
import EntityScriptImplementation from "../implementation/sequelize/EntityScriptImplementation";
import { ScriptExecutorService } from "./ScriptExecutorService";
import { transactionInst } from "../middleware/globalTransaction";

// --- Zod Schemas ---

const createEntityScriptSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  scriptContent: z.string().min(1),
  targetEntity: z.string().min(1),
  maxChars: z.number().int().min(50).max(10000).default(2000),
  maxTimeMs: z.number().int().min(50).max(5000).default(1000),
  createdBy: z.string().min(1),
});

const updateEntityScriptSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  scriptContent: z.string().min(1).optional(),
  targetEntity: z.string().min(1).optional(),
  maxChars: z.number().int().min(50).max(10000).optional(),
  maxTimeMs: z.number().int().min(50).max(5000).optional(),
  updatedBy: z.string().min(1),
});

const executeAdHocSchema = z.object({
  entity: z.record(z.any()),
  payload: z.record(z.any()),
  script: z.string().min(1),
  maxChars: z.number().int().min(50).max(10000).default(2000),
  maxTimeMs: z.number().int().min(50).max(5000).default(1000),
});

const executeStoredSchema = z.object({
  entity: z.record(z.any()),
  payload: z.record(z.any()),
});

class EntityScriptService {

  async create(data: {
    name: string;
    description?: string;
    scriptContent: string;
    targetEntity: string;
    maxChars?: number;
    maxTimeMs?: number;
    createdBy: string;
  }) {
    const result = createEntityScriptSchema.safeParse(data);
    if (!result.success) {
      const newError = new Error('Error in EntityScript Service - create: ZOD validation.');
      (newError as any).details = result.error;
      throw newError;
    }

    const validated = result.data;

    // Validar sintaxis del script antes de guardar
    const validation = ScriptExecutorService.execute({
      entity: {},
      payload: {},
      script: validated.scriptContent,
      maxChars: validated.maxChars,
      maxTimeMs: validated.maxTimeMs,
    });

    if (!validation.success && validation.error?.includes("sintaxis")) {
      throw new Error(`Error in EntityScript Service - create: Script inválido: ${validation.error}`);
    }

    let record = null;
    try {
      record = await EntityScriptImplementation.createSequelize({
        name: validated.name,
        description: validated.description,
        scriptContent: validated.scriptContent,
        targetEntity: validated.targetEntity,
        maxChars: validated.maxChars,
        maxTimeMs: validated.maxTimeMs,
        version: 1,
        createdBy: validated.createdBy,
      });
    } catch (err: any) {
      (err as Error).message = 'Error in EntityScript Service - create: ' + (err as Error).message;
      throw err;
    }

    return record;
  }

  async getByIdOrUUID(idReceived: string) {
    let record = null;
    const nuNumber = Number(idReceived);

    if (Number.isInteger(nuNumber)) {
      try {
        record = await EntityScriptImplementation.getByIdSequelize(nuNumber);
      } catch (err: any) {
        (err as Error).message = 'Error in EntityScript Service - getByIdOrUUID: ' + (err as Error).message;
        throw err;
      }
    } else {
      if (!isValidUUIDv4(idReceived)) {
        throw new Error("Error in EntityScript Service: Invalid UUID format.");
      }
      try {
        record = await EntityScriptImplementation.getByUUIDSequelize(idReceived);
      } catch (err: any) {
        (err as Error).message = 'Error in EntityScript Service - getByIdOrUUID: ' + (err as Error).message;
        throw err;
      }
    }

    return record;
  }

  async listAll(filters: { targetEntity?: string; isActive?: string } = {}) {
    const where: Record<string, any> = {};
    if (filters.targetEntity) where.targetEntity = filters.targetEntity;

    let records = [];
    try {
      records = await EntityScriptImplementation.listAllSequelize(where);
    } catch (err: any) {
      (err as Error).message = 'Error in EntityScript Service - listAll: ' + (err as Error).message;
      throw err;
    }

    return records;
  }

  async update(idReceived: string, data: {
    name?: string;
    description?: string;
    scriptContent?: string;
    targetEntity?: string;
    maxChars?: number;
    maxTimeMs?: number;
    updatedBy: string;
  }) {
    const result = updateEntityScriptSchema.safeParse(data);
    if (!result.success) {
      const newError = new Error('Error in EntityScript Service - update: ZOD validation.');
      (newError as any).details = result.error;
      throw newError;
    }

    const record = await this.getByIdOrUUID(idReceived);
    if (!record) {
      throw new Error(`Error in EntityScript Service - update: EntityScript '${idReceived}' not found.`);
    }

    const updates: Record<string, any> = { ...result.data };

    // Si cambió el script, validar sintaxis antes de guardar
    if (updates.scriptContent) {
      const validation = ScriptExecutorService.execute({
        entity: {},
        payload: {},
        script: updates.scriptContent,
        maxChars: updates.maxChars || record.maxChars,
        maxTimeMs: updates.maxTimeMs || record.maxTimeMs,
      });
      if (!validation.success && validation.error?.includes("sintaxis")) {
        throw new Error(`Error in EntityScript Service - update: Script inválido: ${validation.error}`);
      }
      updates.version = record.version + 1;
    }

    let updated = null;
    try {
      transactionInst.renewTransaction();
      updated = await EntityScriptImplementation.updateSequelize(record, updates);
      await transactionInst.confirmTransaction();
    } catch (err: any) {
      await transactionInst.unconfirmTransaction();
      (err as Error).message = 'Error in EntityScript Service - update: ' + (err as Error).message;
      throw err;
    }

    return updated;
  }

  // --- Ejecución de scripts ---

  executeAdHoc(data: {
    entity: Record<string, any>;
    payload: Record<string, any>;
    script: string;
    maxChars?: number;
    maxTimeMs?: number;
  }) {
    const result = executeAdHocSchema.safeParse(data);
    if (!result.success) {
      const newError = new Error('Error in EntityScript Service - executeAdHoc: ZOD validation.');
      (newError as any).details = result.error;
      throw newError;
    }

    return ScriptExecutorService.execute({
      entity: result.data.entity,
      payload: result.data.payload,
      script: result.data.script,
      maxChars: result.data.maxChars,
      maxTimeMs: result.data.maxTimeMs,
    });
  }

  async executeStored(id: string, entity: Record<string, any>, payload: Record<string, any>) {
    const validation = executeStoredSchema.safeParse({ entity, payload });
    if (!validation.success) {
      const newError = new Error('Error in EntityScript Service - executeStored: ZOD validation.');
      (newError as any).details = validation.error;
      throw newError;
    }

    const record = await this.getByIdOrUUID(id);
    if (!record) {
      throw new Error(`Error in EntityScript Service - executeStored: Script '${id}' not found.`);
    }
    if (!record.active) {
      throw new Error(`Error in EntityScript Service - executeStored: Script '${id}' is inactive.`);
    }

    return ScriptExecutorService.executeFromRecord(record, entity, payload);
  }
}

export default new EntityScriptService();
