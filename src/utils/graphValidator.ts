/**
 * graphValidator.ts
 *
 * Utilidad central para validar la integridad de grafos DAG
 * de reglas de negocio. Independiente de la interfaz y del ORM.
 *
 * Responsabilidades:
 *  - Detección de ciclos (Kahn's algorithm)
 *  - Validación de tipos de conexión entre nodos
 *  - Validación estructural del grafo
 *  - Detección de conflictos de PARAMETERs (buenas prácticas)
 *  - Soporte para nodos VALIDATION (validación intermedia) y SUB_RULE (composición)
 *  - Soporte para aristas con semántica TRUE/FALSE (decision trees)
 */

// ────────────────────────────────────────────
// Tipos internos del validador
// ────────────────────────────────────────────

export type NodeType = 'CONDITION' | 'GATE' | 'PARAMETER' | 'VALIDATION' | 'SUB_RULE';
export type EdgeType = 'DEFAULT' | 'TRUE' | 'FALSE';

export interface GraphNode {
    nodeId: string;
    nodeType: NodeType;
    config: Record<string, any>;
    isDefault: boolean;
}

export interface GraphEdge {
    sourceNodeId: string;
    targetNodeId: string;
    edgeOrder: number;
    edgeType?: EdgeType;
}

export interface ValidationMessage {
    level: 'ERROR' | 'WARNING';
    code: string;
    message: string;
    nodeId?: string;
    edgeSource?: string;
    edgeTarget?: string;
}

export interface GraphValidationResult {
    isValid: boolean;
    errors: ValidationMessage[];
    warnings: ValidationMessage[];
}

// ────────────────────────────────────────────
// Reglas de conexión válidas entre tipos de nodo
// ────────────────────────────────────────────

// source → set de targets permitidos
const VALID_CONNECTIONS: Record<string, Set<string>> = {
    'CONDITION':  new Set(['GATE', 'PARAMETER', 'VALIDATION', 'SUB_RULE']),
    'GATE':       new Set(['GATE', 'PARAMETER', 'VALIDATION', 'SUB_RULE']),
    'VALIDATION': new Set(['GATE', 'PARAMETER', 'VALIDATION', 'SUB_RULE']),
    'SUB_RULE':   new Set(['GATE', 'PARAMETER', 'VALIDATION']),
    'PARAMETER':  new Set(), // terminal, no puede ser source
};

// Nodos que NO pueden recibir aristas entrantes (solo CONDITIONs son entry puro)
const ENTRY_ONLY_TYPES: Set<string> = new Set(['CONDITION']);

// Nodos que producen resultado booleano (pueden tener aristas TRUE/FALSE salientes)
const BOOLEAN_PRODUCERS: Set<string> = new Set(['CONDITION', 'GATE', 'VALIDATION', 'SUB_RULE']);

// ────────────────────────────────────────────
// Validación principal
// ────────────────────────────────────────────

