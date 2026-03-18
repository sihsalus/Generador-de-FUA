import BaseEntity, { BaseEntityInterface } from "./BaseEntity";

export type NodeType = 'CONDITION' | 'GATE' | 'PARAMETER';

// --- CONDITION configs ---

export interface SimpleConditionConfig {
    field: string;
    operator: string;
    value?: any;
    data_type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'ENUM';
    value_type?: 'LITERAL' | 'FIELD_REF';
}

export interface ComputedConditionConfig {
    expression: string;
    operator: string;
    value: any;
    tolerance?: number;
    value_type?: 'LITERAL' | 'FIELD_REF';
}

export type ConditionConfig = SimpleConditionConfig | ComputedConditionConfig;

// --- GATE config ---

export interface GateConfig {
    logic: 'AND' | 'OR' | 'NOT' | 'XOR';
    short_circuit?: boolean;
}

// --- PARAMETER config ---

export interface ParameterConfig {
    target_field: string;
    param_type: 'STRING' | 'NUMBER' | 'ENUM' | 'DATE' | 'RANGE' | 'ARRAY' | 'BOOLEAN';
    required?: boolean;
    constraints: Record<string, any>;
    /**
     * Referencia opcional a una LookupTable.
     * Cuando está presente, los constraints se resuelven dinámicamente
     * desde la fila de la LookupTable cuyo keyValue coincida con
     * el valor del campo keyField en el dato evaluado.
     *
     * Los constraints de la fila se MEZCLAN con los constraints estáticos:
     * los valores de la LookupTable sobreescriben los estáticos.
     */
    lookupRef?: {
        /** UUID o ID de la LookupTable */
        tableId: string;
        /** Nombre de la LookupTable (alternativa a tableId, resuelto por nombre + ruleSetId) */
        tableName?: string;
    };
}

export type NodeConfig = ConditionConfig | GateConfig | ParameterConfig;

// --- Node entity ---

export interface RuleNodeInterface extends BaseEntityInterface {
    ruleId?: number;
    nodeId: string;
    nodeType: NodeType;
    config: NodeConfig;
    label?: string;
    isEntry: boolean;
    isDefault: boolean;
}

class RuleNode extends BaseEntity {
    ruleId?: number;
    nodeId: string;
    nodeType: NodeType;
    config: NodeConfig;
    label?: string;
    isEntry: boolean;
    isDefault: boolean;

    constructor(data: RuleNodeInterface) {
        super(data);
        this.ruleId = data.ruleId;
        this.nodeId = data.nodeId;
        this.nodeType = data.nodeType;
        this.config = data.config;
        this.label = data.label;
        this.isEntry = data.isEntry;
        this.isDefault = data.isDefault;
    }
}

export default RuleNode;
