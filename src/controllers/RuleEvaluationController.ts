import { Request, Response } from 'express';
import RuleEvaluationService from '../services/RuleEvaluationService';
import { Log } from '../middleware/logger/models/typescript/Log';
import { loggerInstance } from '../middleware/logger/models/typescript/Logger';
import { Logger_LogLevel } from '../middleware/logger/models/typescript/LogLevel';
import { Logger_SecurityLevel } from '../middleware/logger/models/typescript/SecurityLevel';
import { Logger_LogType } from '../middleware/logger/models/typescript/LogType';
import { TargetSpec } from '../middleware/logger/models/typescript/Target';

const LOG_TARGETS: TargetSpec[] = [
    { name: 'terminal' },
    { name: 'file', file: 'logs/auxLog.log' },
    { name: 'database' },
];

const RuleEvaluationController = {

    async evaluateRule(req: Request, res: Response): Promise<void> {
        try {
            const ruleId = req.params.ruleId as string;
            const data = req.body.data;

            if (!data || typeof data !== 'object') {
                res.status(400).json({
                    error: 'Se requiere un campo "data" con el objeto a evaluar',
                });
                return;
            }

            const result = await RuleEvaluationService.evaluateRule(ruleId, data);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.SYSTEM,
                environmentType: loggerInstance.enviroment.toString(),
                description: `Evaluating Rule '${ruleId}' Successful`,
            }), LOG_TARGETS);
            res.status(200).json(result);
        } catch (err: any) {
            const status = err.status || 500;
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.SYSTEM,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? err.message + '\n' : '') + (err.details ?? ''),
            }), LOG_TARGETS);
            res.status(status).json({
                error: 'Error evaluando regla',
                message: err.message,
                details: err.details ?? null,
            });
        }
    },

    async evaluateRuleSet(req: Request, res: Response): Promise<void> {
        try {
            const ruleSetId = req.params.ruleSetId as string;
            const data = req.body.data;

            if (!data || typeof data !== 'object') {
                res.status(400).json({
                    error: 'Se requiere un campo "data" con el objeto a evaluar',
                });
                return;
            }

            const result = await RuleEvaluationService.evaluateRuleSet(ruleSetId, data);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.SYSTEM,
                environmentType: loggerInstance.enviroment.toString(),
                description: `Evaluating RuleSet '${ruleSetId}' Successful`,
            }), LOG_TARGETS);
            res.status(200).json(result);
        } catch (err: any) {
            const status = err.status || 500;
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.SYSTEM,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? err.message + '\n' : '') + (err.details ?? ''),
            }), LOG_TARGETS);
            res.status(status).json({
                error: 'Error evaluando RuleSet',
                message: err.message,
                details: err.details ?? null,
            });
        }
    },
};

export default RuleEvaluationController;