export function validateGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphValidationResult {
    const errors: ValidationMessage[] = [];
    const warnings: ValidationMessage[] = [];

    const nodeMap = new Map<string, GraphNode>();
    for (const node of nodes) {
        nodeMap.set(node.nodeId, node);
    }

    // 1. nodeId únicos
    validateUniqueNodeIds(nodes, errors);

    // 2. Aristas referencian nodos existentes
    validateEdgeReferences(edges, nodeMap, errors);

    // 3. Sin auto-referencias
    validateNoSelfReferences(edges, errors);

    // 4. Sin aristas duplicadas
    validateNoDuplicateEdges(edges, errors);

    // 5. Tipos de conexión válidos
    validateConnectionTypes(edges, nodeMap, errors);

    // 6. PARAMETER no es source de ninguna arista
    validateParameterIsTerminal(edges, nodeMap, errors);

    // 7. CONDITION no es target de ninguna arista (entry-only)
    validateConditionIsEntry(edges, nodeMap, errors);

    // 8. Detección de ciclos (DAG)
    validateNoCycles(nodes, edges, errors);

    // 9. Integridad estructural de GATEs
    validateGateIntegrity(nodes, edges, nodeMap, errors);

    // 10. Al menos un PARAMETER en la regla
    validateAtLeastOneParameter(nodes, errors);

    // 11. Todo nodo (excepto is_default) participa en al menos una arista
    validateNodeParticipation(nodes, edges, errors);

    // 12. Existe al menos un camino completo entrada → PARAMETER
    validateCompletePath(nodes, edges, nodeMap, errors);

    // 13. Validar config de cada nodo según su tipo
    validateNodeConfigs(nodes, errors);

    // 14. Validar semántica de edgeType en aristas
    validateEdgeTypes(edges, nodeMap, errors);

    // ─── Advertencias (buenas prácticas) ───

    // 15. PARAMETERs con mismo target_field que podrían activarse simultáneamente
    detectParameterConflicts(nodes, edges, nodeMap, warnings);

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

// ────────────────────────────────────────────
// Validaciones individuales
// ────────────────────────────────────────────

function validateUniqueNodeIds(nodes: GraphNode[], errors: ValidationMessage[]): void {
    const seen = new Set<string>();
    for (const node of nodes) {
        if (seen.has(node.nodeId)) {
            errors.push({
                level: 'ERROR',
                code: 'DUPLICATE_NODE_ID',
                message: `nodeId '${node.nodeId}' está duplicado dentro de la regla`,
                nodeId: node.nodeId,
            });
        }
        seen.add(node.nodeId);
    }
}

function validateEdgeReferences(edges: GraphEdge[], nodeMap: Map<string, GraphNode>, errors: ValidationMessage[]): void {
    for (const edge of edges) {
        if (!nodeMap.has(edge.sourceNodeId)) {
            errors.push({
                level: 'ERROR',
                code: 'INVALID_SOURCE_REF',
                message: `Arista referencia sourceNodeId '${edge.sourceNodeId}' que no existe`,
                edgeSource: edge.sourceNodeId,
                edgeTarget: edge.targetNodeId,
            });
        }
        if (!nodeMap.has(edge.targetNodeId)) {
            errors.push({
                level: 'ERROR',
                code: 'INVALID_TARGET_REF',
                message: `Arista referencia targetNodeId '${edge.targetNodeId}' que no existe`,
                edgeSource: edge.sourceNodeId,
                edgeTarget: edge.targetNodeId,
            });
        }
    }
}

function validateNoSelfReferences(edges: GraphEdge[], errors: ValidationMessage[]): void {
    for (const edge of edges) {
        if (edge.sourceNodeId === edge.targetNodeId) {
            errors.push({
                level: 'ERROR',
                code: 'SELF_REFERENCE',
                message: `Arista tiene auto-referencia: '${edge.sourceNodeId}' → '${edge.targetNodeId}'`,
                edgeSource: edge.sourceNodeId,
                edgeTarget: edge.targetNodeId,
            });
        }
    }
}

function validateNoDuplicateEdges(edges: GraphEdge[], errors: ValidationMessage[]): void {
    const seen = new Set<string>();
    for (const edge of edges) {
        const key = `${edge.sourceNodeId}->${edge.targetNodeId}`;
        if (seen.has(key)) {
            errors.push({
                level: 'ERROR',
                code: 'DUPLICATE_EDGE',
                message: `Arista duplicada: '${edge.sourceNodeId}' → '${edge.targetNodeId}'`,
                edgeSource: edge.sourceNodeId,
                edgeTarget: edge.targetNodeId,
            });
        }
        seen.add(key);
    }
}

function validateConnectionTypes(edges: GraphEdge[], nodeMap: Map<string, GraphNode>, errors: ValidationMessage[]): void {
    for (const edge of edges) {
        const source = nodeMap.get(edge.sourceNodeId);
        const target = nodeMap.get(edge.targetNodeId);
        if (!source || !target) continue;

        const validTargets = VALID_CONNECTIONS[source.nodeType];
        if (!validTargets || !validTargets.has(target.nodeType)) {
            errors.push({
                level: 'ERROR',
                code: 'INVALID_CONNECTION_TYPE',
                message: `Conexión inválida: ${source.nodeType}(${edge.sourceNodeId}) → ${target.nodeType}(${edge.targetNodeId})`,
                edgeSource: edge.sourceNodeId,
                edgeTarget: edge.targetNodeId,
            });
        }
    }
}

function validateParameterIsTerminal(edges: GraphEdge[], nodeMap: Map<string, GraphNode>, errors: ValidationMessage[]): void {
    for (const edge of edges) {
        const source = nodeMap.get(edge.sourceNodeId);
        if (source && source.nodeType === 'PARAMETER') {
            errors.push({
                level: 'ERROR',
                code: 'PARAMETER_AS_SOURCE',
                message: `PARAMETER '${edge.sourceNodeId}' no puede ser source de una arista (es nodo terminal)`,
                nodeId: edge.sourceNodeId,
            });
        }
    }
}

function validateConditionIsEntry(edges: GraphEdge[], nodeMap: Map<string, GraphNode>, errors: ValidationMessage[]): void {
    for (const edge of edges) {
        const target = nodeMap.get(edge.targetNodeId);
        if (target && ENTRY_ONLY_TYPES.has(target.nodeType)) {
            errors.push({
                level: 'ERROR',
                code: 'CONDITION_AS_TARGET',
                message: `CONDITION '${edge.targetNodeId}' no puede ser target de una arista (es nodo de entrada)`,
                nodeId: edge.targetNodeId,
            });
        }
    }
}

/**
 * Detección de ciclos usando algoritmo de Kahn (topological sort).
 * Si no se pueden procesar todos los nodos, existe un ciclo.
 */
function validateNoCycles(nodes: GraphNode[], edges: GraphEdge[], errors: ValidationMessage[]): void {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
        inDegree.set(node.nodeId, 0);
        adjacency.set(node.nodeId, []);
    }

    for (const edge of edges) {
        if (!inDegree.has(edge.sourceNodeId) || !inDegree.has(edge.targetNodeId)) continue;
        adjacency.get(edge.sourceNodeId)!.push(edge.targetNodeId);
        inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
        if (degree === 0) queue.push(nodeId);
    }

    let processedCount = 0;
    while (queue.length > 0) {
        const current = queue.shift()!;
        processedCount++;
        for (const neighbor of adjacency.get(current) || []) {
            const newDegree = (inDegree.get(neighbor) || 1) - 1;
            inDegree.set(neighbor, newDegree);
            if (newDegree === 0) queue.push(neighbor);
        }
    }

    if (processedCount !== nodes.length) {
        errors.push({
            level: 'ERROR',
            code: 'CYCLE_DETECTED',
            message: 'El grafo contiene ciclos. Debe ser un DAG (grafo dirigido acíclico)',
        });
    }
}

