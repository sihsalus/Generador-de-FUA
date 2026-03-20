import { describe, expect, test } from '@jest/globals';
import { evaluateRule, EvalGraph, EvalNode, EvalEdge, getNestedValue } from './ruleEvaluator';

// ════════════════════════════════════════════
// Helpers para construir grafos de test
// ════════════════════════════════════════════

function condition(id: string, field: string, operator: string, value: any, extra?: Partial<EvalNode['config']>): EvalNode {
    return {
        nodeId: id, nodeType: 'CONDITION', isEntry: true, isDefault: false,
        config: { field, operator, value, ...extra },
    };
}

function gate(id: string, logic: string): EvalNode {
    return {
        nodeId: id, nodeType: 'GATE', isEntry: false, isDefault: false,
        config: { logic },
    };
}

function param(id: string, targetField: string, paramType: string, constraints: Record<string, any> = {}, opts?: { required?: boolean; isDefault?: boolean }): EvalNode {
    return {
        nodeId: id, nodeType: 'PARAMETER', isEntry: false, isDefault: opts?.isDefault ?? false,
        config: { target_field: targetField, param_type: paramType, constraints, required: opts?.required ?? true },
    };
}

function validation(id: string, field: string, operator: string, value: any, action: string): EvalNode {
    return {
        nodeId: id, nodeType: 'VALIDATION', isEntry: true, isDefault: false,
        config: { field, operator, value, failureAction: action },
    };
}

function edge(source: string, target: string, edgeType: 'DEFAULT' | 'TRUE' | 'FALSE' = 'DEFAULT', order = 1): EvalEdge {
    return { sourceNodeId: source, targetNodeId: target, edgeOrder: order, edgeType };
}

function makeGraph(nodes: EvalNode[], edges: EvalEdge[]): EvalGraph {
    return { nodes, edges };
}

// ════════════════════════════════════════════
// getNestedValue
// ════════════════════════════════════════════

describe('getNestedValue', () => {
    test('acceso simple', () => {
        expect(getNestedValue({ nombre: 'Juan' }, 'nombre')).toBe('Juan');
    });

    test('acceso anidado con dot notation', () => {
        expect(getNestedValue({ paciente: { edad: 30 } }, 'paciente.edad')).toBe(30);
    });

    test('acceso a array por índice', () => {
        expect(getNestedValue({ items: ['a', 'b', 'c'] }, 'items.1')).toBe('b');
    });

    test('campo inexistente retorna undefined', () => {
        expect(getNestedValue({ a: 1 }, 'b')).toBeUndefined();
    });

    test('path vacío retorna undefined', () => {
        expect(getNestedValue({ a: 1 }, '')).toBeUndefined();
    });

    test('objeto null retorna undefined', () => {
        expect(getNestedValue(null as any, 'a')).toBeUndefined();
    });

    test('acceso profundo inexistente no crashea', () => {
        expect(getNestedValue({ a: { b: 1 } }, 'a.c.d')).toBeUndefined();
    });
});

// ════════════════════════════════════════════
// Operadores de CONDITION
// ════════════════════════════════════════════

