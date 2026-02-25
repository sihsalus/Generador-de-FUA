import { z } from "zod";
import RuleImplementation from "../implementation/sequelize/RuleImplementation";

// ── Zod Schemas ──

const createRuleSchema = z.object({
    ruleNumber: z.string().min(1, "ruleNumber es requerido").regex(/^\d+$/, "ruleNumber debe ser numérico"),
    name: z.string().min(1, "name es requerido").max(255),
    description: z.string().max(1000).optional(),
    ruleType: z.enum(['CONSISTENCY', 'VALIDATION', 'FORMAT', 'BUSINESS']),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(1).default(1),
});

const updateRuleSchema = z.object({
    ruleNumber: z.string().min(1).regex(/^\d+$/).optional(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    ruleType: z.enum(['CONSISTENCY', 'VALIDATION', 'FORMAT', 'BUSINESS']).optional(),
    enabled: z.boolean().optional(),
    priority: z.number().int().min(1).optional(),
});

class RuleService {

    async create(ruleSetId: number, data: Record<string, any>) {
        const result = createRuleSchema.safeParse(data);
        if (!result.success) {
            const err: any = new Error("Datos inválidos para crear Rule");
            err.details = result.error.flatten().fieldErrors;
            throw err;
        }

        // Verificar ruleNumber no duplicado dentro del RuleSet
        const duplicate = await RuleImplementation.checkDuplicateRuleNumber(ruleSetId, result.data.ruleNumber);
        if (duplicate) {
            const err: any = new Error(`Ya existe una regla con ruleNumber '${result.data.ruleNumber}' en este RuleSet`);
            err.status = 409;
            throw err;
        }

        const created = await RuleImplementation.createRuleSequelize({
            RuleSetId: ruleSetId,
            ...result.data,
        });

        return { uuid: created.get('uuid'), id: created.get('id') };
    }

    async listByRuleSet(ruleSetId: number) {
        return await RuleImplementation.listRulesByRuleSetIdSequelize(ruleSetId);
    }

    async getByIdOrUUID(idReceived: string) {
        const isNumeric = /^\d+$/.test(idReceived);
        let item;

        if (isNumeric) {
            item = await RuleImplementation.getRuleByIdSequelize(Number(idReceived));
        } else {
            item = await RuleImplementation.getRuleByUUIDSequelize(idReceived);
        }

        if (!item) {
            const err: any = new Error(`Rule '${idReceived}' no encontrada`);
            err.status = 404;
            throw err;
        }

        return item;
    }

    async getFullRule(idReceived: string) {
        const isNumeric = /^\d+$/.test(idReceived);
        let item;

        if (isNumeric) {
            item = await RuleImplementation.getFullRuleSequelize(Number(idReceived));
        } else {
            item = await RuleImplementation.getFullRuleByUUIDSequelize(idReceived);
        }

        if (!item) {
            const err: any = new Error(`Rule '${idReceived}' no encontrada`);
            err.status = 404;
            throw err;
        }

        return item;
    }

    async update(idReceived: string, data: Record<string, any>) {
        const result = updateRuleSchema.safeParse(data);
        if (!result.success) {
            const err: any = new Error("Datos inválidos para actualizar Rule");
            err.details = result.error.flatten().fieldErrors;
            throw err;
        }

        const existing = await this.getByIdOrUUID(idReceived);
        const id = existing.get('id') as number;
        const ruleSetId = existing.get('RuleSetId') as number;

        // Verificar ruleNumber no duplicado si se está cambiando
        if (result.data.ruleNumber) {
            const duplicate = await RuleImplementation.checkDuplicateRuleNumber(
                ruleSetId, result.data.ruleNumber, id,
            );
            if (duplicate) {
                const err: any = new Error(`Ya existe una regla con ruleNumber '${result.data.ruleNumber}' en este RuleSet`);
                err.status = 409;
                throw err;
            }
        }

        await RuleImplementation.updateRuleSequelize(id, result.data);
        return { uuid: existing.get('uuid'), updated: true };
    }

    async softDelete(idReceived: string, inactiveBy: string, inactiveReason?: string) {
        const existing = await this.getByIdOrUUID(idReceived);
        const id = existing.get('id') as number;
        await RuleImplementation.softDeleteRuleSequelize(id, inactiveBy, inactiveReason);
        return { uuid: existing.get('uuid'), deleted: true };
    }
}

export default new RuleService();
