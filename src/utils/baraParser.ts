/**
 * baraParser.ts
 *
 * Parser para el lenguaje BARA (.bara)
 * Notación declarativa para definir variables, lookup tables, templates y reglas
 * del sistema Graph Rule Master.
 *
 * Fases:
 *  1. Tokenizar → identificar bloques (vars, lookup, template, rule)
 *  2. Parsear cada bloque → estructuras tipadas
 *  3. Emitir → formato compatible con la API / UI
 *
 * Soporta:
 *  - Variables, Lookup Tables (clave simple y compuesta), Parameter Templates
 *  - Nodos: CONDITION, GATE, PARAMETER, VALIDATION, SUB_RULE
 *  - Aristas: DEFAULT, TRUE, FALSE (decision trees)
 *
 * Utilidad PURA — sin dependencias de DB ni framework.
 */

// ────────────────────────────────────────────
// Tipos de salida
// ────────────────────────────────────────────

export interface BaraVariable {
    name: string;
    type: string; // STRING | NUMBER | BOOLEAN | DATE | ENUM | RANGE | ARRAY
}

export interface BaraLookupColumn {
    columnName: string;
    targetField: string;
    constraintKey: string;
    dataType: string;
}

export interface BaraLookupRow {
    keyValue: string | Record<string, string>;
    values: Record<string, any>;
}

export interface BaraLookupTable {
    name: string;
    keyField: string | string[];
    columns: BaraLookupColumn[];
    rows: BaraLookupRow[];
}

export interface BaraTemplate {
    name: string;
    paramType: string;
    required: boolean;
    constraints: Record<string, any>;
}

export interface BaraNode {
    nodeId: string;
    nodeType: 'CONDITION' | 'GATE' | 'PARAMETER' | 'VALIDATION' | 'SUB_RULE';
    label?: string;
    isEntry: boolean;
    isDefault: boolean;
    config: Record<string, any>;
}

export interface BaraEdge {
    sourceNodeId: string;
    targetNodeId: string;
    edgeOrder: number;
    edgeType?: 'DEFAULT' | 'TRUE' | 'FALSE';
}

export interface BaraRule {
    ruleNumber: string;
    name: string;
    ruleType: string; // VALIDATION | CONSISTENCY | FORMAT | BUSINESS
    priority: number;
    enabled: boolean;
    graph: {
        nodes: BaraNode[];
        edges: BaraEdge[];
    };
}

export interface BaraParseResult {
    variables: BaraVariable[];
    lookupTables: BaraLookupTable[];
    templates: BaraTemplate[];
    rules: BaraRule[];
    errors: BaraError[];
    warnings: BaraWarning[];
}

export interface BaraError {
    line: number;
    message: string;
}

export interface BaraWarning {
    line: number;
    message: string;
}

// ────────────────────────────────────────────
// Operator mapping: BARA syntax → system operators
// ────────────────────────────────────────────

const OPERATOR_MAP: Record<string, string> = {
    '==': 'EQUALS',
    '!=': 'NOT_EQUALS',
    '>':  'GREATER_THAN',
    '>=': 'GREATER_EQUAL',
    '<':  'LESS_THAN',
    '<=': 'LESS_EQUAL',
    'IN': 'IN',
    'NOT_IN': 'NOT_IN',
    'BETWEEN': 'BETWEEN',
    'CONTAINS': 'CONTAINS',
    'STARTS_WITH': 'STARTS_WITH',
    'ENDS_WITH': 'ENDS_WITH',
    'REGEX': 'REGEX',
    'IS_NULL': 'IS_NULL',
    'IS_NOT_NULL': 'IS_NOT_NULL',
    'IS_EMPTY': 'IS_EMPTY',
    'IS_NOT_EMPTY': 'IS_NOT_EMPTY',
};

// ────────────────────────────────────────────
// Main parse function
// ────────────────────────────────────────────

export function parseBARA(source: string): BaraParseResult {
    const result: BaraParseResult = {
        variables: [],
        lookupTables: [],
        templates: [],
        rules: [],
        errors: [],
        warnings: [],
    };

    const lines = source.split('\n');
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('//')) {
            i++;
            continue;
        }

        // ── vars block ──
        if (line.startsWith('vars')) {
            i = parseVarsBlock(lines, i, result);
            continue;
        }

        // ── lookup block ──
        if (line.startsWith('lookup')) {
            i = parseLookupBlock(lines, i, result);
            continue;
        }

        // ── template block ──
        if (line.startsWith('template')) {
            i = parseTemplateBlock(lines, i, result);
            continue;
        }

        // ── rule block ──
        if (line.startsWith('rule')) {
            i = parseRuleBlock(lines, i, result);
            continue;
        }

        // Unknown line
        result.warnings.push({ line: i + 1, message: `Línea no reconocida: "${line.slice(0, 60)}"` });
        i++;
    }

    return result;
}

