import { Rule, RuleNode, RuleEdge } from "../../modelsSequelize";

class RuleImplementation {
    async createRuleSequelize(data: {
        RuleSetId: number;
        ruleNumber: string;
        name: string;
        description?: string;
        ruleType: string;
        enabled?: boolean;
        priority?: number;
        createdBy?: string;
    }) {
        return await Rule.create(data);
    }

    async listRulesByRuleSetIdSequelize(ruleSetId: number) {
        return await Rule.findAll({
            where: { RuleSetId: ruleSetId, active: true },
            order: [['priority', 'ASC']],
        });
    }

    async getRuleByIdSequelize(id: number) {
        return await Rule.findOne({ where: { id, active: true } });
    }

    async getRuleByUUIDSequelize(uuid: string) {
        return await Rule.findOne({ where: { uuid, active: true } });
    }

    /**
     * Obtiene una regla con todo su grafo (nodos y aristas)
     */
    async getFullRuleSequelize(id: number) {
        return await Rule.findOne({
            where: { id, active: true },
            include: [
                { model: RuleNode, where: { active: true }, required: false },
                { model: RuleEdge, where: { active: true }, required: false },
            ],
        });
    }

    async getFullRuleByUUIDSequelize(uuid: string) {
        return await Rule.findOne({
            where: { uuid, active: true },
            include: [
                { model: RuleNode, where: { active: true }, required: false },
                { model: RuleEdge, where: { active: true }, required: false },
            ],
        });
    }

    async updateRuleSequelize(id: number, data: Partial<{
        ruleNumber: string;
        name: string;
        description: string;
        ruleType: string;
        enabled: boolean;
        priority: number;
        updatedBy: string;
    }>) {
        return await Rule.update(data, { where: { id, active: true } });
    }

    async softDeleteRuleSequelize(id: number, inactiveBy: string, inactiveReason?: string) {
        return await Rule.update(
            { active: false, inactiveBy, inactiveAt: new Date(), inactiveReason },
            { where: { id, active: true } },
        );
    }

    async checkDuplicateRuleNumber(ruleSetId: number, ruleNumber: string, excludeId?: number) {
        const where: any = { RuleSetId: ruleSetId, ruleNumber, active: true };
        if (excludeId) where.id = { [require('sequelize').Op.ne]: excludeId };
        return await Rule.findOne({ where });
    }
}

export default new RuleImplementation();
