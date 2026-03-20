/**
 * ruleEvaluator.ts
 *
 * Motor de evaluación de reglas de negocio basado en grafos DAG.
 * Utilidad PURA — sin dependencias de DB ni framework.
 *
 * Responsabilidades:
 *  - Recibir un dato (JSON, potencialmente anidado) y un grafo de regla
 *  - Evaluar cada nodo siguiendo el flujo del DAG
 *  - Soportar nodos VALIDATION (validación intermedia con STOP/WARN)
 *  - Soportar nodos SUB_RULE (composición de reglas)
 *  - Soportar aristas TRUE/FALSE (decision trees)
 *  - Retornar resultado detallado (TRUE/FALSE + path + valores que causaron fallo)
 */

// ────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────

export type EvalEdgeType = 'DEFAULT' | 'TRUE' | 'FALSE';

export interface EvalNode {
    nodeId: string;
    nodeType: 'CONDITION' | 'GATE' | 'PARAMETER' | 'VALIDATION' | 'SUB_RULE';
    config: Record<string, any>;
    label?: string;
    isDefault: boolean;
    isEntry: boolean;
}

export interface EvalEdge {
    sourceNodeId: string;
    targetNodeId: string;
    edgeOrder: number;
    edgeType?: EvalEdgeType;
}

export interface EvalGraph {
    nodes: EvalNode[];
    edges: EvalEdge[];
}

/**
 * Resolver de LookupTable.
 */
export type LookupResolver = (
    lookupRef: { tableId?: string; tableName?: string },
) => Promise<{
    keyField: string | string[];
    resolve: (keyValue: string) => Promise<Record<string, Record<string, any>> | null>;
    getKeys?: () => Promise<string[]>;
} | null>;

/**
 * Resolver de sub-reglas. Evalúa una regla referenciada y retorna su resultado.
 */
export type SubRuleResolver = (
    subRuleRef: { ruleId?: string; ruleUUID?: string },
) => Promise<RuleEvalResult>;

export interface NodeEvalDetail {
    nodeId: string;
    nodeType: string;
    label?: string;
    result: boolean;
    /** Solo para CONDITION/VALIDATION: el valor real encontrado en el dato */
    actualValue?: any;
    /** Solo para CONDITION/VALIDATION: el valor esperado */
    expectedValue?: any;
    /** Solo para CONDITION/VALIDATION: el operador usado */
    operator?: string;
    /** Solo para CONDITION/VALIDATION: el campo evaluado */
    field?: string;
    /** Solo para PARAMETER: resultado de la validación del campo */
    paramValidation?: {
        targetField: string;
        actualValue: any;
        isValid: boolean;
        errors: string[];
    };
    /** Solo para GATE: lógica usada */
    logic?: string;
    /** Solo para GATE: nodos hijos que alimentaron este nodo */
    inputs?: string[];
    /** Solo para VALIDATION: acción ante fallo */
    failureAction?: string;
    /** Solo para SUB_RULE: resultado de la sub-regla evaluada */
    subRuleResult?: RuleEvalResult;
}

export interface EvalDiagnosticEntry {
    nodeId: string;
    field?: string;
    message: string;
    actualValue?: any;
    expectedValue?: any;
}

export interface RuleEvalResult {
    ruleId: string;
    ruleUUID?: string;
    ruleName?: string;
    ruleNumber?: string;
    isValid: boolean;
    /** true si la evaluación fue detenida por un nodo VALIDATION con failureAction=STOP */
    halted?: boolean;
    haltedByNodeId?: string;
    evaluatedPath: string[];
    activatedParameters: string[];
    nodeDetails: NodeEvalDetail[];
    failures: EvalDiagnosticEntry[];
    errors: EvalDiagnosticEntry[];
    warnings: EvalDiagnosticEntry[];
    executionTimeMs: number;
}

export interface RuleSetEvalResult {
    ruleSetId: string;
    ruleSetName?: string;
    documentType?: string;
    isValid: boolean;
    totalRules: number;
    passedRules: number;
    failedRules: number;
    skippedRules: number;
    ruleResults: RuleEvalResult[];
    executionTimeMs: number;
}

// ────────────────────────────────────────────
// Acceso a campos anidados (dot notation)
// ────────────────────────────────────────────

function getNestedValue(obj: Record<string, any>, path: string): any {
    if (!path || !obj) return undefined;

    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
        if (current === null || current === undefined) return undefined;

        const arrayIndex = parseInt(part);
        if (Array.isArray(current) && !isNaN(arrayIndex)) {
            current = current[arrayIndex];
        } else {
            current = current[part];
        }
    }

    return current;
}

// ────────────────────────────────────────────
// Evaluación principal de una regla
// ────────────────────────────────────────────