// ────────────────────────────────────────────
// Block parsers
// ────────────────────────────────────────────

/**
 * Parse: vars { name: TYPE \n ... }
 */
function parseVarsBlock(lines: string[], startLine: number, result: BaraParseResult): number {
    let i = startLine;
    const header = lines[i].trim();

    // Find opening brace
    if (!header.includes('{')) {
        result.errors.push({ line: i + 1, message: 'Se esperaba "{" en bloque vars' });
        return i + 1;
    }

    i++;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line === '}') return i + 1;
        if (!line || line.startsWith('//')) { i++; continue; }

        // Parse: name: TYPE  (strip inline comments first)
        const lineClean = line.replace(/\/\/.*$/, '').trim();
        const match = lineClean.match(/^(\w[\w.]*)\s*:\s*(STRING|NUMBER|BOOLEAN|DATE|ENUM|RANGE|ARRAY)\s*$/i);
        if (match) {
            result.variables.push({ name: match[1], type: match[2].toUpperCase() });
        } else {
            result.errors.push({ line: i + 1, message: `Variable inválida: "${line}". Formato esperado: nombre: TIPO` });
        }
        i++;
    }

    result.errors.push({ line: startLine + 1, message: 'Bloque vars sin cerrar (falta "}")' });
    return i;
}

/**
 * Parse: lookup "name" on keyField { ... }
 *        lookup "name" on [field1, field2] { ... }
 */
function parseLookupBlock(lines: string[], startLine: number, result: BaraParseResult): number {
    let i = startLine;
    const header = lines[i].trim();

    // Try composite key: lookup "name" on [field1, field2] {
    const compositeMatch = header.match(/^lookup\s+"([^"]+)"\s+on\s+\[([^\]]+)\]\s*\{?\s*$/);
    // Try simple key: lookup "name" on keyField {
    const simpleMatch = header.match(/^lookup\s+"([^"]+)"\s+on\s+(\w[\w.]*)\s*\{?\s*$/);

    if (!compositeMatch && !simpleMatch) {
        result.errors.push({ line: i + 1, message: `Header de lookup inválido: "${header}". Formato: lookup "nombre" on campo { o lookup "nombre" on [campo1, campo2] {` });
        return skipBlock(lines, i);
    }

    let keyField: string | string[];
    let tableName: string;

    if (compositeMatch) {
        tableName = compositeMatch[1];
        keyField = compositeMatch[2].split(',').map(s => s.trim());
    } else {
        tableName = simpleMatch![1];
        keyField = simpleMatch![2];
    }

    const table: BaraLookupTable = {
        name: tableName,
        keyField,
        columns: [],
        rows: [],
    };

    // If opening brace not on same line, check next
    if (!header.includes('{')) {
        i++;
        if (i < lines.length && lines[i].trim() === '{') {
            // ok
        } else {
            result.errors.push({ line: i + 1, message: 'Se esperaba "{" en bloque lookup' });
            return i;
        }
    }

    i++;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line === '}') {
            result.lookupTables.push(table);
            return i + 1;
        }
        if (!line || line.startsWith('//')) { i++; continue; }

        // ── columns sub-block ──
        if (line.startsWith('columns')) {
            i = parseLookupColumns(lines, i, table, result);
            continue;
        }

        // ── composite key row: {"campo1": "val1", "campo2": "val2"} => { col: val, ... } ──
        const compositeRowMatch = line.match(/^(\{[^}]+\})\s*=>\s*\{(.+)\}\s*$/);
        if (compositeRowMatch) {
            try {
                const keyValue = JSON.parse(compositeRowMatch[1]);
                const values = parseInlineObject(compositeRowMatch[2]);
                table.rows.push({ keyValue, values });
            } catch (e: any) {
                result.errors.push({ line: i + 1, message: `Error parseando fila lookup compuesta: ${e.message}` });
            }
            i++;
            continue;
        }

        // ── simple key row: "keyValue" => { col: val, ... } ──
        const rowMatch = line.match(/^"([^"]+)"\s*=>\s*\{(.+)\}\s*$/);
        if (rowMatch) {
            try {
                const values = parseInlineObject(rowMatch[2]);
                table.rows.push({ keyValue: rowMatch[1], values });
            } catch (e: any) {
                result.errors.push({ line: i + 1, message: `Error parseando fila lookup: ${e.message}` });
            }
            i++;
            continue;
        }

        result.warnings.push({ line: i + 1, message: `Línea no reconocida en lookup: "${line.slice(0, 60)}"` });
        i++;
    }

    result.errors.push({ line: startLine + 1, message: 'Bloque lookup sin cerrar' });
    return i;
}

/**
 * Parse columns sub-block inside lookup:
 *   columns {
 *     colName -> targetField.constraintKey DATATYPE
 *   }
 */