function validateGateIntegrity(nodes: GraphNode[], edges: GraphEdge[], nodeMap: Map<string, GraphNode>, errors: ValidationMessage[]): void {
    const gateNodes = nodes.filter(n => n.nodeType === 'GATE');

    for (const gate of gateNodes) {
        const incomingEdges = edges.filter(e => e.targetNodeId === gate.nodeId);
        const logic = (gate.config as any).logic;

        if (incomingEdges.length === 0) {
            errors.push({
                level: 'ERROR',
                code: 'GATE_NO_INPUTS',
                message: `GATE '${gate.nodeId}' no tiene aristas entrantes`,
                nodeId: gate.nodeId,
            });
            continue;
        }

        if (logic === 'NOT' && incomingEdges.length !== 1) {
            errors.push({
                level: 'ERROR',
                code: 'NOT_GATE_MULTIPLE_INPUTS',
                message: `GATE NOT '${gate.nodeId}' debe tener exactamente 1 arista entrante, tiene ${incomingEdges.length}`,
                nodeId: gate.nodeId,
            });
        }

        if (['AND', 'OR', 'XOR'].includes(logic) && incomingEdges.length < 2) {
            // AND/OR con 1 input es válido (actúa como pass-through)
            // Solo es error si tiene 0 inputs (ya cubierto arriba)
        }
    }
}

function validateAtLeastOneParameter(nodes: GraphNode[], errors: ValidationMessage[]): void {
    const hasParameter = nodes.some(n => n.nodeType === 'PARAMETER');
    if (!hasParameter) {
        errors.push({
            level: 'ERROR',
            code: 'NO_PARAMETERS',
            message: 'La regla debe tener al menos un nodo PARAMETER',
        });
    }
}