export async function evaluateRule(
    graph: EvalGraph,
    data: Record<string, any>,
    ruleMeta?: { ruleId?: string; ruleUUID?: string; ruleName?: string; ruleNumber?: string },
    lookupResolver?: LookupResolver,
    subRuleResolver?: SubRuleResolver,
): Promise<RuleEvalResult> {
    const startTime = performance.now();
    const ruleTag = `[EVAL #${ruleMeta?.ruleNumber || '?'} "${ruleMeta?.ruleName || ''}"]`;

    const nodeMap = new Map<string, EvalNode>();
    graph.nodes.forEach(n => nodeMap.set(n.nodeId, n));

    // Construir adjacency (source → targets) y reverse (target → sources) con edgeType
    const adjacency = new Map<string, Array<{ targetNodeId: string; edgeOrder: number; edgeType: EvalEdgeType }>>();
    const reverseAdj = new Map<string, Array<{ sourceNodeId: string; edgeOrder: number; edgeType: EvalEdgeType }>>();

    graph.nodes.forEach(n => {
        adjacency.set(n.nodeId, []);
        reverseAdj.set(n.nodeId, []);
    });

    graph.edges.forEach(e => {
        const edgeType = (e.edgeType || 'DEFAULT') as EvalEdgeType;
        adjacency.get(e.sourceNodeId)?.push({ targetNodeId: e.targetNodeId, edgeOrder: e.edgeOrder, edgeType });
        reverseAdj.get(e.targetNodeId)?.push({ sourceNodeId: e.sourceNodeId, edgeOrder: e.edgeOrder, edgeType });
    });

    // ── Pre-resolver CONDITIONs que referencian lookup tables ──
    if (lookupResolver) {
        for (const node of graph.nodes) {
            if (node.nodeType === 'CONDITION' && node.config.operator === 'IN'
                && typeof node.config.value === 'string' && node.config.value.startsWith('lookup:')) {
                const tableName = node.config.value.replace('lookup:', '');
                try {
                    const tableResolver = await lookupResolver({ tableName });
                    if (tableResolver?.getKeys) {
                        const keys = await tableResolver.getKeys();
                        node.config.value = keys;
                    }
                } catch (err: any) {
                    console.error(`${ruleTag} [LOOKUP-PRE] Error resolviendo lookup keys para "${tableName}":`, err?.message);
                }
            }
        }
    }

    // ── Pre-resolver SUB_RULE nodos ──
    const subRuleResults = new Map<string, RuleEvalResult>();
    if (subRuleResolver) {
        for (const node of graph.nodes) {
            if (node.nodeType === 'SUB_RULE' && node.config.subRuleRef) {
                try {
                    const result = await subRuleResolver(node.config.subRuleRef);
                    subRuleResults.set(node.nodeId, result);
                } catch (err: any) {
                    console.error(`${ruleTag} [SUB_RULE] Error evaluando sub-regla para ${node.nodeId}:`, err?.message);
                }
            }
        }
    }

    // Cache de resultados por nodo
    const evalCache = new Map<string, boolean>();
    const nodeDetails: NodeEvalDetail[] = [];
    const evaluatedPath: string[] = [];
    const failures: EvalDiagnosticEntry[] = [];
    const errors: EvalDiagnosticEntry[] = [];
    const warnings: EvalDiagnosticEntry[] = [];

    // Halt state
    let halted = false;
    let haltedByNodeId: string | undefined;

    // ── Evaluar un nodo recursivamente ──
    function evalNode(nodeId: string): boolean {
        if (halted) return false;
        if (evalCache.has(nodeId)) return evalCache.get(nodeId)!;

        const node = nodeMap.get(nodeId);
        if (!node) return false;

        evaluatedPath.push(nodeId);
        let result = false;
        const detail: NodeEvalDetail = {
            nodeId: node.nodeId,
            nodeType: node.nodeType,
            label: node.label,
            result: false,
        };

        switch (node.nodeType) {
            case 'CONDITION': {
                result = evaluateCondition(node, data, detail, failures, errors);
                break;
            }

            case 'GATE': {
                const inputs = (reverseAdj.get(nodeId) || [])
                    .sort((a, b) => a.edgeOrder - b.edgeOrder);

                detail.logic = node.config.logic;
                detail.inputs = inputs.map(e => e.sourceNodeId);
                const shortCircuit = node.config.short_circuit !== false;

                switch (node.config.logic) {
                    case 'AND': {
                        result = true;
                        for (const input of inputs) {
                            const rawResult = evalNode(input.sourceNodeId);
                            if (halted) { result = false; break; }
                            const effectiveResult = resolveEdgeResult(rawResult, input.edgeType);
                            if (!effectiveResult) {
                                result = false;
                                if (shortCircuit) break;
                            }
                        }
                        break;
                    }
                    case 'OR': {
                        result = false;
                        for (const input of inputs) {
                            const rawResult = evalNode(input.sourceNodeId);
                            if (halted) break;
                            const effectiveResult = resolveEdgeResult(rawResult, input.edgeType);
                            if (effectiveResult) {
                                result = true;
                                if (shortCircuit) break;
                            }
                        }
                        break;
                    }
                    case 'NOT': {
                        if (inputs.length > 0) {
                            const rawResult = evalNode(inputs[0].sourceNodeId);
                            if (!halted) {
                                const effectiveResult = resolveEdgeResult(rawResult, inputs[0].edgeType);
                                result = !effectiveResult;
                            }
                        }
                        break;
                    }
                    case 'XOR': {
                        let trueCount = 0;
                        for (const input of inputs) {
                            const rawResult = evalNode(input.sourceNodeId);
                            if (halted) break;
                            const effectiveResult = resolveEdgeResult(rawResult, input.edgeType);
                            if (effectiveResult) trueCount++;
                        }
                        result = trueCount === 1;
                        break;
                    }
                }
                break;
            }

            case 'PARAMETER': {
                // PARAMETERs se "activan" si sus inputs son true. Validación se hace después.
                result = true;
                break;
            }

            case 'VALIDATION': {
                // Primero evaluar inputs (como un GATE implícito AND)
                const vInputs = (reverseAdj.get(nodeId) || [])
                    .sort((a, b) => a.edgeOrder - b.edgeOrder);

                let inputsPass = true;
                for (const input of vInputs) {
                    const rawResult = evalNode(input.sourceNodeId);
                    if (halted) { inputsPass = false; break; }
                    const effectiveResult = resolveEdgeResult(rawResult, input.edgeType);
                    if (!effectiveResult) { inputsPass = false; break; }
                }

                if (!inputsPass) {
                    // Inputs no se cumplen → la validación no aplica, pasa como false
                    result = false;
                } else {
                    // Inputs OK → ejecutar la validación propia
                    const validationResult = evaluateCondition(node, data, detail, failures, errors);
                    detail.failureAction = node.config.failureAction;

                    if (!validationResult) {
                        if (node.config.failureAction === 'STOP') {
                            halted = true;
                            haltedByNodeId = nodeId;
                            errors.push({
                                nodeId,
                                field: node.config.field,
                                message: `VALIDATION STOP: ${node.config.field} ${node.config.operator} ${JSON.stringify(node.config.value)} falló — evaluación detenida`,
                                actualValue: detail.actualValue,
                                expectedValue: detail.expectedValue,
                            });
                            result = false;
                        } else {
                            // WARN: registrar warning pero continuar como true
                            warnings.push({
                                nodeId,
                                field: node.config.field,
                                message: `VALIDATION WARN: ${node.config.field} ${node.config.operator} ${JSON.stringify(node.config.value)} falló`,
                                actualValue: detail.actualValue,
                                expectedValue: detail.expectedValue,
                            });
                            result = true;
                        }
                    } else {
                        result = true;
                    }
                }
                break;
            }

            case 'SUB_RULE': {
                // Evaluar inputs primero
                const sInputs = (reverseAdj.get(nodeId) || [])
                    .sort((a, b) => a.edgeOrder - b.edgeOrder);

                let sInputsPass = true;
                for (const input of sInputs) {
                    const rawResult = evalNode(input.sourceNodeId);
                    if (halted) { sInputsPass = false; break; }
                    const effectiveResult = resolveEdgeResult(rawResult, input.edgeType);
                    if (!effectiveResult) { sInputsPass = false; break; }
                }

                if (!sInputsPass) {
                    result = false;
                } else {
                    // Usar resultado pre-resuelto
                    const subResult = subRuleResults.get(nodeId);
                    if (subResult) {
                        detail.subRuleResult = subResult;
                        result = subResult.isValid;
                    } else {
                        result = false;
                        errors.push({
                            nodeId,
                            message: `SUB_RULE '${nodeId}': no se pudo resolver la sub-regla referenciada`,
                        });
                    }
                }
                break;
            }
        }

        detail.result = result;
        evalCache.set(nodeId, result);
        nodeDetails.push(detail);

        return result;
    }

    // ── Fase 1: Evaluar desde nodos de entrada hacia los PARAMETERs ──
    const parameterNodes = graph.nodes.filter(n => n.nodeType === 'PARAMETER' && !n.isDefault);
    const defaultParameters = graph.nodes.filter(n => n.nodeType === 'PARAMETER' && n.isDefault);

    const activatedParameters: string[] = [];
    const activatedParamFields = new Set<string>();

    for (const param of parameterNodes) {
        if (halted) break;

        const inputs = reverseAdj.get(param.nodeId) || [];
        if (inputs.length === 0) continue;

        let paramActivated = true;
        for (const input of inputs) {
            const rawResult = evalNode(input.sourceNodeId);
            if (halted) { paramActivated = false; break; }
            const effectiveResult = resolveEdgeResult(rawResult, input.edgeType);
            if (!effectiveResult) {
                paramActivated = false;
                break;
            }
        }

        if (paramActivated) {
            activatedParameters.push(param.nodeId);
            activatedParamFields.add(param.config.target_field);
        }
    }

    // ── Fase 2: Activar defaults para campos no cubiertos ──
    if (!halted) {
        for (const defParam of defaultParameters) {
            if (!activatedParamFields.has(defParam.config.target_field)) {
                activatedParameters.push(defParam.nodeId);
            }
        }
    }

    // ── Fase 3: Resolver lookups y validar PARAMETERs activados ──
    const resolvedParams: Array<{ param: EvalNode; resolvedConstraints?: Record<string, any> }> = [];

    const resolverCache = new Map<string, { keyField: string | string[]; resolve: (kv: string) => Promise<Record<string, Record<string, any>> | null> }>();

    for (const paramId of activatedParameters) {
        const param = nodeMap.get(paramId)!;
        let resolvedConstraints: Record<string, any> | undefined;

        if (lookupResolver && param.config.lookupRef) {
            const refKey = param.config.lookupRef.tableId || param.config.lookupRef.tableName || '';
            try {
                if (!resolverCache.has(refKey)) {
                    const tableResolver = await lookupResolver(param.config.lookupRef);
                    if (tableResolver) {
                        resolverCache.set(refKey, tableResolver);
                    }
                }

                const cached = resolverCache.get(refKey);
                if (cached) {
                    // Soportar keyField simple o compuesto
                    let keyValue: string;
                    if (Array.isArray(cached.keyField)) {
                        // Clave compuesta: construir objeto y serializar
                        const compositeKey: Record<string, string> = {};
                        for (const field of cached.keyField) {
                            compositeKey[field] = String(getNestedValue(data, field) ?? '');
                        }
                        keyValue = JSON.stringify(compositeKey);
                    } else {
                        keyValue = String(getNestedValue(data, cached.keyField) ?? '');
                    }

                    if (keyValue) {
                        const lookupResult = await cached.resolve(keyValue);
                        if (lookupResult && lookupResult[param.config.target_field]) {
                            resolvedConstraints = lookupResult[param.config.target_field];
                        }
                    }
                }
            } catch (lookupErr: any) {
                console.error(`${ruleTag} [LOOKUP-PARAM] Error:`, lookupErr?.message);
            }
        }

        resolvedParams.push({ param, resolvedConstraints });
    }

    let allParametersValid = true;

    if (!halted) {
        for (const { param, resolvedConstraints } of resolvedParams) {
            const effectiveConfig = resolvedConstraints
                ? { ...param.config, constraints: { ...param.config.constraints, ...resolvedConstraints } }
                : param.config;

            const effectiveNode = { ...param, config: effectiveConfig };
            const validation = validateParameter(effectiveNode, data);

            const paramDetail: NodeEvalDetail = {
                nodeId: param.nodeId,
                nodeType: 'PARAMETER',
                label: param.label,
                result: validation.isValid,
                paramValidation: validation,
            };

            const existingIdx = nodeDetails.findIndex(d => d.nodeId === param.nodeId);
            if (existingIdx >= 0) {
                nodeDetails[existingIdx] = paramDetail;
            } else {
                evaluatedPath.push(param.nodeId);
                nodeDetails.push(paramDetail);
            }

            if (!validation.isValid) {
                allParametersValid = false;
                validation.errors.forEach(errMsg => {
                    errors.push({
                        nodeId: param.nodeId,
                        field: validation.targetField,
                        message: errMsg,
                        actualValue: validation.actualValue,
                    });
                });
            }
        }
    }

    if (activatedParameters.length === 0 && !halted) {
        warnings.push({
            nodeId: 'RULE',
            message: `La regla no activó ningún parámetro (las condiciones no aplican para este dato)`,
        });
    }

    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    const finalIsValid = halted
        ? false
        : (activatedParameters.length === 0 ? true : allParametersValid);

    return {
        ruleId: ruleMeta?.ruleId || '',
        ruleUUID: ruleMeta?.ruleUUID,
        ruleName: ruleMeta?.ruleName,
        ruleNumber: ruleMeta?.ruleNumber,
        isValid: finalIsValid,
        halted: halted || undefined,
        haltedByNodeId,
        evaluatedPath,
        activatedParameters,
        nodeDetails,
        failures,
        errors,
        warnings,
        executionTimeMs,
    };
}