describe('Operadores de condición', () => {
    async function evalCondition(field: string, op: string, value: any, data: Record<string, any>, extra?: any) {
        const graph = makeGraph(
            [condition('C1', field, op, value, extra), param('P1', field, 'STRING', {}, { required: false })],
            [edge('C1', 'P1')],
        );
        const result = await evaluateRule(graph, data);
        const cDetail = result.nodeDetails.find(d => d.nodeId === 'C1');
        return cDetail?.result ?? false;
    }

    test('EQUALS string', async () => {
        expect(await evalCondition('tipo', 'EQUALS', 'A', { tipo: 'A' })).toBe(true);
        expect(await evalCondition('tipo', 'EQUALS', 'A', { tipo: 'B' })).toBe(false);
    });

    test('EQUALS case insensitive por defecto', async () => {
        expect(await evalCondition('tipo', 'EQUALS', 'abc', { tipo: 'ABC' })).toBe(true);
    });

    test('EQUALS number con data_type', async () => {
        expect(await evalCondition('edad', 'EQUALS', 30, { edad: '30' }, { data_type: 'NUMBER' })).toBe(true);
    });

    test('NOT_EQUALS', async () => {
        expect(await evalCondition('tipo', 'NOT_EQUALS', 'A', { tipo: 'B' })).toBe(true);
        expect(await evalCondition('tipo', 'NOT_EQUALS', 'A', { tipo: 'A' })).toBe(false);
    });

    test('GREATER_THAN', async () => {
        expect(await evalCondition('edad', 'GREATER_THAN', 18, { edad: 20 }, { data_type: 'NUMBER' })).toBe(true);
        expect(await evalCondition('edad', 'GREATER_THAN', 18, { edad: 18 }, { data_type: 'NUMBER' })).toBe(false);
    });

    test('GREATER_EQUAL', async () => {
        expect(await evalCondition('edad', 'GREATER_EQUAL', 18, { edad: 18 }, { data_type: 'NUMBER' })).toBe(true);
    });

    test('LESS_THAN', async () => {
        expect(await evalCondition('edad', 'LESS_THAN', 18, { edad: 10 }, { data_type: 'NUMBER' })).toBe(true);
    });

    test('LESS_EQUAL', async () => {
        expect(await evalCondition('edad', 'LESS_EQUAL', 18, { edad: 18 }, { data_type: 'NUMBER' })).toBe(true);
    });

    test('IN array', async () => {
        expect(await evalCondition('tipo', 'IN', ['A', 'B', 'C'], { tipo: 'B' })).toBe(true);
        expect(await evalCondition('tipo', 'IN', ['A', 'B', 'C'], { tipo: 'Z' })).toBe(false);
    });

    test('NOT_IN array', async () => {
        expect(await evalCondition('tipo', 'NOT_IN', ['A', 'B'], { tipo: 'C' })).toBe(true);
        expect(await evalCondition('tipo', 'NOT_IN', ['A', 'B'], { tipo: 'A' })).toBe(false);
    });

    test('BETWEEN', async () => {
        expect(await evalCondition('edad', 'BETWEEN', [10, 20], { edad: 15 }, { data_type: 'NUMBER' })).toBe(true);
        expect(await evalCondition('edad', 'BETWEEN', [10, 20], { edad: 25 }, { data_type: 'NUMBER' })).toBe(false);
        // Bordes inclusivos
        expect(await evalCondition('edad', 'BETWEEN', [10, 20], { edad: 10 }, { data_type: 'NUMBER' })).toBe(true);
        expect(await evalCondition('edad', 'BETWEEN', [10, 20], { edad: 20 }, { data_type: 'NUMBER' })).toBe(true);
    });

    test('CONTAINS', async () => {
        expect(await evalCondition('nombre', 'CONTAINS', 'uan', { nombre: 'Juan' })).toBe(true);
        expect(await evalCondition('nombre', 'CONTAINS', 'xyz', { nombre: 'Juan' })).toBe(false);
    });

    test('STARTS_WITH', async () => {
        expect(await evalCondition('nombre', 'STARTS_WITH', 'Ju', { nombre: 'Juan' })).toBe(true);
    });

    test('ENDS_WITH', async () => {
        expect(await evalCondition('nombre', 'ENDS_WITH', 'an', { nombre: 'Juan' })).toBe(true);
    });

    test('REGEX', async () => {
        expect(await evalCondition('dni', 'REGEX', '^[0-9]{8}$', { dni: '12345678' })).toBe(true);
        expect(await evalCondition('dni', 'REGEX', '^[0-9]{8}$', { dni: '1234' })).toBe(false);
    });

    test('IS_NULL / IS_NOT_NULL', async () => {
        expect(await evalCondition('campo', 'IS_NULL', null, { campo: null })).toBe(true);
        expect(await evalCondition('campo', 'IS_NULL', null, { campo: 'algo' })).toBe(false);
        expect(await evalCondition('campo', 'IS_NOT_NULL', null, { campo: 'algo' })).toBe(true);
        expect(await evalCondition('campo', 'IS_NOT_NULL', null, {})).toBe(false);
    });

    test('IS_EMPTY / IS_NOT_EMPTY', async () => {
        expect(await evalCondition('campo', 'IS_EMPTY', null, { campo: '' })).toBe(true);
        expect(await evalCondition('campo', 'IS_EMPTY', null, { campo: null })).toBe(true);
        expect(await evalCondition('campo', 'IS_EMPTY', null, {})).toBe(true);
        expect(await evalCondition('campo', 'IS_NOT_EMPTY', null, { campo: 'algo' })).toBe(true);
        expect(await evalCondition('campo', 'IS_NOT_EMPTY', null, { campo: '' })).toBe(false);
    });
});

