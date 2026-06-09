import { inspect } from 'util';
import { isValidUUIDv4 } from '../../utils/utils';
import EntityScriptModel from '../../modelsSequelize/EntityScriptModel';

interface CreateEntityScriptData {
  name: string;
  description?: string;
  scriptContent: string;
  targetEntity: string;
  maxChars?: number;
  maxTimeMs?: number;
  createdBy: string;
}

interface UpdateEntityScriptData {
  uuid: string;
  name?: string;
  description?: string;
  scriptContent?: string;
  targetEntity?: string;
  maxChars?: number;
  maxTimeMs?: number;
  updatedBy: string;
}

interface SoftDeleteData {
  uuid: string;
  inactiveBy: string;
  inactiveReason: string;
}

class EntityScriptImplementation {

  async createSequelize(data: CreateEntityScriptData) {
    try {
      return await EntityScriptModel.create(data);
    } catch (err: any) {
      err.message = 'Error in EntityScript Implementation - createSequelize: ' + err.message;
      err.details = inspect(err, { depth: 10, colors: false });
      throw err;
    }
  }

  async getByIdSequelize(id: number) {
    try {
      return await EntityScriptModel.findOne({
        where: { id, active: true },
      });
    } catch (err: any) {
      err.message = `Error in EntityScript Implementation - getByIdSequelize (id=${id}): ` + err.message;
      err.details = inspect(err, { depth: 10, colors: false });
      throw err;
    }
  }

  async getByUUIDSequelize(uuid: string) {
    try {
      return await EntityScriptModel.findOne({
        where: { uuid, active: true },
      });
    } catch (err: any) {
      err.message = `Error in EntityScript Implementation - getByUUIDSequelize (uuid=${uuid}): ` + err.message;
      err.details = inspect(err, { depth: 10, colors: false });
      throw err;
    }
  }

  async listAllSequelize(targetEntity?: string) {
    const where: any = { active: true };
    if (targetEntity) where.targetEntity = targetEntity;

    try {
      return await EntityScriptModel.findAll({ where });
    } catch (err: any) {
      err.message = 'Error in EntityScript Implementation - listAllSequelize: ' + err.message;
      err.details = inspect(err, { depth: 10, colors: false });
      throw err;
    }
  }

  async updateSequelize(data: UpdateEntityScriptData) {
    const record = await EntityScriptModel.findOne({
      where: { uuid: data.uuid, active: true },
    });

    if (!record) return null;

    const fields: any = { updatedBy: data.updatedBy };
    if (data.name !== undefined) fields.name = data.name;
    if (data.description !== undefined) fields.description = data.description;
    if (data.targetEntity !== undefined) fields.targetEntity = data.targetEntity;
    if (data.maxChars !== undefined) fields.maxChars = data.maxChars;
    if (data.maxTimeMs !== undefined) fields.maxTimeMs = data.maxTimeMs;
    if (data.scriptContent !== undefined) {
      fields.scriptContent = data.scriptContent;
      fields.version = record.version + 1;
    }

    try {
      return await record.update(fields);
    } catch (err: any) {
      err.message = 'Error in EntityScript Implementation - updateSequelize: ' + err.message;
      err.details = inspect(err, { depth: 10, colors: false });
      throw err;
    }
  }

  async getByNameSequelize(name: string) {
    try {
      return await EntityScriptModel.findOne({
        where: { name, active: true },
      });
    } catch (err: any) {
      err.message = `Error in EntityScript Implementation - getByNameSequelize (name=${name}): ` + err.message;
      err.details = inspect(err, { depth: 10, colors: false });
      throw err;
    }
  }

  async softDeleteSequelize(data: SoftDeleteData) {
    const record = await EntityScriptModel.findOne({
      where: { uuid: data.uuid, active: true },
    });

    if (!record) return null;

    try {
      return await record.update({
        active: false,
        inactiveBy: data.inactiveBy,
        inactiveReason: data.inactiveReason,
        inactiveAt: new Date(),
      });
    } catch (err: any) {
      err.message = 'Error in EntityScript Implementation - softDeleteSequelize: ' + err.message;
      err.details = inspect(err, { depth: 10, colors: false });
      throw err;
    }
  }
}

export default new EntityScriptImplementation();
