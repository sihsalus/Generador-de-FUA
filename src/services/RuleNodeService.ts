import { z } from "zod";
import RuleNodeImplementation from "../implementation/sequelize/RuleNodeImplementation";

// ── Zod Schemas ──

const nodeConfigSchema = z.record(z.any()).refine(
    (cfg) => Object.keys(cfg).length > 0,
    { message: "config no puede estar vacío" },
);

const createNodeSchema = z.object({
    nodeId: z.string().min(1, "nodeId es requerido").max(50),
    nodeType: z.enum(['CONDITION', 'GATE', 'PARAMETER']),
    config: nodeConfigSchema,
    label: z.string().max(255).optional(),
    isEntry: z.boolean().default(false),
    isDefault: z.boolean().default(false),
});

const updateNodeSchema = z.object({
    nodeId: z.string().min(1).max(50).optional(),
    nodeType: z.enum(['CONDITION', 'GATE', 'PARAMETER']).optional(),
    config: nodeConfigSchema.optional(),
    label: z.string().max(255).optional(),
    isEntry: z.boolean().optional(),
    isDefault: z.boolean().optional(),
});

class RuleNodeService {

    async create(ruleId: number, data: Record<string, any>) {
        const result = createNodeSchema.safeParse(data);
        if (!result.success) {
            const err: any = new Error("Datos inválidos para crear RuleNode");
            err.details = result.error.flatten().fieldErrors;
            throw err;
        }

        // Verificar nodeId único dentro de la regla
        const existing = await RuleNodeImplementation.getNodeByNodeIdAndRuleSequelize(
            result.data.nodeId, ruleId,
        );
        if (existing) {
            const err: any = new Error(`nodeId '${result.data.nodeId}' ya existe en esta regla`);
            err.status = 409;
            throw err;
        }

        const created = await RuleNodeImplementation.createNodeSequelize({
            RuleId: ruleId,
            ...result.data,
        });

        return { uuid: created.get('uuid'), id: created.get('id'), nodeId: result.data.nodeId };
    }

    async bulkCreate(ruleId: number, nodes: Array<Record<string, any>>) {
        const validated: any[] = [];

        for (let i = 0; i < nodes.length; i++) {
            const result = createNodeSchema.safeParse(nodes[i]);
            if (!result.success) {
                const err: any = new Error(`Nodo [${i}] inválido`);
                err.details = result.error.flatten().fieldErrors;
                throw err;
            }
            validated.push({ RuleId: ruleId, ...result.data });
        }

        return await RuleNodeImplementation.bulkCreateNodesSequelize(validated);
    }

    async listByRule(ruleId: number) {
        return await RuleNodeImplementation.listNodesByRuleIdSequelize(ruleId);
    }

    async getById(id: number) {
        const item = await RuleNodeImplementation.getNodeByIdSequelize(id);
        if (!item) {
            const err: any = new Error(`RuleNode id=${id} no encontrado`);
            err.status = 404;
            throw err;
        }
        return item;
    }

    async update(id: number, data: Record<string, any>) {
        const result = updateNodeSchema.safeParse(data);
        if (!result.success) {
            const err: any = new Error("Datos inválidos para actualizar RuleNode");
            err.details = result.error.flatten().fieldErrors;
            throw err;
        }

        await RuleNodeImplementation.updateNodeSequelize(id, result.data);
        return { id, updated: true };
    }

    async softDelete(id: number, inactiveBy: string, inactiveReason?: string) {
        await RuleNodeImplementation.softDeleteNodeSequelize(id, inactiveBy, inactiveReason);
        return { id, deleted: true };
    }
}

export default new RuleNodeService();
