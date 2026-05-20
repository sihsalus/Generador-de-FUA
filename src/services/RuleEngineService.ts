import EntityScriptModel from '../modelsSequelize/EntityScriptModel';
import { ScriptExecutorService } from './ScriptExecutorService';
import { ValidationContext } from '../ruleEngine/models/context';
import {
    type RuleResult,
    RuleResultSchema,
    consolidateResults,
    toRuleValidationRecord,
} from '../ruleEngine/models/results';
import RuleValidationResultImplementation from '../implementation/sequelize/RuleValidationResultImplementation';
import { type VisitPayload } from '../ruleEngine/models/visitPayload';

const TARGET_ENTITY = 'FUARule';

class RuleEngineService {

    async validate(visitPayload: VisitPayload, executedBy: string) {
        const context = new ValidationContext({ visit: visitPayload });

        const rules = await this.loadRules();

        const startTime = Date.now();
        const ruleResults: RuleResult[] = [];

        for (const rule of rules) {
            const result = this.executeRule(rule, context);
            if (result !== null) {
                ruleResults.push(result);
            }
        }

        const executionTimeMs = Date.now() - startTime;
        const validationResult = consolidateResults(visitPayload.uuid, ruleResults);
        const record = toRuleValidationRecord(validationResult, rules.length, executionTimeMs);

        await RuleValidationResultImplementation.createSequelize({
            ...record,
            createdBy: executedBy,
        });

        return validationResult;
    }

    private async loadRules() {
        let rules: any[] = [];
        try {
            rules = await EntityScriptModel.findAll({
                where: { targetEntity: TARGET_ENTITY, active: true },
                order: [['name', 'ASC']],
            });
        } catch (err: any) {
            (err as Error).message =
                'Error in RuleEngineService - loadRules: ' + (err as Error).message;
            throw err;
        }
        return rules;
    }

    private executeRule(rule: any, context: ValidationContext): RuleResult | null {
        // El script recibe:
        //   entity  → objeto donde escribe el RuleResult
        //   payload → { visit, fua, patient_details, edad_calculada }
        const payload = {
            visit: context.visit,
            fua: context.visit.fua,
            patient_details: context.visit.patient_details,
            edad_calculada: context.edad_calculada.toJSON(),
        };

        const execution = ScriptExecutorService.execute({
            entity: {},
            payload,
            script: rule.scriptContent,
            maxChars: rule.maxChars,
            maxTimeMs: rule.maxTimeMs,
        });

        if (!execution.success || !execution.entity) {
            // Script fallido → BLOCK automático para no silenciar errores
            return {
                rule_id: String(rule.uuid),
                rule_name: rule.name,
                passed: false,
                action: 'BLOCK',
                message: execution.error ?? 'Script execution failed',
            };
        }

        const parsed = RuleResultSchema.safeParse(execution.entity);
        if (!parsed.success) {
            // El script no retornó un RuleResult válido → BLOCK
            return {
                rule_id: String(rule.uuid),
                rule_name: rule.name,
                passed: false,
                action: 'BLOCK',
                message: 'Script did not return a valid RuleResult',
            };
        }

        return parsed.data;
    }
}

export default new RuleEngineService();