function parseLookupColumns(lines: string[], startLine: number, table: BaraLookupTable, result: BaraParseResult): number {
    let i = startLine;
    const header = lines[i].trim();

    if (!header.includes('{')) {
        i++;
        if (i >= lines.length || lines[i].trim() !== '{') {
            result.errors.push({ line: i + 1, message: 'Se esperaba "{" en bloque columns' });
            return i;
        }
    }

    i++;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line === '}') return i + 1;
        if (!line || line.startsWith('//')) { i++; continue; }

        // Parse: colName -> targetField.constraintKey DATATYPE  (strip inline comments)
        const colLine = line.replace(/\s+\/\/.*$/, '').trim();
        const colMatch = colLine.match(/^(\w+)\s*->\s*([\w.]+)\.([\w]+)\s+(STRING|NUMBER|BOOLEAN|DATE)\s*$/i);
        if (colMatch) {
            table.columns.push({
                columnName: colMatch[1],
                targetField: colMatch[2],
                constraintKey: colMatch[3],
                dataType: colMatch[4].toUpperCase(),
            });
        } else {
            result.errors.push({ line: i + 1, message: `Columna lookup inválida: "${colLine}". Formato: nombre -> campo.constraint TIPO` });
        }
        i++;
    }

    result.errors.push({ line: startLine + 1, message: 'Bloque columns sin cerrar' });
    return i;
}

/**
 * Parse: template "name" TYPE required|optional { constraints }
 */
function parseTemplateBlock(lines: string[], startLine: number, result: BaraParseResult): number {
    let i = startLine;
    const header = lines[i].trim();

    // template "name" TYPE required|optional { key: val, ... }
    const headerMatch = header.match(
        /^template\s+"([^"]+)"\s+(STRING|NUMBER|ENUM|DATE|RANGE|ARRAY|BOOLEAN)(?:\s+(required|optional))?\s*\{(.+)\}\s*$/i
    );

    // Multi-line: template "name" TYPE required {
    const headerMultiMatch = header.match(
        /^template\s+"([^"]+)"\s+(STRING|NUMBER|ENUM|DATE|RANGE|ARRAY|BOOLEAN)(?:\s+(required|optional))?\s*\{\s*$/i
    );

    if (headerMatch) {
        // Single-line template
        try {
            const constraints = parseInlineObject(headerMatch[4].trim());
            result.templates.push({
                name: headerMatch[1],
                paramType: headerMatch[2].toUpperCase(),
                required: headerMatch[3] ? headerMatch[3].toLowerCase() === 'required' : true,
                constraints,
            });
        } catch (e: any) {
            result.errors.push({ line: i + 1, message: `Error en constraints de template: ${e.message}` });
        }
        return i + 1;
    }

    if (headerMultiMatch) {
        // Multi-line template — collect lines until }
        const templateName = headerMultiMatch[1];
        const paramType = headerMultiMatch[2].toUpperCase();
        const required = headerMultiMatch[3] ? headerMultiMatch[3].toLowerCase() === 'required' : true;
        let constraintStr = '';

        i++;
        while (i < lines.length) {
            const line = lines[i].trim();
            if (line === '}') {
                try {
                    const constraints = constraintStr.trim() ? parseInlineObject(constraintStr.trim()) : {};
                    result.templates.push({ name: templateName, paramType, required, constraints });
                } catch (e: any) {
                    result.errors.push({ line: i + 1, message: `Error en constraints de template: ${e.message}` });
                }
                return i + 1;
            }
            if (!line || line.startsWith('//')) { i++; continue; }
            constraintStr += (constraintStr ? ', ' : '') + line.replace(/,\s*$/, '');
            i++;
        }

        result.errors.push({ line: startLine + 1, message: 'Bloque template sin cerrar' });
        return i;
    }

    result.errors.push({ line: i + 1, message: `Header de template inválido: "${header.slice(0, 80)}"` });
    return i + 1;
}

/**
 * Parse rule block:
 *   rule "name" #number TYPE priority=N {
 *     C1: field == value
 *     V1: VALIDATE field OP value STOP|WARN
 *     S1: SUB_RULE("#ruleRef")
 *     G1: AND(C1, V1, S1)
 *     P1: PARAM field TYPE required template("name") { constraints }
 *     G1 -> P1, P2
 *     G1 ->TRUE P3
 *     G1 ->FALSE P4
 *   }
 */
