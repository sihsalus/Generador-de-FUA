import { RuleEdge } from "../../modelsSequelize";

class RuleEdgeImplementation {
    async createEdgeSequelize(data: {
        RuleId: number;
        sourceNodeId: string;
        targetNodeId: string;
        edgeOrder?: number;
        label?: string;
        createdBy?: string;
    }) {
        return await RuleEdge.create(data);
    }

    async bulkCreateEdgesSequelize(edges: Array<{
        RuleId: number;
        sourceNodeId: string;
        targetNodeId: string;
        edgeOrder?: number;
        label?: string;
        createdBy?: string;
    }>) {
        return await RuleEdge.bulkCreate(edges);
    }

    async listEdgesByRuleIdSequelize(ruleId: number) {
        return await RuleEdge.findAll({
            where: { RuleId: ruleId, active: true },
            order: [['edgeOrder', 'ASC']],
        });
    }

    async getEdgeByIdSequelize(id: number) {
        return await RuleEdge.findOne({ where: { id, active: true } });
    }

    async updateEdgeSequelize(id: number, data: Partial<{
        sourceNodeId: string;
        targetNodeId: string;
        edgeOrder: number;
        label: string;
        updatedBy: string;
    }>) {
        return await RuleEdge.update(data, { where: { id, active: true } });
    }

    async softDeleteEdgeSequelize(id: number, inactiveBy: string, inactiveReason?: string) {
        return await RuleEdge.update(
            { active: false, inactiveBy, inactiveAt: new Date(), inactiveReason },
            { where: { id, active: true } },
        );
    }

    async softDeleteEdgesByRuleIdSequelize(ruleId: number, inactiveBy: string) {
        return await RuleEdge.update(
            { active: false, inactiveBy, inactiveAt: new Date() },
            { where: { RuleId: ruleId, active: true } },
        );
    }

    async softDeleteEdgesByNodeIdSequelize(nodeId: string, ruleId: number, inactiveBy: string) {
        const { Op } = require('sequelize');
        return await RuleEdge.update(
            { active: false, inactiveBy, inactiveAt: new Date() },
            {
                where: {
                    RuleId: ruleId,
                    active: true,
                    [Op.or]: [
                        { sourceNodeId: nodeId },
                        { targetNodeId: nodeId },
                    ],
                },
            },
        );
    }
}

export default new RuleEdgeImplementation();
