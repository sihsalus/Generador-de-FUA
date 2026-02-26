import { z } from "zod";
import GraphRuleService from "./GraphRuleService";
import RuleService from "./RuleService";
import RuleSetService from "./RuleSetService";
import {
    evaluateRule,
    EvalGraph,
    EvalNode,
    EvalEdge,
    RuleEvalResult,
    RuleSetEvalResult,
} from "../utils/ruleEvaluator";

// ── Zod Schemas ──

const evaluateDataSchema = z.record(z.any()).refine(
    (data) => Object.keys(data).length > 0,
    { message: "El dato a evaluar no puede estar vacío" },
);

class RuleEvaluationService {

    /**
     * Evalúa una regla individual contra un dato.
     *
     * 1. Carga la regla completa (con grafo)
     * 2. Construye el EvalGraph
     * 3. Ejecuta el evaluador puro
     * 4. Retorna resultado detallado
     */
    async evaluateRule(ruleIdOrUUID: string, data: Record<string, any>): Promise<RuleEvalResult> {
        // Validar dato
        const parsed = evaluateDataSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("Dato de entrada inválido");
            err.details = parsed.error.flatten();
            err.status = 400;
            throw err;
        }

        // Cargar regla completa
        const fullRule = await GraphRuleService.getFullRule(ruleIdOrUUID);

        // Verificar que la regla está habilitada
        if (!fullRule.enabled) {
            return {
                ruleId: String(fullRule.id),
                ruleUUID: fullRule.uuid,
                ruleName: fullRule.name,
                ruleNumber: fullRule.ruleNumber,
                isValid: true, // Regla deshabilitada no bloquea
                evaluatedPath: [],
                activatedParameters: [],
                nodeDetails: [],
                errors: [],
                executionTimeMs: 0,
            };
        }

        // Construir EvalGraph
        const graph = this.buildEvalGraph(fullRule);

        // Evaluar
        const result = evaluateRule(graph, parsed.data, {
            ruleId: String(fullRule.id),
            ruleUUID: fullRule.uuid,
            ruleName: fullRule.name,
            ruleNumber: fullRule.ruleNumber,
        });

        return result;
    }

    /**
     * Evalúa TODAS las reglas de un RuleSet contra un dato.
     * Lógica AND: si una regla falla, el documento es FALSE.
     *
     * 1. Carga el RuleSet
     * 2. Carga todas sus reglas (ordenadas por prioridad)
     * 3. Evalúa cada regla
     * 4. Combina resultados (AND)
     */
    async evaluateRuleSet(ruleSetIdOrUUID: string, data: Record<string, any>): Promise<RuleSetEvalResult> {
        const startTime = performance.now();

        // Validar dato
        const parsed = evaluateDataSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("Dato de entrada inválido");
            err.details = parsed.error.flatten();
            err.status = 400;
            throw err;
        }

        // Cargar RuleSet
        const ruleSet = await RuleSetService.getByIdOrUUID(ruleSetIdOrUUID);
        const ruleSetPlain = ruleSet.get({ plain: true }) as any;
        const ruleSetId = ruleSetPlain.id;

        // Cargar reglas ordenadas por prioridad
        const rules = await RuleService.listByRuleSet(ruleSetId);

        const ruleResults: RuleEvalResult[] = [];
        let passedRules = 0;
        let failedRules = 0;
        let skippedRules = 0;
        let allValid = true;

        for (const rule of rules) {
            const ruleUUID = rule.get('uuid') as string;
            const enabled = rule.get('enabled') as boolean;

            if (!enabled) {
                skippedRules++;
                continue;
            }

            try {
                const result = await this.evaluateRule(ruleUUID, parsed.data);
                ruleResults.push(result);

                if (result.isValid) {
                    passedRules++;
                } else {
                    failedRules++;
                    allValid = false;

                    // Si evaluationMode es FIRST_MATCH, detenerse en la primera que falle
                    if (ruleSetPlain.evaluationMode === 'FIRST_MATCH') {
                        break;
                    }
                }
            } catch (error: any) {
                // Si una regla falla en evaluación, reportar como error
                failedRules++;
                allValid = false;
                ruleResults.push({
                    ruleId: String(rule.get('id')),
                    ruleUUID: ruleUUID,
                    ruleName: rule.get('name') as string,
                    ruleNumber: rule.get('ruleNumber') as string,
                    isValid: false,
                    evaluatedPath: [],
                    activatedParameters: [],
                    nodeDetails: [],
                    errors: [{
                        nodeId: 'SYSTEM',
                        message: `Error interno evaluando regla: ${error.message}`,
                    }],
                    executionTimeMs: 0,
                });

                if (ruleSetPlain.evaluationMode === 'FIRST_MATCH') {
                    break;
                }
            }
        }

        const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

        return {
            ruleSetId: String(ruleSetId),
            ruleSetName: ruleSetPlain.name,
            documentType: ruleSetPlain.documentType,
            isValid: allValid,
            totalRules: rules.length,
            passedRules,
            failedRules,
            skippedRules,
            ruleResults,
            executionTimeMs,
        };
    }

    /**
     * Convierte los datos de una regla cargada de DB
     * al formato que espera el evaluador puro.
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
        }));

        return { nodes, edges };
    }
}

export default new RuleEvaluationService();