function parseRuleBlock(lines: string[], startLine: number, result: BaraParseResult): number {
    let i = startLine;
    const header = lines[i].trim();

    // Parse header: rule "name" #number TYPE priority=N enabled=bool {
    const headerMatch = header.match(
        /^rule\s+"([^"]+)"\s+#(\w+)\s+(VALIDATION|CONSISTENCY|FORMAT|BUSINESS)(?:\s+priority=(\d+))?(?:\s+enabled=(true|false))?\s*\{?\s*$/i
    );
    if (!headerMatch) {
        result.errors.push({ line: i + 1, message: `Header de rule inválido: "${header.slice(0, 80)}"` });
        return skipBlock(lines, i);
    }

    const rule: BaraRule = {
        name: headerMatch[1],
        ruleNumber: headerMatch[2],
        ruleType: headerMatch[3].toUpperCase(),
        priority: headerMatch[4] ? parseInt(headerMatch[4]) : 1,
        enabled: headerMatch[5] !== 'false',
        graph: { nodes: [], edges: [] },
    };

    if (!header.includes('{')) {
        i++;
        if (i < lines.length && lines[i].trim() === '{') {
            // ok
        } else {
            result.errors.push({ line: i + 1, message: 'Se esperaba "{" en bloque rule' });
            return i;
        }
    }

    i++;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line === '}') {
            // Auto-detect isEntry for entry-type nodes
            const targetIds = new Set(rule.graph.edges.map(e => e.targetNodeId));
            rule.graph.nodes.forEach(n => {
                if (['CONDITION', 'VALIDATION', 'SUB_RULE'].includes(n.nodeType)) {
                    n.isEntry = !targetIds.has(n.nodeId);
                }
            });
            result.rules.push(rule);
            return i + 1;
        }
        if (!line || line.startsWith('//')) { i++; continue; }

        // Strip inline comments (preserving content inside quoted strings)
        const lineClean = line.replace(/\s+\/\/.*$/, '').trim();

        // ── Edge: G1 -> P1, P2  or  G1 ->TRUE P1  or  G1 ->FALSE P2 ──
        if (lineClean.includes('->') && !lineClean.includes(': ')) {
            parseEdgeLine(lineClean, i, rule, result);
            i++;
            continue;
        }

        // ── Node declaration: ID: ... ──
        const nodePrefix = lineClean.match(/^([A-Za-z]\w*)\s*:\s*(.+)$/);
        if (nodePrefix) {
            const nodeId = nodePrefix[1];
            const body = nodePrefix[2].trim();
            parseNodeDeclaration(nodeId, body, i, rule, result);
            i++;
            continue;
        }

        result.warnings.push({ line: i + 1, message: `Línea no reconocida en rule: "${lineClean.slice(0, 60)}"` });
        i++;
    }

    result.errors.push({ line: startLine + 1, message: 'Bloque rule sin cerrar' });
    return i;
}

// ────────────────────────────────────────────
// Node declaration parsers
// ────────────────────────────────────────────