// ────────────────────────────────────────────
// Resolución de resultado según edgeType
// ────────────────────────────────────────────

/**
 * Resuelve el resultado efectivo de una arista según su tipo.
 * - DEFAULT: resultado tal cual
 * - TRUE: resultado tal cual (la arista solo "se activa" si es true)
 * - FALSE: invierte el resultado (la arista "se activa" si es false)
 */
function resolveEdgeResult(rawResult: boolean, edgeType: EvalEdgeType): boolean {
    if (edgeType === 'FALSE') return !rawResult;
    return rawResult; // DEFAULT y TRUE: resultado directo
}

// ────────────────────────────────────────────
// Evaluación de CONDITION (y VALIDATION, misma lógica)
// ────────────────────────────────────────────

function evaluateCondition(
    node: EvalNode,
    data: Record<string, any>,
    detail: NodeEvalDetail,
    failures: EvalDiagnosticEntry[],
    errors: EvalDiagnosticEntry[],
): boolean {
    const cfg = node.config;
    const isComputed = 'expression' in cfg && cfg.expression;

    if (isComputed) {
        return evaluateComputedCondition(node, data, detail, failures, errors);
    }

    const field = cfg.field;
    const operator = cfg.operator;
    const actualValue = getNestedValue(data, field);
    let expectedValue = cfg.value;

    if (cfg.value_type === 'FIELD_REF' && typeof expectedValue === 'string') {
        expectedValue = getNestedValue(data, expectedValue);
    }

    detail.field = field;
    detail.operator = operator;
    detail.actualValue = actualValue;
    detail.expectedValue = expectedValue;

    let result = false;

    try {
        result = applyOperator(operator, actualValue, expectedValue, cfg.data_type);
    } catch (e: any) {
        errors.push({
            nodeId: node.nodeId,
            field,
            message: `Error evaluando condición: ${e.message}`,
            actualValue,
            expectedValue,
        });
        return false;
    }

    if (!result) {
        failures.push({
            nodeId: node.nodeId,
            field,
            message: `Condición fallida: ${field} ${operator} ${JSON.stringify(expectedValue)} (valor real: ${JSON.stringify(actualValue)})`,
            actualValue,
            expectedValue,
        });
    }

    return result;
}

