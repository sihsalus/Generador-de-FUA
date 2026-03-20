import { z } from "zod";
import ParameterTemplateImplementation from "../implementation/sequelize/ParameterTemplateImplementation";
import RuleSetService from "./RuleSetService";
import { CREATED_BY_PLACEHOLDER } from "../utils/constants";

// ── Zod Schemas ──

const createTemplateSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    paramType: z.enum(['STRING', 'NUMBER', 'ENUM', 'DATE', 'BOOLEAN', 'RANGE', 'ARRAY']),
    constraints: z.record(z.any()).default({}),
    required: z.boolean().default(true),
});

const updateTemplateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    paramType: z.enum(['STRING', 'NUMBER', 'ENUM', 'DATE', 'BOOLEAN', 'RANGE', 'ARRAY']).optional(),
    constraints: z.record(z.any()).optional(),
    required: z.boolean().optional(),
});

class ParameterTemplateService {

    /**
     * Crea un template de parámetro reutilizable dentro de un RuleSet.
     */
    async create(ruleSetId: number, data: Record<string, any>) {
        const parsed = createTemplateSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("Datos inválidos para crear ParameterTemplate");
            err.details = parsed.error.flatten().fieldErrors;
            throw err;
        }

        await RuleSetService.getByIdOrUUID(String(ruleSetId));

        const existing = await ParameterTemplateImplementation.getByNameAndRuleSetSequelize(parsed.data.name, ruleSetId);
        if (existing) {
            const err: any = new Error(`Ya existe un template con nombre '${parsed.data.name}' en este RuleSet`);
            err.status = 409;
            throw err;
        }

        const created = await ParameterTemplateImplementation.createTemplateSequelize({
            RuleSetId: ruleSetId,
            ...parsed.data,
            createdBy: CREATED_BY_PLACEHOLDER,
        });

        return { uuid: created.get('uuid'), id: created.get('id') };
    }

    /**
     * Lista todos los templates de un RuleSet.
     */
    async listByRuleSet(ruleSetId: number) {
        return await ParameterTemplateImplementation.listByRuleSetSequelize(ruleSetId);
    }

    /**
     * Obtiene un template por ID o UUID.
     */
    async getByIdOrUUID(idReceived: string) {
        const isNumeric = /^\d+$/.test(idReceived);
        let item;

        if (isNumeric) {
            item = await ParameterTemplateImplementation.getByIdSequelize(Number(idReceived));
        } else {
            item = await ParameterTemplateImplementation.getByUUIDSequelize(idReceived);
        }

        if (!item) {
            const err: any = new Error(`ParameterTemplate '${idReceived}' no encontrado`);
            err.status = 404;
            throw err;
        }

        return item;
    }

    /**
     * Actualiza un template existente.
     */
    async update(idReceived: string, data: Record<string, any>) {
        const parsed = updateTemplateSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("Datos inválidos para actualizar ParameterTemplate");
            err.details = parsed.error.flatten().fieldErrors;
            throw err;
        }

        const existing = await this.getByIdOrUUID(idReceived);
        const id = existing.get('id') as number;
        await ParameterTemplateImplementation.updateTemplateSequelize(id, parsed.data);
        return { uuid: existing.get('uuid'), updated: true };
    }

    /**
     * Soft-delete de un template.
     */
    async softDelete(idReceived: string, inactiveBy: string, inactiveReason?: string) {
        const existing = await this.getByIdOrUUID(idReceived);
        const id = existing.get('id') as number;
        await ParameterTemplateImplementation.softDeleteTemplateSequelize(id, inactiveBy, inactiveReason);
        return { uuid: existing.get('uuid'), deleted: true };
    }

    /**
     * Resuelve un template: retorna la config completa para merge en un PARAMETER node.
     */
    async resolveTemplate(templateIdOrUUID: string): Promise<{
        paramType: string;
        constraints: Record<string, any>;
        required: boolean;
    }> {
        const template = await this.getByIdOrUUID(templateIdOrUUID);
        const plain = template.get({ plain: true }) as any;
        return {
            paramType: plain.paramType,
            constraints: plain.constraints,
            required: plain.required,
        };
    }
}

export default new ParameterTemplateService();
