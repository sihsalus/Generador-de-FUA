import { LookupTable, LookupTableRow } from "../../modelsSequelize";

class LookupTableImplementation {

    async createLookupTableSequelize(data: {
        RuleSetId: number;
        name: string;
        description?: string;
        keyField: string;
        columns: any[];
        createdBy: string;
    }) {
        return await LookupTable.create(data);
    }

    async listByRuleSetSequelize(ruleSetId: number) {
        return await LookupTable.findAll({
            where: { RuleSetId: ruleSetId, active: true },
            order: [['createdAt', 'DESC']],
        });
    }

    async getByIdSequelize(id: number) {
        return await LookupTable.findOne({ where: { id, active: true } });
    }

    async getByUUIDSequelize(uuid: string) {
        return await LookupTable.findOne({ where: { uuid, active: true } });
    }

    async getByNameSequelize(name: string) {
        return await LookupTable.findOne({ where: { name, active: true } });
    }

    async getByNameAndRuleSetSequelize(name: string, ruleSetId: number) {
        return await LookupTable.findOne({
            where: { name, RuleSetId: ruleSetId, active: true },
        });
    }

    /**
     * Obtiene una LookupTable completa con todas sus filas.
     */
    async getFullTableSequelize(id: number) {
        return await LookupTable.findOne({
            where: { id, active: true },
            include: [{
                model: LookupTableRow,
                where: { active: true },
                required: false,
            }],
        });
    }

    async updateLookupTableSequelize(id: number, data: Partial<{
        name: string;
        description: string;
        keyField: string;
        columns: any[];
        updatedBy: string;
    }>) {
        return await LookupTable.update(data, { where: { id, active: true } });
    }

    async softDeleteLookupTableSequelize(id: number, inactiveBy: string, inactiveReason?: string) {
        return await LookupTable.update(
            { active: false, inactiveBy, inactiveAt: new Date(), inactiveReason },
            { where: { id, active: true } },
        );
    }
}

export default new LookupTableImplementation();