function evaluateComputedCondition(
    node: EvalNode,
    data: Record<string, any>,
    detail: NodeEvalDetail,
    failures: EvalDiagnosticEntry[],
    errors: EvalDiagnosticEntry[],
): boolean {
    const cfg = node.config;

    try {
        const computedValue = evaluateExpression(cfg.expression, data);
        let expectedValue = cfg.value;

        if (cfg.value_type === 'FIELD_REF' && typeof expectedValue === 'string') {
            expectedValue = getNestedValue(data, expectedValue);
        }

        detail.field = cfg.expression;
        detail.operator = cfg.operator;
        detail.actualValue = computedValue;
        detail.expectedValue = expectedValue;

        const tolerance = cfg.tolerance || 0;
        let result = false;

        if (tolerance > 0 && typeof computedValue === 'number' && typeof expectedValue === 'number') {
            if (cfg.operator === 'EQUALS') {
                result = Math.abs(computedValue - expectedValue) <= tolerance;
            } else {
                result = applyOperator(cfg.operator, computedValue, expectedValue, 'NUMBER');
            }
        } else {
            result = applyOperator(cfg.operator, computedValue, expectedValue, 'NUMBER');
        }

        if (!result) {
            failures.push({
                nodeId: node.nodeId,
                field: cfg.expression,
                message: `Expresión fallida: ${cfg.expression} = ${computedValue}, esperado ${cfg.operator} ${JSON.stringify(expectedValue)}`,
                actualValue: computedValue,
                expectedValue,
            });
        }

        return result;
    } catch (e: any) {
        errors.push({
            nodeId: node.nodeId,
            field: cfg.expression,
            message: `Error evaluando expresión: ${e.message}`,
        });
        return false;
    }
}