// ════════════════════════════════════════════
// Gates (AND, OR, NOT, XOR)
// ════════════════════════════════════════════

describe('Gates lógicos', () => {
    test('AND: ambas true → true', async () => {
        const graph = makeGraph(
            [condition('C1', 'a', 'EQUALS', '1'), condition('C2', 'b', 'EQUALS', '2'), gate('G1', 'AND'), param('P1', 'a', 'STRING', {}, { required: false })],
            [edge('C1', 'G1', 'DEFAULT', 1), edge('C2', 'G1', 'DEFAULT', 2), edge('G1', 'P1')],
        );
        const r = await evaluateRule(graph, { a: '1', b: '2' });
        expect(r.nodeDetails.find(d => d.nodeId === 'G1')?.result).toBe(true);
    });

    test('AND: una false → false', async () => {
        const graph = makeGraph(
            [condition('C1', 'a', 'EQUALS', '1'), condition('C2', 'b', 'EQUALS', '2'), gate('G1', 'AND'), param('P1', 'a', 'STRING', {}, { required: false })],
            [edge('C1', 'G1', 'DEFAULT', 1), edge('C2', 'G1', 'DEFAULT', 2), edge('G1', 'P1')],
        );
        const r = await evaluateRule(graph, { a: '1', b: 'WRONG' });
        expect(r.nodeDetails.find(d => d.nodeId === 'G1')?.result).toBe(false);
    });

    test('OR: una true → true', async () => {
        const graph = makeGraph(
            [condition('C1', 'a', 'EQUALS', 'X'), condition('C2', 'b', 'EQUALS', '2'), gate('G1', 'OR'), param('P1', 'a', 'STRING', {}, { required: false })],
            [edge('C1', 'G1', 'DEFAULT', 1), edge('C2', 'G1', 'DEFAULT', 2), edge('G1', 'P1')],
        );
        const r = await evaluateRule(graph, { a: 'nope', b: '2' });
        expect(r.nodeDetails.find(d => d.nodeId === 'G1')?.result).toBe(true);
    });

    test('OR: ambas false → false', async () => {
        const graph = makeGraph(
            [condition('C1', 'a', 'EQUALS', 'X'), condition('C2', 'b', 'EQUALS', 'Y'), gate('G1', 'OR'), param('P1', 'a', 'STRING', {}, { required: false })],
            [edge('C1', 'G1', 'DEFAULT', 1), edge('C2', 'G1', 'DEFAULT', 2), edge('G1', 'P1')],
        );
        const r = await evaluateRule(graph, { a: 'nope', b: 'nope' });
        expect(r.nodeDetails.find(d => d.nodeId === 'G1')?.result).toBe(false);
    });

    test('NOT: invierte resultado', async () => {
        const graph = makeGraph(
            [condition('C1', 'a', 'EQUALS', 'X'), gate('G1', 'NOT'), param('P1', 'a', 'STRING', {}, { required: false })],
            [edge('C1', 'G1'), edge('G1', 'P1')],
        );
        const r = await evaluateRule(graph, { a: 'NOT_X' });
        expect(r.nodeDetails.find(d => d.nodeId === 'G1')?.result).toBe(true);
    });

    test('XOR: exactamente una true → true', async () => {
        const graph = makeGraph(
            [condition('C1', 'a', 'EQUALS', '1'), condition('C2', 'b', 'EQUALS', '2'), gate('G1', 'XOR'), param('P1', 'a', 'STRING', {}, { required: false })],
            [edge('C1', 'G1', 'DEFAULT', 1), edge('C2', 'G1', 'DEFAULT', 2), edge('G1', 'P1')],
        );
        // Solo C1 true
        const r = await evaluateRule(graph, { a: '1', b: 'WRONG' });
        expect(r.nodeDetails.find(d => d.nodeId === 'G1')?.result).toBe(true);
    });

    test('XOR: ambas true → false', async () => {
        const graph = makeGraph(
            [condition('C1', 'a', 'EQUALS', '1'), condition('C2', 'b', 'EQUALS', '2'), gate('G1', 'XOR'), param('P1', 'a', 'STRING', {}, { required: false })],
            [edge('C1', 'G1', 'DEFAULT', 1), edge('C2', 'G1', 'DEFAULT', 2), edge('G1', 'P1')],
        );
        const r = await evaluateRule(graph, { a: '1', b: '2' });
        expect(r.nodeDetails.find(d => d.nodeId === 'G1')?.result).toBe(false);
    });
});

