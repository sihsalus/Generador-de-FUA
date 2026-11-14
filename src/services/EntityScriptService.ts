import { z } from 'zod';
import { isValidUUIDv4 } from '../utils/utils';
import EntityScriptImplementation from '../implementation/sequelize/EntityScriptImplementation';

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  scriptContent: z.string().min(1),
  targetEntity: z.string().min(1).max(80),
  maxChars: z.number().int().min(50).max(50000).optional(),
  maxTimeMs: z.number().int().min(50).max(5000).optional(),
  createdBy: z.string().min(1),
});

const updateSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().optional(),
  scriptContent: z.string().min(1).optional(),
  targetEntity: z.string().min(1).max(80).optional(),
  maxChars: z.number().int().min(50).max(50000).optional(),
  maxTimeMs: z.number().int().min(50).max(5000).optional(),
  updatedBy: z.string().min(1),
});

const softDeleteSchema = z.object({
  uuid: z.string().uuid(),
  inactiveBy: z.string().min(1),
  inactiveReason: z.string().min(1),
});

class EntityScriptService {

  async create(data: z.infer<typeof createSchema>) {
    const result = createSchema.safeParse(data);
    if (!result.success) {
      const err = new Error('EntityScriptService - create: Zod validation failed.');
      (err as any).details = result.error;
      throw err;
    }

    try {
      const record = await EntityScriptImplementation.createSequelize(result.data);
      return { uuid: record.uuid };
    } catch (err: any) {
      err.message = 'EntityScriptService - create: ' + err.message;
      throw err;
    }
  }

  async getByIdOrUUID(idReceived: string) {
    const asNumber = Number(idReceived);

    if (Number.isInteger(asNumber) && asNumber > 0) {
      try {
        return await EntityScriptImplementation.getByIdSequelize(asNumber);
      } catch (err: any) {
        err.message = 'EntityScriptService - getByIdOrUUID: ' + err.message;
        throw err;
      }
    }

    if (!isValidUUIDv4(idReceived)) {
      throw new Error('EntityScriptService - getByIdOrUUID: Invalid UUID format.');
    }

    try {
      return await EntityScriptImplementation.getByUUIDSequelize(idReceived);
    } catch (err: any) {
      err.message = 'EntityScriptService - getByIdOrUUID: ' + err.message;
      throw err;
    }
  }

  async listAll(targetEntity?: string) {
    try {
      return await EntityScriptImplementation.listAllSequelize(targetEntity);
    } catch (err: any) {
      err.message = 'EntityScriptService - listAll: ' + err.message;
      throw err;
    }
  }

  async update(data: z.infer<typeof updateSchema>) {
    const result = updateSchema.safeParse(data);
    if (!result.success) {
      const err = new Error('EntityScriptService - update: Zod validation failed.');
      (err as any).details = result.error;
      throw err;
    }

    try {
      const record = await EntityScriptImplementation.updateSequelize(result.data);
      if (!record) return null;
      return { uuid: record.uuid };
    } catch (err: any) {
      err.message = 'EntityScriptService - update: ' + err.message;
      throw err;
    }
  }

  async softDelete(data: z.infer<typeof softDeleteSchema>) {
    const result = softDeleteSchema.safeParse(data);
    if (!result.success) {
      const err = new Error('EntityScriptService - softDelete: Zod validation failed.');
      (err as any).details = result.error;
      throw err;
    }

    try {
      const record = await EntityScriptImplementation.softDeleteSequelize(result.data);
      if (!record) return null;
      return { uuid: record.uuid };
    } catch (err: any) {
      err.message = 'EntityScriptService - softDelete: ' + err.message;
      throw err;
    }
  }
}

export default new EntityScriptService();