// ────────────────────────────────────────────
// Operadores de comparación
// ────────────────────────────────────────────

function applyOperator(operator: string, actual: any, expected: any, dataType?: string): boolean {
    switch (operator) {
        case 'EQUALS':
            return looseEquals(actual, expected, dataType);
        case 'NOT_EQUALS':
            return !looseEquals(actual, expected, dataType);
        case 'GREATER_THAN':
            return toComparable(actual, dataType) > toComparable(expected, dataType);
        case 'GREATER_EQUAL':
            return toComparable(actual, dataType) >= toComparable(expected, dataType);
        case 'LESS_THAN':
            return toComparable(actual, dataType) < toComparable(expected, dataType);
        case 'LESS_EQUAL':
            return toComparable(actual, dataType) <= toComparable(expected, dataType);
        case 'IN': {
            const list = Array.isArray(expected) ? expected : String(expected).split(',').map(s => s.trim());
            return list.some((v: any) => looseEquals(actual, v, dataType));
        }
        case 'NOT_IN': {
            const list = Array.isArray(expected) ? expected : String(expected).split(',').map(s => s.trim());
            return !list.some((v: any) => looseEquals(actual, v, dataType));
        }
        case 'BETWEEN': {
            const range = Array.isArray(expected) ? expected : [expected];
            if (range.length < 2) return false;
            const val = toComparable(actual, dataType);
            return val >= toComparable(range[0], dataType) && val <= toComparable(range[1], dataType);
        }
        case 'CONTAINS':
            return String(actual || '').includes(String(expected));
        case 'STARTS_WITH':
            return String(actual || '').startsWith(String(expected));
        case 'ENDS_WITH':
            return String(actual || '').endsWith(String(expected));
        case 'REGEX':
            try {
                return new RegExp(String(expected)).test(String(actual || ''));
            } catch {
                return false;
            }
        case 'IS_NULL':
            return actual === null || actual === undefined;
        case 'IS_NOT_NULL':
            return actual !== null && actual !== undefined;
        case 'IS_EMPTY':
            return actual === '' || actual === null || actual === undefined || (Array.isArray(actual) && actual.length === 0);
        case 'IS_NOT_EMPTY':
            return actual !== '' && actual !== null && actual !== undefined && !(Array.isArray(actual) && actual.length === 0);
        default:
            return false;
    }
}