// ════════════════════════════════════════════
// Decision trees (aristas TRUE/FALSE)
// ════════════════════════════════════════════

describe('Decision trees (aristas TRUE/FALSE)', () => {
    test('arista TRUE activa parámetro cuando condición es true', async () => {
        const graph = makeGraph(
            [condition('C1', 'tipo', 'EQUALS', 'HOSP'), param('P1', 'cama', 'STRING', { minLength: 1 }), param('P2', 'consultorio', 'STRING', { minLength: 1 })],
            [edge('C1', 'P1', 'TRUE'), edge('C1', 'P2', 'FALSE')],
        );
        const r = await evaluateRule(graph, { tipo: 'HOSP', cama: 'A1' });
        expect(r.activatedParameters).toContain('P1');
        expect(r.activatedParameters).not.toContain('P2');
    });

    test('arista FALSE activa parámetro cuando condición es false', async () => {
        const graph = makeGraph(
            [condition('C1', 'tipo', 'EQUALS', 'HOSP'), param('P1', 'cama', 'STRING', { minLength: 1 }), param('P2', 'consultorio', 'STRING', { minLength: 1 })],
            [edge('C1', 'P1', 'TRUE'), edge('C1', 'P2', 'FALSE')],
        );
        const r = await evaluateRule(graph, { tipo: 'AMBULATORIO', consultorio: 'C3' });
        expect(r.activatedParameters).toContain('P2');
        expect(r.activatedParameters).not.toContain('P1');
    });
});

// ════════════════════════════════════════════
// VALIDATION nodes (STOP / WARN)
// ════════════════════════════════════════════

describe('VALIDATION nodes', () => {
    test('VALIDATION STOP detiene evaluación cuando falla', async () => {
        const graph = makeGraph(
            [
                validation('V1', 'dni', 'REGEX', '^[0-9]{8}$', 'STOP'),
                param('P1', 'nombre', 'STRING', { minLength: 2 }),
            ],
            [edge('V1', 'P1')],
        );
        const r = await evaluateRule(graph, { dni: 'INVALIDO', nombre: 'Juan' });
        expect(r.isValid).toBe(false);
        expect(r.halted).toBe(true);
        expect(r.haltedByNodeId).toBe('V1');
        expect(r.activatedParameters).not.toContain('P1');
    });

    test('VALIDATION STOP no detiene cuando pasa', async () => {
        const graph = makeGraph(
            [
                validation('V1', 'dni', 'REGEX', '^[0-9]{8}$', 'STOP'),
                param('P1', 'nombre', 'STRING', { minLength: 2 }),
            ],
            [edge('V1', 'P1')],
        );
        const r = await evaluateRule(graph, { dni: '12345678', nombre: 'Juan' });
        expect(r.isValid).toBe(true);
        expect(r.halted).toBeFalsy();
        expect(r.activatedParameters).toContain('P1');
    });

    test('VALIDATION WARN registra warning pero continúa', async () => {
        const graph = makeGraph(
            [
                validation('V1', 'telefono', 'REGEX', '^[0-9]{9}$', 'WARN'),
                param('P1', 'nombre', 'STRING', { minLength: 2 }),
            ],
            [edge('V1', 'P1')],
        );
        const r = await evaluateRule(graph, { telefono: '123', nombre: 'Juan' });
        expect(r.isValid).toBe(true);
        expect(r.halted).toBeFalsy();
        expect(r.warnings.length).toBeGreaterThan(0);
        expect(r.activatedParameters).toContain('P1');
    });
});

