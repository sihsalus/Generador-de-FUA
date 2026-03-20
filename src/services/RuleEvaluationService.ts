import { z } from "zod";
import GraphRuleService from "./GraphRuleService";
import RuleService from "./RuleService";
import RuleSetService from "./RuleSetService";
import LookupTableService from "./LookupTableService";
import ParameterTemplateService from "./ParameterTemplateService";
import {
    evaluateRule,
    EvalGraph,
    EvalNode,
    EvalEdge,
    RuleEvalResult,
    RuleSetEvalResult,
    LookupResolver,
    SubRuleResolver,
} from "../utils/ruleEvaluator";

// ── Zod Schemas ──

const evaluateDataSchema = z.record(z.any()).refine(
    (data) => Object.keys(data).length > 0,
    { message: "El dato a evaluar no puede estar vacío" },
);

// ── Graph cache ──

const graphCache = new Map<string, { graph: EvalGraph; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function getCachedGraph(key: string): EvalGraph | null {
    const entry = graphCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        graphCache.delete(key);
        return null;
    }
    return entry.graph;
}

function setCachedGraph(key: string, graph: EvalGraph): void {
    graphCache.set(key, { graph, timestamp: Date.now() });
}

/** Invalida cache para una regla específica */
export function invalidateGraphCache(ruleUUID: string): void {
    graphCache.delete(ruleUUID);
}

class RuleEvaluationService {

    /**
     * Evalúa una regla individual contra un dato.
     */
    async evaluateRule(ruleIdOrUUID: string, data: Record<string, any>): Promise<RuleEvalResult> {
        const parsed = evaluateDataSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("Dato de entrada inválido");
            err.details = parsed.error.flatten();
            err.status = 400;
            throw err;
        }

        const fullRule = await GraphRuleService.getFullRule(ruleIdOrUUID);

        if (!fullRule.enabled) {
            return {
                ruleId: String(fullRule.id),
                ruleUUID: fullRule.uuid,
                ruleName: fullRule.name,
                ruleNumber: fullRule.ruleNumber,
                isValid: true,
                evaluatedPath: [],
                activatedParameters: [],
                nodeDetails: [],
                failures: [],
                errors: [],
                warnings: [],
                executionTimeMs: 0,
            };
        }

        // Intentar cache, sino construir
        let graph = getCachedGraph(fullRule.uuid);
        if (!graph) {
            graph = this.buildEvalGraph(fullRule);
            setCachedGraph(fullRule.uuid, graph);
        }

        // Resolver templates en PARAMETERs con templateRef
        await this.resolveParameterTemplates(graph);

        // Construir resolvers
        const hasParamLookups = graph.nodes.some(n => n.nodeType === 'PARAMETER' && n.config.lookupRef);
        const hasConditionLookups = graph.nodes.some(n => n.nodeType === 'CONDITION' && typeof n.config.value === 'string' && n.config.value.startsWith('lookup:'));

        const resolver: LookupResolver | undefined = (hasParamLookups || hasConditionLookups)
            ? this.buildLookupResolver()
            : undefined;

        // Construir sub-rule resolver si hay nodos SUB_RULE
        const hasSubRules = graph.nodes.some(n => n.nodeType === 'SUB_RULE');
        const subRuleResolver: SubRuleResolver | undefined = hasSubRules
            ? this.buildSubRuleResolver(parsed.data)
            : undefined;

        const result = await evaluateRule(graph, parsed.data, {
            ruleId: String(fullRule.id),
            ruleUUID: fullRule.uuid,
            ruleName: fullRule.name,
            ruleNumber: fullRule.ruleNumber,
        }, resolver, subRuleResolver);

