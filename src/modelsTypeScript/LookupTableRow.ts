import BaseEntity, { BaseEntityInterface } from "./BaseEntity";

export interface LookupTableRowInterface extends BaseEntityInterface {
    lookupTableId?: number;
    keyValue: string;
    values: Record<string, any>;
}

/**
 * Cada fila de una LookupTable.
 * - keyValue: el valor discriminador (ej: "301", "302", etc.)
 * - values: objeto JSONB donde las keys son columnName y los values
 *   son los valores concretos de constraints para esa fila.
 *   Ej: { "edad_min": 0, "edad_max": 4374, "hospitalizado": false }
 */
class LookupTableRow extends BaseEntity {
    lookupTableId?: number;
    keyValue: string;
    values: Record<string, any>;

    constructor(data: LookupTableRowInterface) {
        super(data);
        this.lookupTableId = data.lookupTableId;
        this.keyValue = data.keyValue;
        this.values = data.values;
    }
}

export default LookupTableRow;