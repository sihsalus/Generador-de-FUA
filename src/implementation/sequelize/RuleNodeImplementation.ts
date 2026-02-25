import { RuleNode } from "../../modelsSequelize";

class RuleNodeImplementation {
    async createNodeSequelize(data: {
        RuleId: number;
        nodeId: string;
        nodeType: string;
        config: Record<string, any>;
        label?: string;
        isEntry?: boolean;
        isDefault?: boolean;
        createdBy?: string;
    }) {
        return await RuleNode.create(data);
    }

    async bulkCreateNodesSequelize(nodes: Array<{
        RuleId: number;
        nodeId: string;
        nodeType: string;
        config: Record<string, any>;
        label?: string;
        isEntry?: boolean;
        isDefault?: boolean;
        createdBy?: string;
    }>) {
        return await RuleNode.bulkCreate(nodes);
    }

    async listNodesByRuleIdSequelize(ruleId: number) {
        return await RuleNode.findAll({
            where: { RuleId: ruleId, active: true },
            order: [['nodeId', 'ASC']],
        });
    }

    async getNodeByIdSequelize(id: number) {
        return await RuleNode.findOne({ where: { id, active: true } });
    }

    async getNodeByNodeIdAndRuleSequelize(nodeId: string, ruleId: number) {
        return await RuleNode.findOne({
            where: { nodeId, RuleId: ruleId, active: true },
        });
    }

    async updateNodeSequelize(id: number, data: Partial<{
        nodeId: string;
        nodeType: string;
        config: Record<string, any>;
        label: string;
        isEntry: boolean;
        isDefault: boolean;
        updatedBy: string;
    }>) {
        return await RuleNode.update(data, { where: { id, active: true } });
    }

    async softDeleteNodeSequelize(id: number, inactiveBy: string, inactiveReason?: string) {
        return await RuleNode.update(
            { active: false, inactiveBy, inactiveAt: new Date(), inactiveReason },
            { where: { id, active: true } },
        );
    }

    async softDeleteNodesByRuleIdSequelize(ruleId: number, inactiveBy: string) {
        return await RuleNode.update(
            { active: false, inactiveBy, inactiveAt: new Date() },
            { where: { RuleId: ruleId, active: true } },
        );
    }
}

export default new RuleNodeImplementation();