function looseEquals(a: any, b: any, dataType?: string): boolean {
    if (a === b) return true;
    if (a === null || a === undefined || b === null || b === undefined) return a === b;

    if (dataType === 'NUMBER') return Number(a) === Number(b);
    if (dataType === 'BOOLEAN') return toBool(a) === toBool(b);
    if (dataType === 'DATE') return new Date(a).getTime() === new Date(b).getTime();

    return String(a).toLowerCase() === String(b).toLowerCase();
}

function toComparable(val: any, dataType?: string): number {
    if (dataType === 'DATE') return new Date(val).getTime();
    return Number(val) || 0;
}

function toBool(val: any): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
        const lower = val.toLowerCase();
        return lower === 'true' || lower === 'si' || lower === 'sí' || lower === '1' || lower === 'yes';
    }
    return !!val;
}

// ────────────────────────────────────────────
// Evaluador de expresiones matemáticas
// ────────────────────────────────────────────

function evaluateExpression(expression: string, data: Record<string, any>): number {
    let expr = expression;

    expr = expr.replace(/ABS\(([^)]+)\)/gi, (_, inner) => {
        return String(Math.abs(evaluateExpression(inner, data)));
    });
    expr = expr.replace(/ROUND\(([^,]+),\s*(\d+)\)/gi, (_, inner, decimals) => {
        return String(Number(evaluateExpression(inner, data).toFixed(Number(decimals))));
    });
    expr = expr.replace(/MIN\(([^,]+),\s*([^)]+)\)/gi, (_, a, b) => {
        return String(Math.min(evaluateExpression(a, data), evaluateExpression(b, data)));
    });
    expr = expr.replace(/MAX\(([^,]+),\s*([^)]+)\)/gi, (_, a, b) => {
        return String(Math.max(evaluateExpression(a, data), evaluateExpression(b, data)));
    });
    expr = expr.replace(/LENGTH\(([^)]+)\)/gi, (_, fieldName) => {
        const val = getNestedValue(data, fieldName.trim());
        return String(val ? String(val).length : 0);
    });
    expr = expr.replace(/DATEDIFF\(([^,]+),\s*([^)]+)\)/gi, (_, a, b) => {
        const dateA = new Date(resolveExprToken(a.trim(), data));
        const dateB = new Date(resolveExprToken(b.trim(), data));
        const diffMs = dateA.getTime() - dateB.getTime();
        return String(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    });

    expr = expr.replace(/[a-zA-Z_][a-zA-Z0-9_.]*/g, (token) => {
        const val = getNestedValue(data, token);
        if (val === undefined || val === null) return '0';
        return String(Number(val) || 0);
    });

    return safeEval(expr);
}

function resolveExprToken(token: string, data: Record<string, any>): any {
    const num = Number(token);
    if (!isNaN(num) && token.trim() !== '') return num;
    return getNestedValue(data, token.trim()) ?? token;
}

function safeEval(expr: string): number {
    expr = expr.replace(/\s+/g, '');
    let pos = 0;

    function parseExpression(): number {
        let result = parseTerm();
        while (pos < expr.length) {
            if (expr[pos] === '+') { pos++; result += parseTerm(); }
            else if (expr[pos] === '-') { pos++; result -= parseTerm(); }
            else break;
        }
        return result;
    }

    function parseTerm(): number {
        let result = parseFactor();
        while (pos < expr.length) {
            if (expr[pos] === '*') { pos++; result *= parseFactor(); }
            else if (expr[pos] === '/') {
                pos++;
                const divisor = parseFactor();
                result = divisor !== 0 ? result / divisor : 0;
            }
            else if (expr[pos] === '%') {
                pos++;
                const mod = parseFactor();
                result = mod !== 0 ? result % mod : 0;
            }
            else break;
        }
        return result;
    }

    function parseFactor(): number {
        if (expr[pos] === '(') {
            pos++;
            const result = parseExpression();
            pos++;
            return result;
        }

        let numStr = '';
        if (expr[pos] === '-') { numStr += '-'; pos++; }
        while (pos < expr.length && (expr[pos] >= '0' && expr[pos] <= '9' || expr[pos] === '.')) {
            numStr += expr[pos];
            pos++;
        }
        return Number(numStr) || 0;
    }

    return parseExpression();
}

// ────────────────────────────────────────────
// Validación de PARAMETERs
// ────────────────────────────────────────────

