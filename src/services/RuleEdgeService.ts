import { z } from "zod";
import RuleEdgeImplementation from "../implementation/sequelize/RuleEdgeImplementation";

// ── Zod Schemas ──

const createEdgeSchema = z.object({
    sourceNodeId: z.string().min(1, "sourceNodeId es requerido"),
    targetNodeId: z.string().min(1, "targetNodeId es requerido"),
    edgeOrder: z.number().int().min(1).default(1),
    label: z.string().max(255).optional(),
});

const updateEdgeSchema = z.object({
    sourceNodeId: z.string().min(1).optional(),
    targetNodeId: z.string().min(1).optional(),
    edgeOrder: z.number().int().min(1).optional(),
    label: z.string().max(255).optional(),
});

class RuleEdgeService {

    async create(ruleId: number, data: Record<string, any>) {
        const result = createEdgeSchema.safeParse(data);
        if (!result.success) {
            const err: any = new Error("Datos inválidos para crear RuleEdge");
            err.details = result.error.flatten().fieldErrors;
            throw err;
        }

        const created = await RuleEdgeImplementation.createEdgeSequelize({
            RuleId: ruleId,
            ...result.data,
        });

        return { uuid: created.get('uuid'), id: created.get('id') };
    }

    async bulkCreate(ruleId: number, edges: Array<Record<string, any>>) {
        const validated: any[] = [];

        for (let i = 0; i < edges.length; i++) {
            const result = createEdgeSchema.safeParse(edges[i]);
            if (!result.success) {
                const err: any = new Error(`Arista [${i}] inválida`);
                err.details = result.error.flatten().fieldErrors;
                throw err;
            }
            validated.push({ RuleId: ruleId, ...result.data });
        }

        return await RuleEdgeImplementation.bulkCreateEdgesSequelize(validated);
    }

    async listByRule(ruleId: number) {
        return await RuleEdgeImplementation.listEdgesByRuleIdSequelize(ruleId);
    }

    async getById(id: number) {
        const item = await RuleEdgeImplementation.getEdgeByIdSequelize(id);
        if (!item) {
            const err: any = new Error(`RuleEdge id=${id} no encontrado`);
            err.status = 404;
            throw err;
        }
        return item;
    }

    async update(id: number, data: Record<string, any>) {
        const result = updateEdgeSchema.safeParse(data);
        if (!result.success) {
            const err: any = new Error("Datos inválidos para actualizar RuleEdge");
            err.details = result.error.flatten().fieldErrors;
            throw err;
        }

        await RuleEdgeImplementation.updateEdgeSequelize(id, result.data);
        return { id, updated: true };
    }

    async softDelete(id: number, inactiveBy: string, inactiveReason?: string) {
        await RuleEdgeImplementation.softDeleteEdgeSequelize(id, inactiveBy, inactiveReason);
        return { id, deleted: true };
    }
}

export default new RuleEdgeService();