function parseNodeDeclaration(
    nodeId: string,
    body: string,
    lineNum: number,
    rule: BaraRule,
    result: BaraParseResult,
) {
    // ── SUB_RULE: SUB_RULE("ruleRef") ──
    const subRuleMatch = body.match(/^SUB_RULE\s*\("([^"]+)"\)\s*$/i);
    if (subRuleMatch) {
        const ref = subRuleMatch[1];
        rule.graph.nodes.push({
            nodeId,
            nodeType: 'SUB_RULE',
            label: `SUB_RULE(${ref})`,
            isEntry: false,
            isDefault: false,
            config: {
                subRuleRef: ref.startsWith('#')
                    ? { ruleNumber: ref.slice(1) }
                    : { ruleUUID: ref },
            },
        });
        return;
    }

    // ── VALIDATION: VALIDATE field OP value ACTION ──
    const validateMatch = body.match(
        /^VALIDATE\s+([\w.]+)\s+(==|!=|>=|<=|>|<|IN|NOT_IN|BETWEEN|CONTAINS|STARTS_WITH|ENDS_WITH|REGEX|IS_NULL|IS_NOT_NULL|IS_EMPTY|IS_NOT_EMPTY)(?:\s+(.+?))?\s+(STOP|WARN)\s*$/i
    );
    if (validateMatch) {
        const field = validateMatch[1];
        const op = validateMatch[2];
        const rawValue = validateMatch[3];
        const failureAction = validateMatch[4].toUpperCase();
        const operator = OPERATOR_MAP[op] || OPERATOR_MAP[op.toUpperCase()] || op.toUpperCase();

        const config: Record<string, any> = {
            field,
            operator,
            failureAction,
            data_type: 'STRING',
        };

        // Parse value if present (not for unary operators)
        if (rawValue !== undefined && rawValue.trim()) {
            config.value = parseInlineValue(rawValue.trim());
            config.data_type = inferDataType(config.value);
        }

        rule.graph.nodes.push({
            nodeId,
            nodeType: 'VALIDATION',
            label: `VALIDATE ${field} ${op}${rawValue ? ' ' + rawValue : ''} ${failureAction}`,
            isEntry: false,
            isDefault: false,
            config,
        });
        return;
    }

    // ── GATE: AND(C1, C2) / OR(C1, C2) / NOT(C1) / XOR(C1, C2) ──
    const gateMatch = body.match(/^(AND|OR|NOT|XOR)\s*\(([^)]*)\)\s*$/i);
    if (gateMatch) {
        const logic = gateMatch[1].toUpperCase();
        const inputs = gateMatch[2].split(',').map(s => s.trim()).filter(Boolean);

        rule.graph.nodes.push({
            nodeId,
            nodeType: 'GATE',
            isEntry: false,
            isDefault: false,
            config: { logic, short_circuit: true },
        });

        // Auto-create edges from inputs to this gate
        inputs.forEach((inputId, idx) => {
            rule.graph.edges.push({
                sourceNodeId: inputId,
                targetNodeId: nodeId,
                edgeOrder: idx + 1,
                edgeType: 'DEFAULT',
            });
        });
        return;
    }

    // ── PARAMETER: PARAM field TYPE [required|optional] [default] [lookup("name")] [template("name")] { constraints } ──
    const paramMatch = body.match(
        /^PARAM\s+([\w.]+)\s+(STRING|NUMBER|ENUM|DATE|RANGE|ARRAY|BOOLEAN)(?:\s+(required|optional))?(?:\s+(default))?(?:\s+lookup\("([^"]+)"\))?(?:\s+template\("([^"]+)"\))?\s*(?:\{(.+)\})?\s*$/i
    );
    if (paramMatch) {
        const config: Record<string, any> = {
            target_field: paramMatch[1],
            param_type: paramMatch[2].toUpperCase(),
            required: paramMatch[3] ? paramMatch[3].toLowerCase() === 'required' : true,
            constraints: {},
        };

        if (paramMatch[5]) {
            config.lookupRef = { tableName: paramMatch[5] };
        }

        if (paramMatch[6]) {
            config.templateRef = { templateName: paramMatch[6] };
        }

        if (paramMatch[7]) {
            try {
                config.constraints = parseInlineObject(paramMatch[7].trim());
            } catch (e: any) {
                result.errors.push({ line: lineNum + 1, message: `Error en constraints de ${nodeId}: ${e.message}` });
            }
        }

        rule.graph.nodes.push({
            nodeId,
            nodeType: 'PARAMETER',
            isEntry: false,
            isDefault: !!paramMatch[4],
            config,
        });
        return;
    }

    // ── CONDITION: field OPERATOR value ──
    // Handles: field == "value", field >= 123, field IN lookup("name"), field IS_NULL
    const condResult = parseConditionBody(body, lineNum, result);
    if (condResult) {
        rule.graph.nodes.push({
            nodeId,
            nodeType: 'CONDITION',
            label: body,
            isEntry: false, // will be set later
            isDefault: false,
            config: condResult,
        });
        return;
    }

    result.errors.push({ line: lineNum + 1, message: `No se pudo parsear nodo "${nodeId}: ${body.slice(0, 60)}"` });
}

function parseConditionBody(body: string, lineNum: number, result: BaraParseResult): Record<string, any> | null {
    // ── Unary operators: field IS_NULL, field IS_NOT_NULL, field IS_EMPTY, field IS_NOT_EMPTY ──
    const unaryMatch = body.match(/^([\w.]+)\s+(IS_NULL|IS_NOT_NULL|IS_EMPTY|IS_NOT_EMPTY)\s*$/i);
    if (unaryMatch) {
        return {
            field: unaryMatch[1],
            operator: unaryMatch[2].toUpperCase(),
            data_type: 'STRING',
        };
    }

    // ── field IN lookup("name") ──
    const lookupInMatch = body.match(/^([\w.]+)\s+IN\s+lookup\("([^"]+)"\)\s*$/i);
    if (lookupInMatch) {
        return {
            field: lookupInMatch[1],
            operator: 'IN',
            value: `lookup:${lookupInMatch[2]}`,
            data_type: 'STRING',
            _lookupRef: lookupInMatch[2],
        };
    }

    // ── field IN [val1, val2] or field IN "val1, val2" ──
    const inMatch = body.match(/^([\w.]+)\s+(IN|NOT_IN)\s+\[(.+)\]\s*$/i);
    if (inMatch) {
        const values = inMatch[3].split(',').map(s => parseInlineValue(s.trim()));
        return {
            field: inMatch[1],
            operator: inMatch[2].toUpperCase(),
            value: values,
            data_type: inferDataType(values[0]),
        };
    }

    // ── field BETWEEN [min, max] ──
    const betweenMatch = body.match(/^([\w.]+)\s+BETWEEN\s+\[(.+),\s*(.+)\]\s*$/i);
    if (betweenMatch) {
        return {
            field: betweenMatch[1],
            operator: 'BETWEEN',
            value: [parseInlineValue(betweenMatch[2].trim()), parseInlineValue(betweenMatch[3].trim())],
            data_type: 'NUMBER',
        };
    }

    // ── field OP value (standard binary: ==, !=, >, >=, <, <=, CONTAINS, etc.) ──
    const binaryMatch = body.match(/^([\w.]+)\s+(==|!=|>=|<=|>|<|CONTAINS|STARTS_WITH|ENDS_WITH|REGEX)\s+(.+)$/i);
    if (binaryMatch) {
        const field = binaryMatch[1];
        const op = binaryMatch[2];
        const rawValue = binaryMatch[3].trim();
        const value = parseInlineValue(rawValue);
        const operator = OPERATOR_MAP[op] || OPERATOR_MAP[op.toUpperCase()] || op.toUpperCase();

        return {
            field,
            operator,
            value,
            data_type: inferDataType(value),
        };
    }

    return null;
}

