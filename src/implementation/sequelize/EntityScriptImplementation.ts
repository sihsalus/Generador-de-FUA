import { transactionInst } from '../../middleware/globalTransaction';
import EntityScriptModel from '../../modelsSequelize/EntityScriptModel';

class EntityScriptImplementation {

  async createSequelize(data: {
    name: string;
    description?: string;
    scriptContent: string;
    targetEntity: string;
    maxChars: number;
    maxTimeMs: number;
    version: number;
    createdBy: string;
  }) {
    let record = null;
    try {
      record = await EntityScriptModel.create(data);
    } catch (err: any) {
      (err as Error).message =
        'Error in EntityScript Implementation - createSequelize: ' + (err as Error).message;
      throw err;
    }
    return record;
  }

  async getByIdSequelize(id: number) {
    let record = null;
    try {
      record = await EntityScriptModel.findOne({
        where: { id, active: true },
      });
    } catch (err: any) {
      (err as Error).message =
        `Error in EntityScript Implementation - getByIdSequelize: Couldnt retrieve EntityScript by Id "${id}". ` +
        (err as Error).message;
      throw err;
    }
    return record;
  }

  async getByUUIDSequelize(uuid: string) {
    let record = null;
    try {
      record = await EntityScriptModel.findOne({
        where: { uuid, active: true },
      });
    } catch (err: any) {
      (err as Error).message =
        `Error in EntityScript Implementation - getByUUIDSequelize: Couldnt retrieve EntityScript by UUID '${uuid}'. ` +
        (err as Error).message;
      throw err;
    }
    return record;
  }

  async listAllSequelize(where: Record<string, any> = {}) {
    let records = [];
    try {
      const filter = { ...where, active: true };
      records = await EntityScriptModel.findAll({
        where: filter,
        order: [['name', 'ASC']],
      });
    } catch (err: any) {
      (err as Error).message =
        'Error in EntityScript Implementation - listAllSequelize: ' + (err as Error).message;
      throw err;
    }
    return records;
  }

  async updateSequelize(record: any, data: Record<string, any>) {
    let updated = null;
    try {
      record.set(data);
      updated = await record.save({ transaction: transactionInst.transaction });
    } catch (err: any) {
      (err as Error).message =
        'Error in EntityScript Implementation - updateSequelize: ' + (err as Error).message;
      throw err;
    }
    return updated;
  }
}

export default new EntityScriptImplementation();
