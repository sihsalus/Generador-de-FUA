import { RuleSet } from "../../modelsSequelize";

class RuleSetImplementation {
    async createRuleSetSequelize(data: {
        name: string;
        description?: string;
        documentType: string;
        evaluationMode: string;
        createdBy?: string;
    }) {
        return await RuleSet.create(data);
    }

    async listAllRuleSetsSequelize() {
        return await RuleSet.findAll({
            where: { active: true },
            order: [['createdAt', 'DESC']],
        });
    }

    async getRuleSetByIdSequelize(id: number) {
        return await RuleSet.findOne({ where: { id, active: true } });
    }

    async getRuleSetByUUIDSequelize(uuid: string) {
        return await RuleSet.findOne({ where: { uuid, active: true } });
    }

    async updateRuleSetSequelize(id: number, data: Partial<{
        name: string;
        description: string;
        documentType: string;
        evaluationMode: string;
        updatedBy: string;
    }>) {
        return await RuleSet.update(data, { where: { id, active: true } });
    }

    async softDeleteRuleSetSequelize(id: number, inactiveBy: string, inactiveReason?: string) {
        return await RuleSet.update(
            { active: false, inactiveBy, inactiveAt: new Date(), inactiveReason },
            { where: { id, active: true } },
        );
    }
}

export default new RuleSetImplementation();
