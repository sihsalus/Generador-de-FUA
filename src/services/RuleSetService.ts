import { z } from "zod";
import RuleSetImplementation from "../implementation/sequelize/RuleSetImplementation";
import { CREATED_BY_PLACEHOLDER } from "../utils/constants";

// ── Zod Schemas ──

const evaluationModeEnum = z.enum(['ALL', 'FIRST_MATCH', 'FIRST_VALID', 'ANY', 'MAJORITY', 'WEIGHTED']);

const createRuleSetSchema = z.object({
    name: z.string().min(1, "name es requerido").max(255),
    description: z.string().max(1000).optional(),
    documentType: z.string().min(1, "documentType es requerido").max(100),
    evaluationMode: evaluationModeEnum.default('ALL'),
    threshold: z.number().min(0).max(1).default(0.5).optional(),
});

const updateRuleSetSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    documentType: z.string().min(1).max(100).optional(),
    evaluationMode: evaluationModeEnum.optional(),
    threshold: z.number().min(0).max(1).optional(),
});

class RuleSetService {

    async create(data: Record<string, any>) {
        const result = createRuleSetSchema.safeParse(data);
        if (!result.success) {
            const err: any = new Error("Datos inválidos para crear RuleSet");
            err.details = result.error.flatten().fieldErrors;
            throw err;
        }

        const created = await RuleSetImplementation.createRuleSetSequelize({ ...result.data, createdBy: CREATED_BY_PLACEHOLDER });
        return { uuid: created.get('uuid'), id: created.get('id') };
    }

    async listAll() {
        const items = await RuleSetImplementation.listAllRuleSetsSequelize();
        return items;
    }

    async getByIdOrUUID(idReceived: string) {
        const isNumeric = /^\d+$/.test(idReceived);
        let item;

        if (isNumeric) {
            item = await RuleSetImplementation.getRuleSetByIdSequelize(Number(idReceived));
        } else {
            item = await RuleSetImplementation.getRuleSetByUUIDSequelize(idReceived);
        }

        if (!item) {
            const err: any = new Error(`RuleSet '${idReceived}' no encontrado`);
            err.status = 404;
            throw err;
        }

        return item;
    }

    async update(idReceived: string, data: Record<string, any>) {
        const result = updateRuleSetSchema.safeParse(data);
        if (!result.success) {
            const err: any = new Error("Datos inválidos para actualizar RuleSet");
            err.details = result.error.flatten().fieldErrors;
            throw err;
        }

        const existing = await this.getByIdOrUUID(idReceived);
        const id = existing.get('id') as number;
        await RuleSetImplementation.updateRuleSetSequelize(id, result.data);
        return { uuid: existing.get('uuid'), updated: true };
    }

    async softDelete(idReceived: string, inactiveBy: string, inactiveReason?: string) {
        const existing = await this.getByIdOrUUID(idReceived);
        const id = existing.get('id') as number;
        await RuleSetImplementation.softDeleteRuleSetSequelize(id, inactiveBy, inactiveReason);
        return { uuid: existing.get('uuid'), deleted: true };
    }
}

export default new RuleSetService();
