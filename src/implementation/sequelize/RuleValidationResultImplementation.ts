import RuleValidationResultModel from '../../modelsSequelize/RuleValidationResultModel';
import { type RuleValidationRecord } from '../../ruleEngine/models/results';

class RuleValidationResultImplementation {

    async createSequelize(data: RuleValidationRecord & { createdBy: string }) {
        let record = null;
        try {
            record = await RuleValidationResultModel.create(data);
        } catch (err: any) {
            (err as Error).message =
                'Error in RuleValidationResult Implementation - createSequelize: ' + (err as Error).message;
            throw err;
        }
        return record;
    }

    async findByVisitUuid(visitUuid: string) {
        let records = [];
        try {
            records = await RuleValidationResultModel.findAll({
                where: { visit_uuid: visitUuid, active: true },
                order: [['createdAt', 'DESC']],
            });
        } catch (err: any) {
            (err as Error).message =
                `Error in RuleValidationResult Implementation - findByVisitUuid: ${(err as Error).message}`;
            throw err;
        }
        return records;
    }
}

export default new RuleValidationResultImplementation();