// ════════════════════════════════════════════
// Validación de PARAMETERs por tipo
// ════════════════════════════════════════════

describe('Validación STRING', () => {
    async function evalString(value: any, constraints: Record<string, any>) {
        const graph = makeGraph(
            [condition('C1', 'x', 'IS_NOT_NULL', null), param('P1', 'campo', 'STRING', constraints)],
            [edge('C1', 'P1')],
        );
        return evaluateRule(graph, { x: 1, campo: value });
    }

    test('minLength', async () => {
        const r = await evalString('ab', { minLength: 3 });
        expect(r.isValid).toBe(false);
    });

    test('maxLength', async () => {
        const r = await evalString('abcdef', { maxLength: 3 });
        expect(r.isValid).toBe(false);
    });

    test('pattern válido', async () => {
        const r = await evalString('ABC123', { pattern: '^[A-Z0-9]+$' });
        expect(r.isValid).toBe(true);
    });

    test('pattern inválido', async () => {
        const r = await evalString('abc', { pattern: '^[A-Z]+$' });
        expect(r.isValid).toBe(false);
    });

    test('case UPPER válido', async () => {
        const r = await evalString('HOLA', { case: 'UPPER' });
        expect(r.isValid).toBe(true);
    });

    test('case UPPER inválido', async () => {
        const r = await evalString('Hola', { case: 'UPPER' });
        expect(r.isValid).toBe(false);
    });

    test('trim aplica antes de validar', async () => {
        const r = await evalString('  AB  ', { trim: true, minLength: 2, maxLength: 2 });
        expect(r.isValid).toBe(true);
    });

    test('required falla con vacío', async () => {
        const graph = makeGraph(
            [condition('C1', 'x', 'IS_NOT_NULL', null), param('P1', 'campo', 'STRING', {})],
            [edge('C1', 'P1')],
        );
        const r = await evaluateRule(graph, { x: 1, campo: '' });
        expect(r.isValid).toBe(false);
    });
});

describe('Validación NUMBER', () => {
    async function evalNumber(value: any, constraints: Record<string, any>) {
        const graph = makeGraph(
            [condition('C1', 'x', 'IS_NOT_NULL', null), param('P1', 'campo', 'NUMBER', constraints)],
            [edge('C1', 'P1')],
        );
        return evaluateRule(graph, { x: 1, campo: value });
    }

    test('minValue', async () => {
        const r = await evalNumber(5, { minValue: 10 });
        expect(r.isValid).toBe(false);
    });

    test('maxValue', async () => {
        const r = await evalNumber(100, { maxValue: 50 });
        expect(r.isValid).toBe(false);
    });

    test('rango válido', async () => {
        const r = await evalNumber(25, { minValue: 0, maxValue: 100 });
        expect(r.isValid).toBe(true);
    });

    test('isInteger falla con decimal', async () => {
        const r = await evalNumber(3.5, { isInteger: true });
        expect(r.isValid).toBe(false);
    });

    test('isInteger pasa con entero', async () => {
        const r = await evalNumber(3, { isInteger: true });
        expect(r.isValid).toBe(true);
    });

    test('allowNegative false', async () => {
        const r = await evalNumber(-5, { allowNegative: false });
        expect(r.isValid).toBe(false);
    });

    test('allowZero false', async () => {
        const r = await evalNumber(0, { allowZero: false });
        expect(r.isValid).toBe(false);
    });

    test('decimals max', async () => {
        const r = await evalNumber(3.1415, { decimals: 2 });
        expect(r.isValid).toBe(false);
    });

    test('no numérico falla', async () => {
        const r = await evalNumber('abc', {});
        expect(r.isValid).toBe(false);
    });
});

