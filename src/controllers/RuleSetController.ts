import { Request, Response } from 'express';
import RuleSetService from '../services/RuleSetService';
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

const RuleSetController = {

    async createRuleSet(req: Request, res: Response): Promise<void> {
        try {
            const result = await RuleSetService.create(req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                content: { object: { name: 'RuleSet', uuid: result.uuid ?? '---' } },
                description: 'Creating RuleSet Successful',
            }), LOG_TARGETS);
            res.status(201).json(result);
        } catch (err: any) {
            const status = err.status || 500;
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? err.message + '\n' : '') + (err.details ?? ''),
            }), LOG_TARGETS);
            res.status(status).json({ error: 'Failed to create RuleSet. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async listAllRuleSets(req: Request, res: Response): Promise<void> {
        try {
            const items = await RuleSetService.listAll();
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Listing all RuleSets Successful',
            }), LOG_TARGETS);
            res.status(200).json(items);
        } catch (err: any) {
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? err.message + '\n' : '') + (err.details ?? ''),
            }), LOG_TARGETS);
            res.status(500).json({ error: 'Failed to list RuleSets. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async getRuleSetById(req: Request, res: Response): Promise<void> {
        try {
            const item = await RuleSetService.getByIdOrUUID(req.params.id);
            if (item === null) {
                res.status(404).json({ error: `RuleSet '${req.params.id}' couldn't be found.` });
                return;
            }
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Getting RuleSet by Id Successful',
            }), LOG_TARGETS);
            res.status(200).json(item);
        } catch (err: any) {
            const status = err.status || 500;
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? err.message + '\n' : '') + (err.details ?? ''),
            }), LOG_TARGETS);
            res.status(status).json({ error: 'Failed to get RuleSet. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async updateRuleSet(req: Request, res: Response): Promise<void> {
        try {
            const result = await RuleSetService.update(req.params.id, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.EDIT,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Updating RuleSet Successful',
            }), LOG_TARGETS);
            res.status(200).json(result);
        } catch (err: any) {
            const status = err.status || 500;
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.EDIT,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? err.message + '\n' : '') + (err.details ?? ''),
            }), LOG_TARGETS);
            res.status(status).json({ error: 'Failed to update RuleSet. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async deleteRuleSet(req: Request, res: Response): Promise<void> {
        try {
            const result = await RuleSetService.softDelete(req.params.id, req.body.inactiveBy || 'system', req.body.inactiveReason);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.DELETE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Deleting RuleSet Successful',
            }), LOG_TARGETS);
            res.status(200).json(result);
        } catch (err: any) {
            const status = err.status || 500;
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.DELETE,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? err.message + '\n' : '') + (err.details ?? ''),
            }), LOG_TARGETS);
            res.status(status).json({ error: 'Failed to delete RuleSet. (Controller)', message: err.message, details: err.details ?? null });
        }
    },
};

export default RuleSetController;
