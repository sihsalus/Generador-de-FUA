import { z } from "zod";
import { sequelize } from "../modelsSequelize/database";
import RuleService from "./RuleService";
import RuleNodeService from "./RuleNodeService";
import RuleEdgeService from "./RuleEdgeService";
import RuleSetService from "./RuleSetService";
import RuleImplementation from "../implementation/sequelize/RuleImplementation";
import RuleNodeImplementation from "../implementation/sequelize/RuleNodeImplementation";
import RuleEdgeImplementation from "../implementation/sequelize/RuleEdgeImplementation";
import { validateGraph, GraphNode, GraphEdge, GraphValidationResult } from "../utils/graphValidator";
import { CREATED_BY_PLACEHOLDER } from "../utils/constants";

// ────────────────────────────────────────────
// Zod Schemas para operaciones del orquestador
// ────────────────────────────────────────────

const nodeSchema = z.object({
    nodeId: z.string().min(1).max(50),
    nodeType: z.enum(['CONDITION', 'GATE', 'PARAMETER']),
    config: z.record(z.any()),
    label: z.string().max(255).optional(),
    isEntry: z.boolean().default(false),
    isDefault: z.boolean().default(false),
});

const edgeSchema = z.object({
    sourceNodeId: z.string().min(1),
    targetNodeId: z.string().min(1),
    edgeOrder: z.number().int().min(1).default(1),
    label: z.string().max(255).optional(),
});

const createFullRuleSchema = z.object({
    ruleNumber: z.string().min(1).regex(/^[A-Za-z0-9]+$/, "ruleNumber debe ser alfanumérico"),
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    ruleType: z.enum(['CONSISTENCY', 'VALIDATION', 'FORMAT', 'BUSINESS']),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(1).default(1),
    weight: z.number().min(0).default(1.0).optional(),
    graph: z.object({
        nodes: z.array(nodeSchema).min(1, "Se requiere al menos un nodo"),
        edges: z.array(edgeSchema).default([]),
    }),
});

const importJsonSchema = z.object({
    rules: z.array(z.object({
        ruleNumber: z.string().min(1).regex(/^[A-Za-z0-9]+$/),
        name: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        ruleType: z.enum(['CONSISTENCY', 'VALIDATION', 'FORMAT', 'BUSINESS']),
        enabled: z.boolean().default(true),
        priority: z.number().int().min(1).default(1),
        weight: z.number().min(0).default(1.0).optional(),
        graph: z.object({
            nodes: z.array(nodeSchema).min(1),
            edges: z.array(edgeSchema).default([]),
        }),
    })).min(1),
});

// ────────────────────────────────────────────
// Servicio orquestador
// ────────────────────────────────────────────

class GraphRuleService {

    /**
     * Crea una regla completa con todos sus nodos y aristas
     * dentro de una transacción atómica.
     * 
     * 1. Valida datos con Zod
     * 2. Valida integridad del grafo (DAG, tipos de conexión, etc.)
     * 3. Crea Rule + Nodes + Edges en transacción
     */
    async createFullRule(ruleSetId: number, data: Record<string, any>) {
        // 1. Validar estructura con Zod
        const parsed = createFullRuleSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("Datos inválidos para crear regla completa");
            err.details = parsed.error.flatten();
            throw err;
        }
        const ruleData = parsed.data;

        // 2. Verificar que el RuleSet existe
        await RuleSetService.getByIdOrUUID(String(ruleSetId));

        // 3. Verificar ruleNumber no duplicado
        const duplicate = await RuleImplementation.checkDuplicateRuleNumber(
            ruleSetId, ruleData.ruleNumber,
        );
        if (duplicate) {
            const err: any = new Error(`Ya existe una regla con ruleNumber '${ruleData.ruleNumber}' en este RuleSet`);
            err.status = 409;
            throw err;
        }