describe('Validación ENUM', () => {
    async function evalEnum(value: any, constraints: Record<string, any>) {
        const graph = makeGraph(
            [condition('C1', 'x', 'IS_NOT_NULL', null), param('P1', 'campo', 'ENUM', constraints)],
            [edge('C1', 'P1')],
        );
        return evaluateRule(graph, { x: 1, campo: value });
    }

    test('valor en lista', async () => {
        const r = await evalEnum('A', { values: ['A', 'B', 'C'] });
        expect(r.isValid).toBe(true);
    });

    test('valor fuera de lista', async () => {
        const r = await evalEnum('Z', { values: ['A', 'B', 'C'] });
        expect(r.isValid).toBe(false);
    });

    test('case insensitive por defecto', async () => {
        const r = await evalEnum('a', { values: ['A', 'B'] });
        expect(r.isValid).toBe(true);
    });

    test('allowedSex A permite F y M', async () => {
        const rF = await evalEnum('F', { allowedSex: 'A' });
        const rM = await evalEnum('M', { allowedSex: 'A' });
        expect(rF.isValid).toBe(true);
        expect(rM.isValid).toBe(true);
    });

    test('allowedSex F solo permite F', async () => {
        const rF = await evalEnum('F', { allowedSex: 'F' });
        const rM = await evalEnum('M', { allowedSex: 'F' });
        expect(rF.isValid).toBe(true);
        expect(rM.isValid).toBe(false);
    });

    test('allowedSex M solo permite M', async () => {
        const rM = await evalEnum('M', { allowedSex: 'M' });
        const rF = await evalEnum('F', { allowedSex: 'M' });
        expect(rM.isValid).toBe(true);
        expect(rF.isValid).toBe(false);
    });
});

describe('Validación DATE', () => {
    async function evalDate(value: any, constraints: Record<string, any>) {
        const graph = makeGraph(
            [condition('C1', 'x', 'IS_NOT_NULL', null), param('P1', 'campo', 'DATE', constraints)],
            [edge('C1', 'P1')],
        );
        return evaluateRule(graph, { x: 1, campo: value });
    }

    test('fecha válida pasa', async () => {
        const r = await evalDate('2024-06-15', {});
        expect(r.isValid).toBe(true);
    });

    test('fecha inválida falla', async () => {
        const r = await evalDate('no-es-fecha', {});
        expect(r.isValid).toBe(false);
    });

    test('allowFuture false rechaza fecha futura', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const r = await evalDate(futureDate.toISOString(), { allowFuture: false });
        expect(r.isValid).toBe(false);
    });

    test('minDate rechaza fecha anterior', async () => {
        const r = await evalDate('2020-01-01', { minDate: '2023-01-01' });
        expect(r.isValid).toBe(false);
    });

    test('maxDate rechaza fecha posterior', async () => {
        const r = await evalDate('2025-12-31', { maxDate: '2024-01-01' });
        expect(r.isValid).toBe(false);
    });

    test('TODAY como maxDate', async () => {
        const r = await evalDate('2020-01-01', { maxDate: 'TODAY' });
        expect(r.isValid).toBe(true);
    });
});