// ────────────────────────────────────────────
// Edge parser (supports ->  ->TRUE  ->FALSE)
// ────────────────────────────────────────────

function parseEdgeLine(line: string, lineNum: number, rule: BaraRule, result: BaraParseResult) {
    // Formats:
    //   SOURCE -> TARGET1, TARGET2
    //   SOURCE ->TRUE TARGET1, TARGET2
    //   SOURCE ->FALSE TARGET1, TARGET2
    const edgeMatch = line.match(/^(\w+)\s*->(TRUE|FALSE)?\s*(.+)$/i);
    if (!edgeMatch) {
        result.errors.push({ line: lineNum + 1, message: `Edge inválido: "${line}"` });
        return;
    }

    const source = edgeMatch[1].trim();
    const edgeType = (edgeMatch[2] ? edgeMatch[2].toUpperCase() : 'DEFAULT') as 'DEFAULT' | 'TRUE' | 'FALSE';
    const targets = edgeMatch[3].split(',').map(s => s.trim()).filter(Boolean);

    targets.forEach((target, idx) => {
        rule.graph.edges.push({
            sourceNodeId: source,
            targetNodeId: target,
            edgeOrder: idx + 1,
            edgeType,
        });
    });
}

// ────────────────────────────────────────────
// Value parsing helpers
// ────────────────────────────────────────────

/**
 * Parse an inline object from a string like: key: val, key2: val2
 * Supports: numbers, strings (quoted), booleans, arrays
 */
function parseInlineObject(str: string): Record<string, any> {
    // Wrap in braces if not already and use JSON-like parsing
    let jsonStr = str.trim();

    // Convert BARA inline syntax to JSON:
    // key: value, key2: value2 → {"key": value, "key2": value2}
    jsonStr = jsonStr
        // Quote unquoted keys
        .replace(/(\w+)\s*:/g, '"$1":')
        // Handle unquoted string values that aren't booleans/numbers/null
        .replace(/:\s*([a-zA-Z_]\w*)\s*(?=[,}]|$)/g, (match, val) => {
            if (['true', 'false', 'null'].includes(val.toLowerCase())) {
                return `: ${val.toLowerCase()}`;
            }
            return `: "${val}"`;
        });

    // Wrap if needed
    if (!jsonStr.startsWith('{')) jsonStr = `{${jsonStr}}`;

    try {
        return JSON.parse(jsonStr);
    } catch {
        // Fallback: manual key-value parsing
        return parseKeyValuePairs(str);
    }
}

function parseKeyValuePairs(str: string): Record<string, any> {
    const result: Record<string, any> = {};
    // Split by comma, but respect quoted strings
    const pairs = splitRespectingQuotes(str, ',');

    for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx < 0) continue;
        const key = pair.slice(0, colonIdx).trim();
        const rawVal = pair.slice(colonIdx + 1).trim();
        result[key] = parseInlineValue(rawVal);
    }

    return result;
}

function parseInlineValue(raw: string): any {
    const s = raw.trim();

    // Quoted string
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
    }
    // Boolean
    if (s.toLowerCase() === 'true') return true;
    if (s.toLowerCase() === 'false') return false;
    // Null
    if (s.toLowerCase() === 'null') return null;
    // Number
    const num = Number(s);
    if (!isNaN(num) && s !== '') return num;
    // Array
    if (s.startsWith('[') && s.endsWith(']')) {
        return s.slice(1, -1).split(',').map(v => parseInlineValue(v.trim()));
    }
    // Fallback: string
    return s;
}

function inferDataType(value: any): string {
    if (typeof value === 'number') return 'NUMBER';
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (value instanceof Date) return 'DATE';
    return 'STRING';
}

