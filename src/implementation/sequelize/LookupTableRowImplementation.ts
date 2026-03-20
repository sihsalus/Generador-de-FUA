import { LookupTableRow } from "../../modelsSequelize";

class LookupTableRowImplementation {

    async createRowSequelize(data: {
        LookupTableId: number;
        keyValue: string | Record<string, any>;
        values: Record<string, any>;
        createdBy: string;
    }) {
        return await LookupTableRow.create(data);
    }

    async bulkCreateRowsSequelize(rows: Array<{
        LookupTableId: number;
        keyValue: string | Record<string, any>;
        values: Record<string, any>;
        createdBy: string;
    }>) {
        return await LookupTableRow.bulkCreate(rows);
    }

    async listByTableIdSequelize(lookupTableId: number) {
        return await LookupTableRow.findAll({
            where: { LookupTableId: lookupTableId, active: true },
            order: [['keyValue', 'ASC']],
        });
    }

    async getByIdSequelize(id: number) {
        return await LookupTableRow.findOne({ where: { id, active: true } });
    }

    async getByKeyValueSequelize(lookupTableId: number, keyValue: string | Record<string, any>) {
        return await LookupTableRow.findOne({
            where: { LookupTableId: lookupTableId, keyValue, active: true },
        });
    }

    /**
     * Busca una fila por clave compuesta (objeto JSONB).
     */
    async getByCompositeKeySequelize(lookupTableId: number, compositeKey: Record<string, string>) {
        return await LookupTableRow.findOne({
            where: { LookupTableId: lookupTableId, keyValue: compositeKey, active: true },
        });
    }

    async updateRowSequelize(id: number, data: Partial<{
        keyValue: string;
        values: Record<string, any>;
        updatedBy: string;
    }>) {
        return await LookupTableRow.update(data, { where: { id, active: true } });
    }

    async softDeleteRowSequelize(id: number, inactiveBy: string) {
        return await LookupTableRow.update(
            { active: false, inactiveBy, inactiveAt: new Date() },
            { where: { id, active: true } },
        );
    }

    async softDeleteRowsByTableIdSequelize(lookupTableId: number, inactiveBy: string) {
        return await LookupTableRow.update(
            { active: false, inactiveBy, inactiveAt: new Date() },
            { where: { LookupTableId: lookupTableId, active: true } },
        );
    }
}

export default new LookupTableRowImplementation();
