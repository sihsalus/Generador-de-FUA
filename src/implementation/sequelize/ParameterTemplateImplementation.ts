import { ParameterTemplate } from "../../modelsSequelize";

class ParameterTemplateImplementation {

    async createTemplateSequelize(data: {
        RuleSetId: number;
        name: string;
        description?: string;
        paramType: string;
        constraints: Record<string, any>;
        required: boolean;
        createdBy: string;
    }) {
        return await ParameterTemplate.create(data);
    }

    async listByRuleSetSequelize(ruleSetId: number) {
        return await ParameterTemplate.findAll({
            where: { RuleSetId: ruleSetId, active: true },
            order: [['name', 'ASC']],
        });
    }

    async getByIdSequelize(id: number) {
        return await ParameterTemplate.findOne({ where: { id, active: true } });
    }

    async getByUUIDSequelize(uuid: string) {
        return await ParameterTemplate.findOne({ where: { uuid, active: true } });
    }

    async getByNameAndRuleSetSequelize(name: string, ruleSetId: number) {
        return await ParameterTemplate.findOne({
            where: { name, RuleSetId: ruleSetId, active: true },
        });
    }

    async updateTemplateSequelize(id: number, data: Partial<{
        name: string;
        description: string;
        paramType: string;
        constraints: Record<string, any>;
        required: boolean;
        updatedBy: string;
    }>) {
        return await ParameterTemplate.update(data, { where: { id, active: true } });
    }

    async softDeleteTemplateSequelize(id: number, inactiveBy: string, inactiveReason?: string) {
        return await ParameterTemplate.update(
            { active: false, inactiveBy, inactiveAt: new Date(), inactiveReason },
            { where: { id, active: true } },
        );
    }
}

export default new ParameterTemplateImplementation();