function validateNodeParticipation(nodes: GraphNode[], edges: GraphEdge[], errors: ValidationMessage[]): void {
    const participatingNodes = new Set<string>();
    for (const edge of edges) {
        participatingNodes.add(edge.sourceNodeId);
        participatingNodes.add(edge.targetNodeId);
    }

    for (const node of nodes) {
        if (node.isDefault) continue; // los defaults no necesitan aristas
        if (!participatingNodes.has(node.nodeId)) {
            errors.push({
                level: 'ERROR',
                code: 'ORPHAN_NODE',
                message: `Nodo '${node.nodeId}' (${node.nodeType}) no participa en ninguna arista`,
                nodeId: node.nodeId,
            });
        }
    }
}

function validateCompletePath(nodes: GraphNode[], edges: GraphEdge[], nodeMap: Map<string, GraphNode>, errors: ValidationMessage[]): void {
    // Nodos de entrada: CONDITIONs (entry puro) y VALIDATIONs/SUB_RULEs sin aristas entrantes
    const targetNodeIds = new Set(edges.map(e => e.targetNodeId));
    const entryNodes = nodes.filter(n =>
        n.nodeType === 'CONDITION' ||
        (!targetNodeIds.has(n.nodeId) && ['VALIDATION', 'SUB_RULE'].includes(n.nodeType))
    );
    const parameterNodes = nodes.filter(n => n.nodeType === 'PARAMETER' && !n.isDefault);

    if (entryNodes.length === 0 && parameterNodes.length > 0) {
        const nonDefaultParams = parameterNodes.filter(n => !n.isDefault);
        if (nonDefaultParams.length > 0) {
            errors.push({
                level: 'ERROR',
                code: 'NO_ENTRY_NODES',
                message: 'La regla tiene PARAMETERs pero no tiene nodos de entrada',
            });
        }
        return;
    }

    // BFS desde cada nodo de entrada para ver si alcanza algún PARAMETER
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
        adjacency.set(node.nodeId, []);
    }
    for (const edge of edges) {
        if (adjacency.has(edge.sourceNodeId)) {
            adjacency.get(edge.sourceNodeId)!.push(edge.targetNodeId);
        }
    }

    const parameterIds = new Set(parameterNodes.map(n => n.nodeId));
    let hasCompletePath = false;

    for (const entry of entryNodes) {
        const visited = new Set<string>();
        const queue = [entry.nodeId];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);

            if (parameterIds.has(current)) {
                hasCompletePath = true;
                break;
            }

            for (const neighbor of adjacency.get(current) || []) {
                queue.push(neighbor);
            }
        }

        if (hasCompletePath) break;
    }

    if (!hasCompletePath && parameterNodes.length > 0) {
        errors.push({
            level: 'ERROR',
            code: 'NO_COMPLETE_PATH',
            message: 'No existe ningún camino completo desde un nodo de entrada hasta un PARAMETER',
        });
    }
}

// ────────────────────────────────────────────
// Validación de configs por tipo de nodo
// ────────────────────────────────────────────

const CONDITION_OPERATORS = new Set([
    'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_EQUAL',
    'LESS_THAN', 'LESS_EQUAL', 'IN', 'NOT_IN', 'BETWEEN',
    'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX',
    'IS_NULL', 'IS_NOT_NULL', 'IS_EMPTY', 'IS_NOT_EMPTY',
]);

const CONDITION_DATA_TYPES = new Set(['STRING', 'NUMBER', 'DATE', 'BOOLEAN', 'ENUM']);
const GATE_LOGICS = new Set(['AND', 'OR', 'NOT', 'XOR']);
const PARAM_TYPES = new Set(['STRING', 'NUMBER', 'ENUM', 'DATE', 'RANGE', 'ARRAY', 'BOOLEAN']);
const VALIDATION_ACTIONS = new Set(['STOP', 'WARN']);

