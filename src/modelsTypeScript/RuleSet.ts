import BaseEntity, { BaseEntityInterface } from "./BaseEntity";

export interface RuleSetInterface extends BaseEntityInterface {
    name: string;
    description?: string;
    documentType: string;
    evaluationMode: 'ALL' | 'FIRST_MATCH';
}

class RuleSet extends BaseEntity {
    name: string;
    description?: string;
    documentType: string;
    evaluationMode: 'ALL' | 'FIRST_MATCH';

    constructor(data: RuleSetInterface) {
        super(data);
        this.name = data.name;
        this.description = data.description;
        this.documentType = data.documentType;
        this.evaluationMode = data.evaluationMode;
    }
}

export default RuleSet;