interface ParamValidationResult {
    targetField: string;
    actualValue: any;
    isValid: boolean;
    errors: string[];
}

function validateParameter(node: EvalNode, data: Record<string, any>): ParamValidationResult {
    const cfg = node.config;
    const targetField = cfg.target_field;
    const actualValue = getNestedValue(data, targetField);
    const paramType = cfg.param_type;
    const constraints = cfg.constraints || {};
    const required = cfg.required !== false;
    const errs: string[] = [];

    if (required && (actualValue === null || actualValue === undefined || actualValue === '')) {
        errs.push(`Campo '${targetField}' es requerido pero está vacío o ausente`);
        return { targetField, actualValue, isValid: false, errors: errs };
    }

    if (!required && (actualValue === null || actualValue === undefined || actualValue === '')) {
        // Aún si es optional, si tiene allowNull:false explícito, validar
        if (constraints.allowNull === false && (actualValue === null || actualValue === undefined)) {
            errs.push(`Campo '${targetField}': no permite nulos`);
            return { targetField, actualValue, isValid: false, errors: errs };
        }
        return { targetField, actualValue, isValid: true, errors: [] };
    }

    switch (paramType) {
        case 'STRING':
            validateString(actualValue, constraints, targetField, errs);
            break;
        case 'NUMBER':
            validateNumber(actualValue, constraints, targetField, errs);
            break;
        case 'ENUM':
            validateEnum(actualValue, constraints, targetField, errs);
            break;
        case 'DATE':
            validateDate(actualValue, constraints, targetField, errs);
            break;
        case 'BOOLEAN':
            validateBoolean(actualValue, constraints, targetField, errs);
            break;
        case 'RANGE':
            validateRange(actualValue, constraints, targetField, errs);
            break;
        case 'ARRAY':
            validateArray(actualValue, constraints, targetField, errs);
            break;
    }

    return { targetField, actualValue, isValid: errs.length === 0, errors: errs };
}

function validateString(value: any, c: Record<string, any>, field: string, errors: string[]): void {
    let str = String(value);
    if (c.trim) str = str.trim();

    if (c.minLength !== undefined && str.length < c.minLength)
        errors.push(`'${field}': longitud mínima ${c.minLength}, tiene ${str.length}`);
    if (c.maxLength !== undefined && str.length > c.maxLength)
        errors.push(`'${field}': longitud máxima ${c.maxLength}, tiene ${str.length}`);
    if (c.pattern) {
        try {
            if (!new RegExp(c.pattern).test(str))
                errors.push(`'${field}': no coincide con patrón '${c.pattern}'`);
        } catch {
            errors.push(`'${field}': patrón regex inválido '${c.pattern}'`);
        }
    }
    if (c.allowEmpty === false && str === '')
        errors.push(`'${field}': no permite cadena vacía`);
    if (c.case === 'UPPER' && str !== str.toUpperCase())
        errors.push(`'${field}': debe estar en mayúsculas`);
    if (c.case === 'LOWER' && str !== str.toLowerCase())
        errors.push(`'${field}': debe estar en minúsculas`);
}

function validateNumber(value: any, c: Record<string, any>, field: string, errors: string[]): void {
    const num = Number(value);
    if (isNaN(num)) {
        errors.push(`'${field}': no es un número válido (valor: ${JSON.stringify(value)})`);
        return;
    }
    if (c.minValue !== undefined && num < c.minValue)
        errors.push(`'${field}': valor mínimo ${c.minValue}, tiene ${num}`);
    if (c.maxValue !== undefined && num > c.maxValue)
        errors.push(`'${field}': valor máximo ${c.maxValue}, tiene ${num}`);
    if (c.isInteger && !Number.isInteger(num))
        errors.push(`'${field}': debe ser entero, tiene ${num}`);
    if (c.allowNegative === false && num < 0)
        errors.push(`'${field}': no permite negativos, tiene ${num}`);
    if (c.allowZero === false && num === 0)
        errors.push(`'${field}': no permite cero`);
    if (c.decimals !== undefined) {
        const decimalPart = String(num).split('.')[1];
        if (decimalPart && decimalPart.length > c.decimals)
            errors.push(`'${field}': máximo ${c.decimals} decimales, tiene ${decimalPart.length}`);
    }
}

function validateEnum(value: any, c: Record<string, any>, field: string, errors: string[]): void {
    // allowedSex: convención salud — "A"=ambos(F,M), "F"=solo femenino, "M"=solo masculino
    // Se resuelve a un array de valores permitidos antes de validar
    let values = c.values || [];
    if (c.allowedSex !== undefined && values.length === 0) {
        const sex = String(c.allowedSex).toUpperCase();
        if (sex === 'A') values = ['F', 'M'];
        else if (sex === 'F' || sex === 'M') values = [sex];
        else values = [sex]; // valor literal
    }

    if (values.length === 0) return;
    const caseSensitive = c.caseSensitive === true;

    if (c.allowMultiple && Array.isArray(value)) {
        for (const v of value) {
            if (!matchesEnum(v, values, caseSensitive))
                errors.push(`'${field}': valor '${v}' no está en lista permitida [${values.join(', ')}]`);
        }
    } else {
        if (!matchesEnum(value, values, caseSensitive))
            errors.push(`'${field}': valor '${value}' no está en lista permitida [${values.join(', ')}]`);
    }
}