function validateNodeConfigs(nodes: GraphNode[], errors: ValidationMessage[]): void {
    for (const node of nodes) {
        const cfg = node.config;

        switch (node.nodeType) {
            case 'CONDITION': {
                const isComputed = 'expression' in cfg;

                if (isComputed) {
                    if (!cfg.expression || typeof cfg.expression !== 'string') {
                        errors.push({ level: 'ERROR', code: 'INVALID_CONDITION_CONFIG', message: `CONDITION computado '${node.nodeId}': falta 'expression'`, nodeId: node.nodeId });
                    }
                    if (!cfg.operator || !CONDITION_OPERATORS.has(cfg.operator)) {
                        errors.push({ level: 'ERROR', code: 'INVALID_CONDITION_CONFIG', message: `CONDITION computado '${node.nodeId}': 'operator' inválido o faltante`, nodeId: node.nodeId });
                    }
                } else {
                    if (!cfg.field || typeof cfg.field !== 'string') {
                        errors.push({ level: 'ERROR', code: 'INVALID_CONDITION_CONFIG', message: `CONDITION '${node.nodeId}': falta 'field'`, nodeId: node.nodeId });
                    }
                    if (!cfg.operator || !CONDITION_OPERATORS.has(cfg.operator)) {
                        errors.push({ level: 'ERROR', code: 'INVALID_CONDITION_CONFIG', message: `CONDITION '${node.nodeId}': 'operator' inválido o faltante`, nodeId: node.nodeId });
                    }
                    if (!cfg.data_type || !CONDITION_DATA_TYPES.has(cfg.data_type)) {
                        errors.push({ level: 'ERROR', code: 'INVALID_CONDITION_CONFIG', message: `CONDITION '${node.nodeId}': 'data_type' inválido o faltante`, nodeId: node.nodeId });
                    }
                    const noValueOps = new Set(['IS_NULL', 'IS_NOT_NULL', 'IS_EMPTY', 'IS_NOT_EMPTY']);
                    if (cfg.operator && !noValueOps.has(cfg.operator) && cfg.value === undefined) {
                        errors.push({ level: 'ERROR', code: 'INVALID_CONDITION_CONFIG', message: `CONDITION '${node.nodeId}': falta 'value' para operador '${cfg.operator}'`, nodeId: node.nodeId });
                    }
                }
                break;
            }

            case 'GATE': {
                if (!cfg.logic || !GATE_LOGICS.has(cfg.logic)) {
                    errors.push({ level: 'ERROR', code: 'INVALID_GATE_CONFIG', message: `GATE '${node.nodeId}': 'logic' inválido o faltante. Debe ser AND, OR, NOT o XOR`, nodeId: node.nodeId });
                }
                break;
            }

            case 'PARAMETER': {
                if (!cfg.target_field || typeof cfg.target_field !== 'string') {
                    errors.push({ level: 'ERROR', code: 'INVALID_PARAMETER_CONFIG', message: `PARAMETER '${node.nodeId}': falta 'target_field'`, nodeId: node.nodeId });
                }
                if (!cfg.param_type || !PARAM_TYPES.has(cfg.param_type)) {
                    errors.push({ level: 'ERROR', code: 'INVALID_PARAMETER_CONFIG', message: `PARAMETER '${node.nodeId}': 'param_type' inválido o faltante`, nodeId: node.nodeId });
                }
                // constraints se resuelven en runtime si hay templateRef o lookupRef
                if (!cfg.templateRef && !cfg.lookupRef) {
                    if (!cfg.constraints || typeof cfg.constraints !== 'object') {
                        errors.push({ level: 'ERROR', code: 'INVALID_PARAMETER_CONFIG', message: `PARAMETER '${node.nodeId}': falta 'constraints' (objeto de validación)`, nodeId: node.nodeId });
                    }
                }
                break;
            }

            case 'VALIDATION': {
                // VALIDATION es como CONDITION pero intermedio, con failureAction
                if (!cfg.field || typeof cfg.field !== 'string') {
                    errors.push({ level: 'ERROR', code: 'INVALID_VALIDATION_CONFIG', message: `VALIDATION '${node.nodeId}': falta 'field'`, nodeId: node.nodeId });
                }
                if (!cfg.operator || !CONDITION_OPERATORS.has(cfg.operator)) {
                    errors.push({ level: 'ERROR', code: 'INVALID_VALIDATION_CONFIG', message: `VALIDATION '${node.nodeId}': 'operator' inválido o faltante`, nodeId: node.nodeId });
                }
                if (!cfg.failureAction || !VALIDATION_ACTIONS.has(cfg.failureAction)) {
                    errors.push({ level: 'ERROR', code: 'INVALID_VALIDATION_CONFIG', message: `VALIDATION '${node.nodeId}': 'failureAction' debe ser STOP o WARN`, nodeId: node.nodeId });
                }
                break;
            }

            case 'SUB_RULE': {
                if (!cfg.subRuleRef || (!cfg.subRuleRef.ruleId && !cfg.subRuleRef.ruleUUID && !cfg.subRuleRef.ruleNumber)) {
                    errors.push({ level: 'ERROR', code: 'INVALID_SUB_RULE_CONFIG', message: `SUB_RULE '${node.nodeId}': falta 'subRuleRef' con ruleId, ruleUUID o ruleNumber`, nodeId: node.nodeId });
                }
                break;
            }
        }
    }
}