        // 4. Auto-detectar isEntry en nodos CONDITION que no son target de ninguna arista
        const targetNodeIds = new Set(ruleData.graph.edges.map(e => e.targetNodeId));
        const nodesWithEntry = ruleData.graph.nodes.map(node => ({
            ...node,
            isEntry: node.nodeType === 'CONDITION' && !targetNodeIds.has(node.nodeId),
        }));

        // 5. Validar integridad del grafo
        const graphNodes: GraphNode[] = nodesWithEntry.map(n => ({
            nodeId: n.nodeId,
            nodeType: n.nodeType,
            config: n.config,
            isDefault: n.isDefault,
        }));
        const graphEdges: GraphEdge[] = ruleData.graph.edges.map(e => ({
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            edgeOrder: e.edgeOrder,
        }));

        const validation = validateGraph(graphNodes, graphEdges);
        if (!validation.isValid) {
            const err: any = new Error("El grafo de la regla no es válido");
            err.details = {
                errors: validation.errors,
                warnings: validation.warnings,
            };
            err.status = 422;
            throw err;
        }

        // 6. Crear todo en transacción
        const transaction = await sequelize.transaction();
        try {
            // Crear la regla
            const rule = await RuleImplementation.createRuleSequelize({
                RuleSetId: ruleSetId,
                ruleNumber: ruleData.ruleNumber,
                name: ruleData.name,
                description: ruleData.description,
                ruleType: ruleData.ruleType,
                enabled: ruleData.enabled,
                priority: ruleData.priority,
                weight: ruleData.weight ?? 1.0,
                createdBy: CREATED_BY_PLACEHOLDER,
            });

            const ruleId = rule.get('id') as number;

            // Crear nodos
            const nodesToCreate = nodesWithEntry.map(n => ({
                RuleId: ruleId,
                nodeId: n.nodeId,
                nodeType: n.nodeType,
                config: n.config,
                label: n.label,
                isEntry: n.isEntry,
                isDefault: n.isDefault,
                createdBy: CREATED_BY_PLACEHOLDER,
            }));
            await RuleNodeImplementation.bulkCreateNodesSequelize(nodesToCreate);

            // Crear aristas
            if (ruleData.graph.edges.length > 0) {
                const edgesToCreate = ruleData.graph.edges.map(e => ({
                    RuleId: ruleId,
                    sourceNodeId: e.sourceNodeId,
                    targetNodeId: e.targetNodeId,
                    edgeOrder: e.edgeOrder,
                    label: e.label,
                    createdBy: CREATED_BY_PLACEHOLDER,
                }));
                await RuleEdgeImplementation.bulkCreateEdgesSequelize(edgesToCreate);
            }

            await transaction.commit();

            return {
                uuid: rule.get('uuid'),
                id: ruleId,
                ruleNumber: ruleData.ruleNumber,
                validation: {
                    isValid: true,
                    warnings: validation.warnings,
                },
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Obtiene una regla completa con su grafo (nodos + aristas)
     * formateada para visualización o exportación.
     */
    async getFullRule(ruleIdOrUUID: string) {
        const rule = await RuleService.getFullRule(ruleIdOrUUID);
        const plain = rule.get({ plain: true }) as any;

        return {
            id: plain.id,
            uuid: plain.uuid,
            ruleNumber: plain.ruleNumber,
            name: plain.name,
            description: plain.description,
            ruleType: plain.ruleType,
            enabled: plain.enabled,
            priority: plain.priority,
            graph: {
                nodes: (plain.RuleNodes || []).map((n: any) => ({
                    nodeId: n.nodeId,
                    nodeType: n.nodeType,
                    config: n.config,
                    label: n.label,
                    isEntry: n.isEntry,
                    isDefault: n.isDefault,
                })),
                edges: (plain.RuleEdges || []).map((e: any) => ({
                    id: e.id,
                    sourceNodeId: e.sourceNodeId,
                    targetNodeId: e.targetNodeId,
                    edgeOrder: e.edgeOrder,
                    label: e.label,
                })),
            },
        };
    }

    /**
     * Añade un nodo a una regla existente y re-valida el grafo.
     */
    async addNode(ruleIdOrUUID: string, nodeData: Record<string, any>) {
        const rule = await RuleService.getByIdOrUUID(ruleIdOrUUID);
        const ruleId = rule.get('id') as number;

        // Crear el nodo
        const created = await RuleNodeService.create(ruleId, nodeData);

        // Re-validar grafo
        const graphValidation = await this.validateRuleGraph(ruleId);

        return {
            ...created,
            graphValidation,
        };
    }

    /**
     * Actualiza un nodo existente (config, tipo, label, etc.)
     * y re-valida el grafo.
     */
    async updateNode(ruleIdOrUUID: string, nodeBusinessId: string, updateData: Record<string, any>) {
        const rule = await RuleService.getByIdOrUUID(ruleIdOrUUID);
        const ruleId = rule.get('id') as number;

        // Buscar el nodo por su nodeId de negocio
        const node = await RuleNodeImplementation.getNodeByNodeIdAndRuleSequelize(nodeBusinessId, ruleId);
        if (!node) {
            const err: any = new Error(`Nodo '${nodeBusinessId}' no encontrado en la regla`);
            err.status = 404;
            throw err;
        }

        const nodeDbId = node.get('id') as number;
        await RuleNodeService.update(nodeDbId, updateData);

        // Re-validar grafo
        const graphValidation = await this.validateRuleGraph(ruleId);

        return {
            nodeId: nodeBusinessId,
            updated: true,
            graphValidation,
        };
    }

    /**
     * Elimina un nodo y todas sus aristas asociadas (cascade),
     * luego re-valida el grafo.
     */
    async removeNode(ruleIdOrUUID: string, nodeBusinessId: string, inactiveBy: string) {
        const rule = await RuleService.getByIdOrUUID(ruleIdOrUUID);
        const ruleId = rule.get('id') as number;

        const node = await RuleNodeImplementation.getNodeByNodeIdAndRuleSequelize(nodeBusinessId, ruleId);
        if (!node) {
            const err: any = new Error(`Nodo '${nodeBusinessId}' no encontrado en la regla`);
            err.status = 404;
            throw err;
        }

        const transaction = await sequelize.transaction();
        try {
            // Soft-delete aristas asociadas al nodo
            await RuleEdgeImplementation.softDeleteEdgesByNodeIdSequelize(
                nodeBusinessId, ruleId, inactiveBy,
            );

            // Soft-delete el nodo
            const nodeDbId = node.get('id') as number;
            await RuleNodeImplementation.softDeleteNodeSequelize(nodeDbId, inactiveBy);

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        // Re-validar grafo
        const graphValidation = await this.validateRuleGraph(ruleId);

        return {
            nodeId: nodeBusinessId,
            deleted: true,
            graphValidation,
        };
    }

    /**
     * Añade una arista a una regla existente y re-valida el grafo.
     */
    async addEdge(ruleIdOrUUID: string, edgeData: Record<string, any>) {
        const rule = await RuleService.getByIdOrUUID(ruleIdOrUUID);
        const ruleId = rule.get('id') as number;

        // Verificar que los nodos source y target existen en la regla
        const sourceNode = await RuleNodeImplementation.getNodeByNodeIdAndRuleSequelize(
            edgeData.sourceNodeId, ruleId,
        );
        const targetNode = await RuleNodeImplementation.getNodeByNodeIdAndRuleSequelize(
            edgeData.targetNodeId, ruleId,
        );

        if (!sourceNode) {
            const err: any = new Error(`Nodo source '${edgeData.sourceNodeId}' no existe en la regla`);
            err.status = 404;
            throw err;
        }
        if (!targetNode) {
            const err: any = new Error(`Nodo target '${edgeData.targetNodeId}' no existe en la regla`);
            err.status = 404;
            throw err;
        }

        const created = await RuleEdgeService.create(ruleId, edgeData);

        // Re-validar grafo
        const graphValidation = await this.validateRuleGraph(ruleId);

        return {
            ...created,
            graphValidation,
        };
    }

    /**
     * Elimina una arista y re-valida el grafo.
     */
    async removeEdge(ruleIdOrUUID: string, edgeId: number, inactiveBy: string) {
        const rule = await RuleService.getByIdOrUUID(ruleIdOrUUID);
        const ruleId = rule.get('id') as number;

        await RuleEdgeService.softDelete(edgeId, inactiveBy);

        // Re-validar grafo
        const graphValidation = await this.validateRuleGraph(ruleId);

        return {
            edgeId,
            deleted: true,
            graphValidation,
        };
    }

    /**
     * Valida el grafo actual de una regla sin modificar nada.
     * Retorna errores y warnings.
     */
    async validateRuleGraph(ruleIdOrInput: number | string): Promise<GraphValidationResult> {
        let ruleId: number;

        if (typeof ruleIdOrInput === 'string') {
            const rule = await RuleService.getByIdOrUUID(ruleIdOrInput);
            ruleId = rule.get('id') as number;
        } else {
            ruleId = ruleIdOrInput;
        }

        const nodes = await RuleNodeImplementation.listNodesByRuleIdSequelize(ruleId);
        const edges = await RuleEdgeImplementation.listEdgesByRuleIdSequelize(ruleId);

        const graphNodes: GraphNode[] = nodes.map((n: any) => ({
            nodeId: n.get('nodeId'),
            nodeType: n.get('nodeType'),
            config: n.get('config'),
            isDefault: n.get('isDefault'),
        }));

        const graphEdges: GraphEdge[] = edges.map((e: any) => ({
            sourceNodeId: e.get('sourceNodeId'),
            targetNodeId: e.get('targetNodeId'),
            edgeOrder: e.get('edgeOrder'),
        }));

        return validateGraph(graphNodes, graphEdges);
    }

    /**
     * Importa múltiples reglas desde un JSON al RuleSet indicado.
     * Cada regla se crea atómicamente.
     */
    async importFromJSON(ruleSetId: number, jsonData: Record<string, any>) {
        const parsed = importJsonSchema.safeParse(jsonData);
        if (!parsed.success) {
            const err: any = new Error("JSON de importación inválido");
            err.details = parsed.error.errors.map(e => ({ path: e.path.join('.'), message: e.message }));
            throw err;
        }

        const results: Array<{ ruleNumber: string; success: boolean; uuid?: string; error?: string; warnings?: any[] }> = [];

        for (const ruleInput of parsed.data.rules) {
            try {
                const result = await this.createFullRule(ruleSetId, ruleInput);
                results.push({
                    ruleNumber: ruleInput.ruleNumber,
                    success: true,
                    uuid: result.uuid,
                    warnings: result.validation.warnings,
                });
            } catch (error: any) {
                results.push({
                    ruleNumber: ruleInput.ruleNumber,
                    success: false,
                    error: error.message,
                });
            }
        }

        return {
            total: parsed.data.rules.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        };
    }

    /**
     * Exporta una regla completa a formato JSON estandarizado.
     */
    async exportRuleToJSON(ruleIdOrUUID: string) {
        const fullRule = await this.getFullRule(ruleIdOrUUID);

        return {
            $schema: "graph-rule-master-v2",
            version: "2.0.0",
            exportedAt: new Date().toISOString(),
            rule: fullRule,
        };
    }

    /**
     * Exporta todas las reglas de un RuleSet a formato JSON.
     */
    async exportRuleSetToJSON(ruleSetIdOrUUID: string) {
        const ruleSet = await RuleSetService.getByIdOrUUID(ruleSetIdOrUUID);
        const ruleSetId = ruleSet.get('id') as number;
        const ruleSetPlain = ruleSet.get({ plain: true }) as any;

        const rules = await RuleService.listByRuleSet(ruleSetId);
        const fullRules = [];

        for (const rule of rules) {
            const ruleUUID = rule.get('uuid') as string;
            const full = await this.getFullRule(ruleUUID);
            fullRules.push(full);
        }

        return {
            $schema: "graph-rule-master-v2",
            version: "2.0.0",
            exportedAt: new Date().toISOString(),
            ruleSet: {
                id: ruleSetPlain.id,
                uuid: ruleSetPlain.uuid,
                name: ruleSetPlain.name,
                description: ruleSetPlain.description,
                documentType: ruleSetPlain.documentType,
                evaluationMode: ruleSetPlain.evaluationMode,
            },
            rules: fullRules,
        };
    }

    /**
     * Reemplaza el grafo completo de una regla existente.
     * Soft-deletes todos los nodos/aristas anteriores y crea los nuevos.
     */
    async replaceGraph(ruleIdOrUUID: string, graphData: { nodes: any[]; edges: any[] }, replacedBy: string) {
        const rule = await RuleService.getByIdOrUUID(ruleIdOrUUID);
        const ruleId = rule.get('id') as number;

        // Validar datos
        const graphSchema = z.object({
            nodes: z.array(nodeSchema).min(1),
            edges: z.array(edgeSchema).default([]),
        });

        const parsed = graphSchema.safeParse(graphData);
        if (!parsed.success) {
            const err: any = new Error("Datos de grafo inválidos");
            err.details = parsed.error.flatten();
            throw err;
        }

        // Auto-detectar isEntry
        const targetNodeIds = new Set(parsed.data.edges.map(e => e.targetNodeId));
        const nodesWithEntry = parsed.data.nodes.map(node => ({
            ...node,
            isEntry: node.nodeType === 'CONDITION' && !targetNodeIds.has(node.nodeId),
        }));

        // Validar grafo antes de modificar
        const graphNodes: GraphNode[] = nodesWithEntry.map(n => ({
            nodeId: n.nodeId,
            nodeType: n.nodeType,
            config: n.config,
            isDefault: n.isDefault,
        }));
        const graphEdges: GraphEdge[] = parsed.data.edges.map(e => ({
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            edgeOrder: e.edgeOrder,
        }));

        const validation = validateGraph(graphNodes, graphEdges);
        if (!validation.isValid) {
            const err: any = new Error("El nuevo grafo no es válido");
            err.details = {
                errors: validation.errors,
                warnings: validation.warnings,
            };
            err.status = 422;
            throw err;
        }

        const transaction = await sequelize.transaction();
        try {
            // Soft-delete nodos y aristas anteriores
            await RuleEdgeImplementation.softDeleteEdgesByRuleIdSequelize(ruleId, replacedBy);
            await RuleNodeImplementation.softDeleteNodesByRuleIdSequelize(ruleId, replacedBy);

            // Crear nuevos nodos
            const nodesToCreate = nodesWithEntry.map(n => ({
                RuleId: ruleId,
                nodeId: n.nodeId,
                nodeType: n.nodeType,
                config: n.config,
                label: n.label,
                isEntry: n.isEntry,
                isDefault: n.isDefault,
                createdBy: CREATED_BY_PLACEHOLDER,
            }));
            await RuleNodeImplementation.bulkCreateNodesSequelize(nodesToCreate);

            // Crear nuevas aristas
            if (parsed.data.edges.length > 0) {
                const edgesToCreate = parsed.data.edges.map(e => ({
                    RuleId: ruleId,
                    sourceNodeId: e.sourceNodeId,
                    targetNodeId: e.targetNodeId,
                    edgeOrder: e.edgeOrder,
                    label: e.label,
                    createdBy: CREATED_BY_PLACEHOLDER,
                }));
                await RuleEdgeImplementation.bulkCreateEdgesSequelize(edgesToCreate);
            }

            await transaction.commit();

            return {
                ruleId,
                uuid: rule.get('uuid'),
                replaced: true,
                validation: {
                    isValid: true,
                    warnings: validation.warnings,
                },
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

export default new GraphRuleService();