        return result;
    }

    /**
     * Evalúa TODAS las reglas de un RuleSet contra un dato.
     * Usa evaluación paralela cuando el modo lo permite.
     */
    async evaluateRuleSet(ruleSetIdOrUUID: string, data: Record<string, any>): Promise<RuleSetEvalResult> {
        const startTime = performance.now();

        const parsed = evaluateDataSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("Dato de entrada inválido");
            err.details = parsed.error.flatten();
            err.status = 400;
            throw err;
        }

        const ruleSet = await RuleSetService.getByIdOrUUID(ruleSetIdOrUUID);
        const ruleSetPlain = ruleSet.get({ plain: true }) as any;
        const ruleSetId = ruleSetPlain.id;

        const rules = await RuleService.listByRuleSet(ruleSetId);
        const mode = ruleSetPlain.evaluationMode as string;
        const threshold = typeof ruleSetPlain.threshold === 'number' ? ruleSetPlain.threshold : 0.5;

        // Filtrar reglas habilitadas
        const enabledRules = rules.filter((r: any) => r.get('enabled') as boolean);
        const skippedRules = rules.length - enabledRules.length;

        // Para FIRST_VALID: evaluación secuencial (queremos parar pronto)
        if (mode === 'FIRST_VALID') {
            return this.evaluateSequential(enabledRules, parsed.data, ruleSetPlain, skippedRules, startTime);
        }

        // Para otros modos: evaluación paralela
        const ruleResults: RuleEvalResult[] = [];
        const evalPromises = enabledRules.map(async (rule: any) => {
            const ruleUUID = rule.get('uuid') as string;
            try {
                return await this.evaluateRule(ruleUUID, parsed.data);
            } catch (error: any) {
                return {
                    ruleId: String(rule.get('id')),
                    ruleUUID,
                    ruleName: rule.get('name') as string,
                    ruleNumber: rule.get('ruleNumber') as string,
                    isValid: false,
                    evaluatedPath: [],
                    activatedParameters: [],
                    nodeDetails: [],
                    failures: [],
                    errors: [{ nodeId: 'SYSTEM', message: `Error interno evaluando regla: ${error.message}` }],
                    warnings: [],
                    executionTimeMs: 0,
                } as RuleEvalResult;
            }
        });

        const settled = await Promise.allSettled(evalPromises);
        for (const result of settled) {
            if (result.status === 'fulfilled') {
                ruleResults.push(result.value);
            }
        }

        let passedRules = 0;
        let failedRules = 0;
        let sumWeightTotal = 0;
        let sumWeightPassed = 0;

        for (let i = 0; i < ruleResults.length; i++) {
            const r = ruleResults[i];
            const ruleWeight = parseFloat(enabledRules[i]?.get('weight') as string) || 1.0;

            if (mode === 'WEIGHTED') sumWeightTotal += ruleWeight;

            if (r.isValid) {
                passedRules++;
                if (mode === 'WEIGHTED') sumWeightPassed += ruleWeight;
            } else {
                failedRules++;
            }
        }

        const totalEvaluated = passedRules + failedRules;
        let isValid: boolean;
        switch (mode) {
            case 'ALL':
                isValid = failedRules === 0 && passedRules > 0;
                break;
            case 'ANY':
                isValid = passedRules > 0;
                break;
            case 'MAJORITY':
                isValid = totalEvaluated > 0 && passedRules > totalEvaluated / 2;
                break;
            case 'WEIGHTED':
                isValid = sumWeightTotal > 0 && (sumWeightPassed / sumWeightTotal) >= threshold;
                break;
            case 'REPORT':
                isValid = failedRules === 0;
                break;
            default:
                isValid = failedRules === 0 && passedRules > 0;
        }

        const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

        return {
            ruleSetId: String(ruleSetId),
            ruleSetName: ruleSetPlain.name,
            documentType: ruleSetPlain.documentType,
            isValid,
            totalRules: rules.length,
            passedRules,
            failedRules,
            skippedRules,
            ruleResults,
            executionTimeMs,
        };
    }

    /**
     * Evaluación secuencial para modo FIRST_VALID.
     */
    private async evaluateSequential(
        enabledRules: any[],
        data: Record<string, any>,
        ruleSetPlain: any,
        skippedRules: number,
        startTime: number,
    ): Promise<RuleSetEvalResult> {
        const ruleResults: RuleEvalResult[] = [];
        let passedRules = 0;
        let failedRules = 0;

        for (const rule of enabledRules) {
            const ruleUUID = rule.get('uuid') as string;
            try {
                const result = await this.evaluateRule(ruleUUID, data);
                ruleResults.push(result);
                if (result.isValid) {
                    passedRules++;
                    break; // FIRST_VALID: para en la primera que pasa
                } else {
                    failedRules++;
                }
            } catch (error: any) {
                failedRules++;
                ruleResults.push({
                    ruleId: String(rule.get('id')),
                    ruleUUID,
                    ruleName: rule.get('name') as string,
                    ruleNumber: rule.get('ruleNumber') as string,
                    isValid: false,
                    evaluatedPath: [],
                    activatedParameters: [],
                    nodeDetails: [],
                    failures: [],
                    errors: [{ nodeId: 'SYSTEM', message: `Error interno evaluando regla: ${error.message}` }],
                    warnings: [],
                    executionTimeMs: 0,
                });
            }
        }

        const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

        return {
            ruleSetId: String(ruleSetPlain.id),
            ruleSetName: ruleSetPlain.name,
            documentType: ruleSetPlain.documentType,
            isValid: passedRules > 0,
            totalRules: enabledRules.length + skippedRules,
            passedRules,
            failedRules,
            skippedRules,
            ruleResults,
            executionTimeMs,
        };
    }

    /**
     * Construye un LookupResolver que consulta la DB para resolver
     * constraints dinámicos. Soporta claves simples y compuestas.
     */
    private buildLookupResolver(): LookupResolver {
        return async (lookupRef) => {
            const tableIdOrName = lookupRef.tableId || lookupRef.tableName;
            if (!tableIdOrName) return null;

            const table = await LookupTableService.getByIdOrUUID(tableIdOrName);
            const tableId = table.get('id') as number;
            const keyFieldRaw = table.get('keyField') as string | string[];

            // Normalizar keyField: puede ser string simple o array (clave compuesta)
            const keyField = typeof keyFieldRaw === 'string' ? keyFieldRaw : keyFieldRaw;

            return {
                keyField,
                resolve: async (keyValue: string) => {
                    return await LookupTableService.resolveConstraints(tableId, keyValue);
                },
                getKeys: async () => {
                    return await LookupTableService.getAllKeys(tableId);
                },
            };
        };
    }

    /**
     * Construye un SubRuleResolver que evalúa sub-reglas referenciadas.
     * Pre-evalúa la sub-regla contra el mismo dato.
     */
    private buildSubRuleResolver(data: Record<string, any>): SubRuleResolver {
        // Cache de resultados para evitar evaluar la misma sub-regla dos veces
        const resultCache = new Map<string, RuleEvalResult>();

        return async (subRuleRef) => {
            const refKey = subRuleRef.ruleUUID || subRuleRef.ruleId || '';
            if (resultCache.has(refKey)) {
                return resultCache.get(refKey)!;
            }

            try {
                const result = await this.evaluateRule(refKey, data);
                resultCache.set(refKey, result);
                return result;
            } catch (error: any) {
                const errorResult: RuleEvalResult = {
                    ruleId: subRuleRef.ruleId || '',
                    ruleUUID: subRuleRef.ruleUUID,
                    isValid: false,
                    evaluatedPath: [],
                    activatedParameters: [],
                    nodeDetails: [],
                    failures: [],
                    errors: [{ nodeId: 'SUB_RULE', message: `Error evaluando sub-regla: ${error.message}` }],
                    warnings: [],
                    executionTimeMs: 0,
                };
                resultCache.set(refKey, errorResult);
                return errorResult;
            }
        };
    }

    /**
     * Resuelve templateRef en nodos PARAMETER del grafo,
     * mergeando la config del template con la config del nodo.
     */
    private async resolveParameterTemplates(graph: EvalGraph): Promise<void> {
        for (const node of graph.nodes) {
            if (node.nodeType !== 'PARAMETER' || !node.config.templateRef) continue;

            const templateId = node.config.templateRef.templateId || node.config.templateRef.templateName;
            if (!templateId) continue;

            try {
                const template = await ParameterTemplateService.resolveTemplate(String(templateId));

                // Merge: template provee defaults, node config puede sobreescribir
                if (!node.config.param_type) node.config.param_type = template.paramType;
                if (node.config.required === undefined) node.config.required = template.required;

                // Constraints: template como base, node sobreescribe
                node.config.constraints = {
                    ...template.constraints,
                    ...(node.config.constraints || {}),
                };
            } catch (err: any) {
                console.warn(`[EVAL-SVC] No se pudo resolver template "${templateId}": ${err.message}`);
            }
        }
    }

    /**
     * Convierte los datos de una regla cargada de DB al formato del evaluador puro.
     */
    private buildEvalGraph(fullRule: any): EvalGraph {
        const nodes: EvalNode[] = (fullRule.graph?.nodes || []).map((n: any) => ({
            nodeId: n.nodeId,
            nodeType: n.nodeType,
            config: n.config,
            label: n.label,
            isDefault: n.isDefault || false,
            isEntry: n.isEntry || false,
        }));

        const edges: EvalEdge[] = (fullRule.graph?.edges || []).map((e: any) => ({
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            edgeOrder: e.edgeOrder || 1,
            edgeType: e.edgeType || 'DEFAULT',
        }));

        return { nodes, edges };
    }
}

export default new RuleEvaluationService();