// ────────────────────────────────────────────
// Validación de semántica de edgeType
// ────────────────────────────────────────────

function validateEdgeTypes(edges: GraphEdge[], nodeMap: Map<string, GraphNode>, errors: ValidationMessage[]): void {
    for (const edge of edges) {
        const edgeType = edge.edgeType || 'DEFAULT';
        if (edgeType === 'DEFAULT') continue;

        // Solo nodos que producen booleano pueden tener aristas TRUE/FALSE
        const source = nodeMap.get(edge.sourceNodeId);
        if (source && !BOOLEAN_PRODUCERS.has(source.nodeType)) {
            errors.push({
                level: 'ERROR',
                code: 'INVALID_EDGE_TYPE',
                message: `Arista ${edge.sourceNodeId} → ${edge.targetNodeId} tiene edgeType '${edgeType}' pero ${source.nodeType} no produce resultado booleano`,
                edgeSource: edge.sourceNodeId,
                edgeTarget: edge.targetNodeId,
            });
        }
    }
}

// ────────────────────────────────────────────
// Detección de conflictos (buenas prácticas)
// ────────────────────────────────────────────

function detectParameterConflicts(
    nodes: GraphNode[],
    edges: GraphEdge[],
    nodeMap: Map<string, GraphNode>,
    warnings: ValidationMessage[],
): void {
    const parametersByField = new Map<string, GraphNode[]>();

    for (const node of nodes) {
        if (node.nodeType === 'PARAMETER' && !node.isDefault) {
            const targetField = (node.config as any).target_field;
            if (targetField) {
                if (!parametersByField.has(targetField)) {
                    parametersByField.set(targetField, []);
                }
                parametersByField.get(targetField)!.push(node);
            }
        }
    }

    for (const [field, params] of parametersByField) {
        if (params.length <= 1) continue;

        const sourceSets: Map<string, Set<string>> = new Map();
        for (const param of params) {
            const sources = edges
                .filter(e => e.targetNodeId === param.nodeId)
                .map(e => e.sourceNodeId);
            sourceSets.set(param.nodeId, new Set(sources));
        }

        const paramIds = params.map(p => p.nodeId);
        for (let i = 0; i < paramIds.length; i++) {
            for (let j = i + 1; j < paramIds.length; j++) {
                const sourcesA = sourceSets.get(paramIds[i])!;
                const sourcesB = sourceSets.get(paramIds[j])!;

                const shared = [...sourcesA].some(s => sourcesB.has(s));

                if (shared) {
                    warnings.push({
                        level: 'WARNING',
                        code: 'POTENTIAL_PARAMETER_CONFLICT',
                        message: `PARAMETERs '${paramIds[i]}' y '${paramIds[j]}' validan el mismo campo '${field}' y comparten source. Podrían activarse simultáneamente. Verifique que las rutas sean mutuamente excluyentes.`,
                    });
                } else {
                    warnings.push({
                        level: 'WARNING',
                        code: 'MULTIPLE_PARAMS_SAME_FIELD',
                        message: `PARAMETERs '${paramIds[i]}' y '${paramIds[j]}' validan el mismo campo '${field}' por rutas diferentes. Asegúrese de que las condiciones sean mutuamente excluyentes.`,
                    });
                }
            }
        }
    }
}

export default { validateGraph };