function matchesEnum(val: any, values: any[], caseSensitive: boolean): boolean {
    const strVal = String(val);
    return values.some(v => {
        if (caseSensitive) return String(v) === strVal;
        return String(v).toLowerCase() === strVal.toLowerCase();
    });
}

function validateDate(value: any, c: Record<string, any>, field: string, errors: string[]): void {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        errors.push(`'${field}': no es una fecha válida (valor: ${JSON.stringify(value)})`);
        return;
    }
    const now = new Date();
    if (c.minDate) {
        const min = resolveDate(c.minDate, now);
        if (date < min)
            errors.push(`'${field}': fecha mínima ${min.toISOString().split('T')[0]}, tiene ${date.toISOString().split('T')[0]}`);
    }
    if (c.maxDate) {
        const max = resolveDate(c.maxDate, now);
        if (date > max)
            errors.push(`'${field}': fecha máxima ${max.toISOString().split('T')[0]}, tiene ${date.toISOString().split('T')[0]}`);
    }
    if (c.allowFuture === false && date > now)
        errors.push(`'${field}': no permite fechas futuras`);
    if (c.allowPast === false && date < now)
        errors.push(`'${field}': no permite fechas pasadas`);
}

function resolveDate(dateStr: string, now: Date): Date {
    if (dateStr === 'TODAY') return new Date(now.toISOString().split('T')[0]);
    const todayMatch = dateStr.match(/^TODAY([+-])(\d+)$/);
    if (todayMatch) {
        const d = new Date(now.toISOString().split('T')[0]);
        const days = parseInt(todayMatch[2]) * (todayMatch[1] === '+' ? 1 : -1);
        d.setDate(d.getDate() + days);
        return d;
    }
    return new Date(dateStr);
}

function validateBoolean(value: any, c: Record<string, any>, field: string, errors: string[]): void {
    if (c.allowNull === false && (value === null || value === undefined)) {
        errors.push(`'${field}': no permite nulos`);
        return;
    }
    const valid = ['true', 'false', '1', '0', 'si', 'sí', 'no', 'yes'];
    if (typeof value !== 'boolean' && !valid.includes(String(value).toLowerCase()))
        errors.push(`'${field}': no es un valor booleano válido (valor: ${JSON.stringify(value)})`);

    // equals: el valor debe ser exactamente igual al esperado
    if (c.equals !== undefined) {
        const actualBool = toBool(value);
        const expectedBool = toBool(c.equals);
        if (actualBool !== expectedBool)
            errors.push(`'${field}': debe ser ${expectedBool} pero es ${actualBool}`);
    }
}

function validateRange(value: any, c: Record<string, any>, field: string, errors: string[]): void {
    if (!Array.isArray(value) || value.length !== 2) {
        errors.push(`'${field}': debe ser un rango [lower, upper], recibido: ${JSON.stringify(value)}`);
        return;
    }
    const [lower, upper] = value.map(Number);
    if (c.lowerMustBeLessThanUpper !== false && lower >= upper)
        errors.push(`'${field}': lower (${lower}) debe ser menor que upper (${upper})`);
    if (c.minValueLower !== undefined && lower < c.minValueLower)
        errors.push(`'${field}': lower mínimo ${c.minValueLower}, tiene ${lower}`);
    if (c.maxValueLower !== undefined && lower > c.maxValueLower)
        errors.push(`'${field}': lower máximo ${c.maxValueLower}, tiene ${lower}`);
    if (c.minValueUpper !== undefined && upper < c.minValueUpper)
        errors.push(`'${field}': upper mínimo ${c.minValueUpper}, tiene ${upper}`);
    if (c.maxValueUpper !== undefined && upper > c.maxValueUpper)
        errors.push(`'${field}': upper máximo ${c.maxValueUpper}, tiene ${upper}`);
}

function validateArray(value: any, c: Record<string, any>, field: string, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push(`'${field}': debe ser un array, recibido: ${typeof value}`);
        return;
    }
    if (c.minItems !== undefined && value.length < c.minItems)
        errors.push(`'${field}': mínimo ${c.minItems} elementos, tiene ${value.length}`);
    if (c.maxItems !== undefined && value.length > c.maxItems)
        errors.push(`'${field}': máximo ${c.maxItems} elementos, tiene ${value.length}`);
    if (c.uniqueItems && new Set(value).size !== value.length)
        errors.push(`'${field}': los elementos deben ser únicos`);
}

// ────────────────────────────────────────────
// Export
// ────────────────────────────────────────────

export { getNestedValue };

export default {
    evaluateRule,
    getNestedValue,
};