describe('Validación BOOLEAN', () => {
    async function evalBool(value: any, constraints: Record<string, any>) {
        const graph = makeGraph(
            [condition('C1', 'x', 'IS_NOT_NULL', null), param('P1', 'campo', 'BOOLEAN', constraints)],
            [edge('C1', 'P1')],
        );
        return evaluateRule(graph, { x: 1, campo: value });
    }

    test('equals true pasa con true', async () => {
        const r = await evalBool(true, { equals: true });
        expect(r.isValid).toBe(true);
    });

    test('equals true falla con false', async () => {
        const r = await evalBool(false, { equals: true });
        expect(r.isValid).toBe(false);
    });

    test('equals false pasa con false', async () => {
        const r = await evalBool(false, { equals: false });
        expect(r.isValid).toBe(true);
    });

    test('tolerancia: "si" se convierte a true', async () => {
        const r = await evalBool('si', { equals: true });
        expect(r.isValid).toBe(true);
    });

    test('tolerancia: "sí" se convierte a true', async () => {
        const r = await evalBool('sí', { equals: true });
        expect(r.isValid).toBe(true);
    });

    test('tolerancia: "1" se convierte a true', async () => {
        const r = await evalBool('1', { equals: true });
        expect(r.isValid).toBe(true);
    });

    test('tolerancia: "0" se convierte a false', async () => {
        const r = await evalBool('0', { equals: false });
        expect(r.isValid).toBe(true);
    });

    test('allowNull false falla con null', async () => {
        const graph = makeGraph(
            [condition('C1', 'x', 'IS_NOT_NULL', null), param('P1', 'campo', 'BOOLEAN', { allowNull: false }, { required: false })],
            [edge('C1', 'P1')],
        );
        const r = await evaluateRule(graph, { x: 1, campo: null });
        expect(r.isValid).toBe(false);
    });
});

describe('Validación RANGE', () => {
    async function evalRange(value: any, constraints: Record<string, any>) {
        const graph = makeGraph(
            [condition('C1', 'x', 'IS_NOT_NULL', null), param('P1', 'campo', 'RANGE', constraints)],
            [edge('C1', 'P1')],
        );
        return evaluateRule(graph, { x: 1, campo: value });
    }

    test('rango válido', async () => {
        const r = await evalRange([10, 50], { minValueLower: 0, maxValueUpper: 100 });
        expect(r.isValid).toBe(true);
    });

    test('lower >= upper falla', async () => {
        const r = await evalRange([50, 10], {});
        expect(r.isValid).toBe(false);
    });

    test('no array falla', async () => {
        const r = await evalRange('no-rango', {});
        expect(r.isValid).toBe(false);
    });
});

describe('Validación ARRAY', () => {
    async function evalArray(value: any, constraints: Record<string, any>) {
        const graph = makeGraph(
            [condition('C1', 'x', 'IS_NOT_NULL', null), param('P1', 'campo', 'ARRAY', constraints)],
            [edge('C1', 'P1')],
        );
        return evaluateRule(graph, { x: 1, campo: value });
    }

    test('minItems', async () => {
        const r = await evalArray([1], { minItems: 3 });
        expect(r.isValid).toBe(false);
    });

    test('maxItems', async () => {
        const r = await evalArray([1, 2, 3, 4, 5], { maxItems: 3 });
        expect(r.isValid).toBe(false);
    });

    test('uniqueItems falla con duplicados', async () => {
        const r = await evalArray([1, 2, 2], { uniqueItems: true });
        expect(r.isValid).toBe(false);
    });

    test('uniqueItems pasa sin duplicados', async () => {
        const r = await evalArray([1, 2, 3], { uniqueItems: true });
        expect(r.isValid).toBe(true);
    });

    test('no array falla', async () => {
        const r = await evalArray('no-array', {});
        expect(r.isValid).toBe(false);
    });
});

// ════════════════════════════════════════════
// Flujo completo: grafo con condiciones → gate → parámetros
// ════════════════════════════════════════════