function splitRespectingQuotes(str: string, delimiter: string): string[] {
    const results: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (const ch of str) {
        if (!inQuote && (ch === '"' || ch === "'")) {
            inQuote = true;
            quoteChar = ch;
            current += ch;
        } else if (inQuote && ch === quoteChar) {
            inQuote = false;
            current += ch;
        } else if (!inQuote && ch === delimiter) {
            results.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    if (current) results.push(current);
    return results;
}

// ────────────────────────────────────────────
// Block skip helper
// ────────────────────────────────────────────

function skipBlock(lines: string[], startLine: number): number {
    let depth = 0;
    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        for (const ch of line) {
            if (ch === '{') depth++;
            if (ch === '}') {
                depth--;
                if (depth <= 0) return i + 1;
            }
        }
    }
    return lines.length;
}

// ────────────────────────────────────────────
// EMITTER: Generate .bara from structured data
// ────────────────────────────────────────────

const REVERSE_OPERATOR_MAP: Record<string, string> = {
    'EQUALS': '==',
    'NOT_EQUALS': '!=',
    'GREATER_THAN': '>',
    'GREATER_EQUAL': '>=',
    'LESS_THAN': '<',
    'LESS_EQUAL': '<=',
};

export function emitBARA(data: {
    variables?: BaraVariable[];
    lookupTables?: BaraLookupTable[];
    templates?: BaraTemplate[];
    rules?: BaraRule[];
}): string {
    const lines: string[] = [];

    // ── Variables ──
    if (data.variables && data.variables.length > 0) {
        lines.push('vars {');
        for (const v of data.variables) {
            lines.push(`  ${v.name}: ${v.type}`);
        }
        lines.push('}');
        lines.push('');
    }

    // ── Lookup Tables ──
    if (data.lookupTables) {
        for (const lt of data.lookupTables) {
            // Emit keyField: simple or composite
            const keyFieldStr = Array.isArray(lt.keyField)
                ? `[${lt.keyField.join(', ')}]`
                : lt.keyField;
            lines.push(`lookup "${lt.name}" on ${keyFieldStr} {`);

            if (lt.columns.length > 0) {
                lines.push('  columns {');
                for (const col of lt.columns) {
                    lines.push(`    ${col.columnName} -> ${col.targetField}.${col.constraintKey} ${col.dataType}`);
                }
                lines.push('  }');
            }

            for (const row of lt.rows) {
                const vals = Object.entries(row.values)
                    .map(([k, v]) => `${k}: ${formatBaraValue(v)}`)
                    .join(', ');

                // Emit keyValue: simple string or composite object
                const keyStr = typeof row.keyValue === 'string'
                    ? `"${row.keyValue}"`
                    : JSON.stringify(row.keyValue);
                lines.push(`  ${keyStr} => { ${vals} }`);
            }

            lines.push('}');
            lines.push('');
        }
    }

    // ── Templates ──
    if (data.templates) {
        for (const t of data.templates) {
            const reqStr = t.required ? 'required' : 'optional';
            const pairs = Object.entries(t.constraints)
                .map(([k, v]) => `${k}: ${formatBaraValue(v)}`)
                .join(', ');
            lines.push(`template "${t.name}" ${t.paramType} ${reqStr} { ${pairs} }`);
        }
        if (data.templates.length > 0) lines.push('');
    }

    // ── Rules ──
    if (data.rules) {
        for (const rule of data.rules) {
            let header = `rule "${rule.name}" #${rule.ruleNumber} ${rule.ruleType}`;
            if (rule.priority !== 1) header += ` priority=${rule.priority}`;
            if (!rule.enabled) header += ` enabled=false`;
            header += ' {';
            lines.push(header);

            const nodes = rule.graph.nodes;
            const edges = rule.graph.edges;

            // Group nodes by type
            const conditions = nodes.filter(n => n.nodeType === 'CONDITION');
            const validations = nodes.filter(n => n.nodeType === 'VALIDATION');
            const subRules = nodes.filter(n => n.nodeType === 'SUB_RULE');
            const gates = nodes.filter(n => n.nodeType === 'GATE');
            const parameters = nodes.filter(n => n.nodeType === 'PARAMETER');

            // Emit conditions
            for (const n of conditions) {
                lines.push(`  ${n.nodeId}: ${emitCondition(n.config)}`);
            }

            // Emit validations
            if (conditions.length > 0 && validations.length > 0) lines.push('');
            for (const n of validations) {
                lines.push(`  ${n.nodeId}: ${emitValidation(n.config)}`);
            }

            // Emit sub-rules
            if ((conditions.length > 0 || validations.length > 0) && subRules.length > 0) lines.push('');
            for (const n of subRules) {
                lines.push(`  ${n.nodeId}: ${emitSubRule(n.config)}`);
            }

            // Emit gates
            if ((conditions.length > 0 || validations.length > 0 || subRules.length > 0) && gates.length > 0) lines.push('');
            for (const n of gates) {
                const inputs = edges
                    .filter(e => e.targetNodeId === n.nodeId)
                    .sort((a, b) => a.edgeOrder - b.edgeOrder)
                    .map(e => e.sourceNodeId);
                lines.push(`  ${n.nodeId}: ${n.config.logic}(${inputs.join(', ')})`);
            }

            // Emit parameters
            if (gates.length > 0 && parameters.length > 0) lines.push('');
            for (const n of parameters) {
                lines.push(`  ${n.nodeId}: ${emitParameter(n)}`);
            }

            // Emit edges (non-gate-input edges, i.e., edges to PARAMETERs, VALIDATIONs, SUB_RULEs that aren't auto-created)
            const gateIds = new Set(gates.map(n => n.nodeId));
            const explicitEdges = edges.filter(e => !gateIds.has(e.targetNodeId));

            // Group by source + edgeType
            const edgeGroups = new Map<string, string[]>();
            for (const e of explicitEdges) {
                const typeStr = e.edgeType && e.edgeType !== 'DEFAULT' ? e.edgeType : '';
                const key = `${e.sourceNodeId}|${typeStr}`;
                if (!edgeGroups.has(key)) edgeGroups.set(key, []);
                edgeGroups.get(key)!.push(e.targetNodeId);
            }

            if (edgeGroups.size > 0) {
                lines.push('');
                for (const [key, targets] of edgeGroups) {
                    const [src, typeStr] = key.split('|');
                    const arrow = typeStr ? `->${typeStr}` : '->';
                    lines.push(`  ${src} ${arrow} ${targets.join(', ')}`);
                }
            }

            lines.push('}');
            lines.push('');
        }
    }

    return lines.join('\n');
}

function emitCondition(config: Record<string, any>): string {
    const field = config.field || config.expression || '???';
    const operator = REVERSE_OPERATOR_MAP[config.operator] || config.operator;
    const value = config.value;

    // Unary operators
    if (['IS_NULL', 'IS_NOT_NULL', 'IS_EMPTY', 'IS_NOT_EMPTY'].includes(config.operator)) {
        return `${field} ${config.operator}`;
    }

    // IN with lookup reference
    if (config._lookupRef) {
        return `${field} IN lookup("${config._lookupRef}")`;
    }
    if (typeof value === 'string' && value.startsWith('lookup:')) {
        return `${field} IN lookup("${value.replace('lookup:', '')}")`;
    }

    // IN with array
    if (config.operator === 'IN' || config.operator === 'NOT_IN') {
        if (Array.isArray(value)) {
            return `${field} ${config.operator} [${value.map(formatBaraValue).join(', ')}]`;
        }
    }

    // BETWEEN
    if (config.operator === 'BETWEEN' && Array.isArray(value)) {
        return `${field} BETWEEN [${value.map(formatBaraValue).join(', ')}]`;
    }

    // Standard binary
    return `${field} ${operator} ${formatBaraValue(value)}`;
}

function emitValidation(config: Record<string, any>): string {
    const field = config.field || '???';
    const operator = REVERSE_OPERATOR_MAP[config.operator] || config.operator;
    const value = config.value;
    const action = config.failureAction || 'STOP';

    // Unary operators
    if (['IS_NULL', 'IS_NOT_NULL', 'IS_EMPTY', 'IS_NOT_EMPTY'].includes(config.operator)) {
        return `VALIDATE ${field} ${config.operator} ${action}`;
    }

    return `VALIDATE ${field} ${operator} ${formatBaraValue(value)} ${action}`;
}

function emitSubRule(config: Record<string, any>): string {
    const ref = config.subRuleRef || {};
    if (ref.ruleNumber) {
        return `SUB_RULE("#${ref.ruleNumber}")`;
    }
    return `SUB_RULE("${ref.ruleUUID || ref.ruleId || '???'}")`;
}

function emitParameter(node: BaraNode): string {
    const cfg = node.config;
    let line = `PARAM ${cfg.target_field} ${cfg.param_type}`;

    if (cfg.required !== false) line += ' required';
    else line += ' optional';

    if (node.isDefault) line += ' default';

    if (cfg.lookupRef) {
        const ref = cfg.lookupRef.tableName || cfg.lookupRef.tableId || '';
        line += ` lookup("${ref}")`;
    }

    if (cfg.templateRef) {
        const ref = cfg.templateRef.templateName || cfg.templateRef.templateId || '';
        line += ` template("${ref}")`;
    }

    if (cfg.constraints && Object.keys(cfg.constraints).length > 0) {
        const pairs = Object.entries(cfg.constraints)
            .map(([k, v]) => `${k}: ${formatBaraValue(v)}`)
            .join(', ');
        line += ` { ${pairs} }`;
    }

    return line;
}

function formatBaraValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) return `[${value.map(formatBaraValue).join(', ')}]`;
    return JSON.stringify(value);
}

// ────────────────────────────────────────────
// Export
// ────────────────────────────────────────────

export default {
    parseBARA,
    emitBARA,
};
