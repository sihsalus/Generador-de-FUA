import BaseEntity, { BaseEntityInterface } from "./BaseEntity";

export type RuleType = 'CONSISTENCY' | 'VALIDATION' | 'FORMAT' | 'BUSINESS';

export interface RuleInterface extends BaseEntityInterface {
    ruleSetId?: number;
    ruleNumber: string;
    name: string;
    description?: string;
    ruleType: RuleType;
    enabled: boolean;
    priority: number;
}

class Rule extends BaseEntity {
    ruleSetId?: number;
    ruleNumber: string;
    name: string;
    description?: string;
    ruleType: RuleType;
    enabled: boolean;
    priority: number;

    constructor(data: RuleInterface) {
        super(data);
        this.ruleSetId = data.ruleSetId;
        this.ruleNumber = data.ruleNumber;
        this.name = data.name;
        this.description = data.description;
        this.ruleType = data.ruleType;
        this.enabled = data.enabled;
        this.priority = data.priority;
    }
}

export default Rule;
