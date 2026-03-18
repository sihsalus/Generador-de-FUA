import BaseEntity, { BaseEntityInterface } from "./BaseEntity";

export interface LookupTableInterface extends BaseEntityInterface {
    ruleSetId?: number;
    name: string;
    description?: string;
    keyField: string;
    columns: LookupColumnDef[];
}

/**
 * Define una columna de la lookup table.
 * Cada columna mapea a un target_field de un PARAMETER
 * y define qué constraint resuelve (minValue, maxValue, pattern, etc.)
 */
export interface LookupColumnDef {
    columnName: string;
    targetField: string;
    constraintKey: string;
    dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE';
}

class LookupTable extends BaseEntity {
    ruleSetId?: number;
    name: string;
    description?: string;
    keyField: string;
    columns: LookupColumnDef[];

    constructor(data: LookupTableInterface) {
        super(data);
        this.ruleSetId = data.ruleSetId;
        this.name = data.name;
        this.description = data.description;
        this.keyField = data.keyField;
        this.columns = data.columns;
    }
}

export default LookupTable;