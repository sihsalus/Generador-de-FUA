import BaseEntity, { BaseEntityInterface } from "./BaseEntity";

export interface RuleEdgeInterface extends BaseEntityInterface {
    ruleId?: number;
    sourceNodeId: string;
    targetNodeId: string;
    edgeOrder: number;
    label?: string;
}

class RuleEdge extends BaseEntity {
    ruleId?: number;
    sourceNodeId: string;
    targetNodeId: string;
    edgeOrder: number;
    label?: string;

    constructor(data: RuleEdgeInterface) {
        super(data);
        this.ruleId = data.ruleId;
        this.sourceNodeId = data.sourceNodeId;
        this.targetNodeId = data.targetNodeId;
        this.edgeOrder = data.edgeOrder;
        this.label = data.label;
    }
}

export default RuleEdge;