describe('Flujo completo del evaluador', () => {
    test('C1 + C2 → AND(G1) → P1, P2: dato válido', async () => {
        const graph = makeGraph(
            [
                condition('C1', 'nombre', 'IS_NOT_EMPTY', null),
                condition('C2', 'edad', 'GREATER_EQUAL', 0, { data_type: 'NUMBER' }),
                gate('G1', 'AND'),
                param('P1', 'nombre', 'STRING', { minLength: 2, maxLength: 100 }),
                param('P2', 'edad', 'NUMBER', { minValue: 0, maxValue: 150, isInteger: true }),
            ],
            [
                edge('C1', 'G1', 'DEFAULT', 1),
                edge('C2', 'G1', 'DEFAULT', 2),
                edge('G1', 'P1'),
                edge('G1', 'P2'),
            ],
        );
        const r = await evaluateRule(graph, { nombre: 'JUAN PEREZ', edad: 30 });
        expect(r.isValid).toBe(true);
        expect(r.activatedParameters).toContain('P1');
        expect(r.activatedParameters).toContain('P2');
        expect(r.errors).toHaveLength(0);
    });

    test('condición no cumplida → parámetros no se activan', async () => {
        const graph = makeGraph(
            [
                condition('C1', 'tipo', 'EQUALS', 'SIS'),
                gate('G1', 'AND'),
                param('P1', 'nombre', 'STRING', { minLength: 2 }),
            ],
            [edge('C1', 'G1'), edge('G1', 'P1')],
        );
        const r = await evaluateRule(graph, { tipo: 'PRIVADO', nombre: 'Juan' });
        expect(r.isValid).toBe(true); // sin parámetros activados = válido
        expect(r.activatedParameters).toHaveLength(0);
    });

    test('parámetro con required falla cuando dato ausente', async () => {
        const graph = makeGraph(
            [
                condition('C1', 'x', 'IS_NOT_NULL', null),
                param('P1', 'nombre', 'STRING', { minLength: 2 }),
            ],
            [edge('C1', 'P1')],
        );
        const r = await evaluateRule(graph, { x: 1 }); // nombre ausente
        expect(r.isValid).toBe(false);
    });

    test('parámetro optional no falla cuando dato ausente', async () => {
        const graph = makeGraph(
            [
                condition('C1', 'x', 'IS_NOT_NULL', null),
                param('P1', 'nombre', 'STRING', {}, { required: false }),
            ],
            [edge('C1', 'P1')],
        );
        const r = await evaluateRule(graph, { x: 1 }); // nombre ausente
        expect(r.isValid).toBe(true);
    });

    test('resultado incluye executionTimeMs', async () => {
        const graph = makeGraph(
            [condition('C1', 'x', 'IS_NOT_NULL', null), param('P1', 'x', 'STRING', {}, { required: false })],
            [edge('C1', 'P1')],
        );
        const r = await evaluateRule(graph, { x: 'a' });
        expect(typeof r.executionTimeMs).toBe('number');
        expect(r.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
});

// ════════════════════════════════════════════
// Caso salud: edad_en_dias con rango por código prestacional
// ════════════════════════════════════════════

describe('Caso salud: validación de edad por código prestacional', () => {
    test('edad válida para código 301 (0-4374 días)', async () => {
        const graph = makeGraph(
            [
                condition('C1', 'codigo', 'IN', ['301', '302']),
                gate('G1', 'AND'),
                param('P1', 'edad_en_dias', 'NUMBER', { minValue: 0, maxValue: 4374, isInteger: true, allowNegative: false }),
            ],
            [edge('C1', 'G1'), edge('G1', 'P1')],
        );
        const r = await evaluateRule(graph, { codigo: '301', edad_en_dias: 3000 });
        expect(r.isValid).toBe(true);
    });

    test('edad fuera de rango falla', async () => {
        const graph = makeGraph(
            [
                condition('C1', 'codigo', 'IN', ['301']),
                gate('G1', 'AND'),
                param('P1', 'edad_en_dias', 'NUMBER', { minValue: 0, maxValue: 4374, isInteger: true }),
            ],
            [edge('C1', 'G1'), edge('G1', 'P1')],
        );
        const r = await evaluateRule(graph, { codigo: '301', edad_en_dias: 5000 });
        expect(r.isValid).toBe(false);
        expect(r.errors.some(e => e.field === 'edad_en_dias')).toBe(true);
    });

    test('código no reconocido no activa validación', async () => {
        const graph = makeGraph(
            [
                condition('C1', 'codigo', 'IN', ['301', '302']),
                gate('G1', 'AND'),
                param('P1', 'edad_en_dias', 'NUMBER', { minValue: 0, maxValue: 4374 }),
            ],
            [edge('C1', 'G1'), edge('G1', 'P1')],
        );
        const r = await evaluateRule(graph, { codigo: '999', edad_en_dias: 99999 });
        expect(r.isValid).toBe(true); // no se activó ningún parámetro
        expect(r.activatedParameters).toHaveLength(0);
    });
});
