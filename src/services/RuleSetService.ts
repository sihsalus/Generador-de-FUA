import { z } from "zod";
import { sequelize } from "../modelsSequelize/database";
import RuleSetImplementation from "../implementation/sequelize/RuleSetImplementation";
import RuleImplementation from "../implementation/sequelize/RuleImplementation";
import RuleNodeImplementation from "../implementation/sequelize/RuleNodeImplementation";
import RuleEdgeImplementation from "../implementation/sequelize/RuleEdgeImplementation";
import LookupTableImplementation from "../implementation/sequelize/LookupTableImplementation";
import LookupTableRowImplementation from "../implementation/sequelize/LookupTableRowImplementation";
import ParameterTemplateImplementation from "../implementation/sequelize/ParameterTemplateImplementation";
import { CREATED_BY_PLACEHOLDER } from "../utils/constants";

// ── Zod Schemas ──

const evaluationModeEnum = z.enum(['ALL', 'FIRST_VALID', 'ANY', 'MAJORITY', 'WEIGHTED', 'REPORT']);

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

    /**
     * Soft-delete del RuleSet y todo su contenido:
     * Rules (+ nodes + edges), LookupTables (+ rows), ParameterTemplates.
     */
    async softDelete(idReceived: string, inactiveBy: string, inactiveReason?: string) {
        const existing = await this.getByIdOrUUID(idReceived);
        const id = existing.get('id') as number;

        const transaction = await sequelize.transaction();
        try {
            // 1. Soft-delete edges y nodes de cada regla
            const rules = await RuleImplementation.listRulesByRuleSetIdSequelize(id);
            for (const rule of rules) {
                const ruleId = rule.get('id') as number;
                await RuleEdgeImplementation.softDeleteEdgesByRuleIdSequelize(ruleId, inactiveBy);
                await RuleNodeImplementation.softDeleteNodesByRuleIdSequelize(ruleId, inactiveBy);
            }

            // 2. Soft-delete reglas
            for (const rule of rules) {
                const ruleId = rule.get('id') as number;
                await RuleImplementation.softDeleteRuleSequelize(ruleId, inactiveBy, inactiveReason);
            }

            // 3. Soft-delete rows y lookup tables
            const lookupTables = await LookupTableImplementation.listByRuleSetSequelize(id);
            for (const lt of lookupTables) {
                const ltId = lt.get('id') as number;
                await LookupTableRowImplementation.softDeleteRowsByTableIdSequelize(ltId, inactiveBy);
                await LookupTableImplementation.softDeleteLookupTableSequelize(ltId, inactiveBy, inactiveReason);
            }

            // 4. Soft-delete templates
            const templates = await ParameterTemplateImplementation.listByRuleSetSequelize(id);
            for (const t of templates) {
                const tId = t.get('id') as number;
                await ParameterTemplateImplementation.softDeleteTemplateSequelize(tId, inactiveBy, inactiveReason);
            }

            // 5. Soft-delete el RuleSet
            await RuleSetImplementation.softDeleteRuleSetSequelize(id, inactiveBy, inactiveReason);

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        return { uuid: existing.get('uuid'), deleted: true };
    }
}

export default new RuleSetService();
