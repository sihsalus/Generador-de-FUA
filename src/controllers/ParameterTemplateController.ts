import { Request, Response } from 'express';
import ParameterTemplateService from '../services/ParameterTemplateService';
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

const ParameterTemplateController = {

    async createTemplate(req: Request, res: Response): Promise<void> {
        try {
            const ruleSetId = Number(req.params.ruleSetId);
            if (isNaN(ruleSetId)) {
                res.status(400).json({ error: 'ruleSetId debe ser numérico' });
                return;
            }
            const result = await ParameterTemplateService.create(ruleSetId, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Creating ParameterTemplate Successful',
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
            res.status(status).json({ error: 'Failed to create ParameterTemplate. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async listByRuleSet(req: Request, res: Response): Promise<void> {
        try {
            const ruleSetId = Number(req.params.ruleSetId);
            if (isNaN(ruleSetId)) {
                res.status(400).json({ error: 'ruleSetId debe ser numérico' });
                return;
            }
            const items = await ParameterTemplateService.listByRuleSet(ruleSetId);
            res.status(200).json(items);
        } catch (err: any) {
            res.status(500).json({ error: 'Failed to list templates. (Controller)', message: err.message });
        }
    },

    async getTemplate(req: Request, res: Response): Promise<void> {
        try {
            const item = await ParameterTemplateService.getByIdOrUUID(req.params.templateId as string);
            res.status(200).json(item);
        } catch (err: any) {
            const status = err.status || 500;
            res.status(status).json({ error: 'Failed to get template. (Controller)', message: err.message });
        }
    },

    async updateTemplate(req: Request, res: Response): Promise<void> {
        try {
            const result = await ParameterTemplateService.update(req.params.templateId as string, req.body);
            res.status(200).json(result);
        } catch (err: any) {
            const status = err.status || 500;
            res.status(status).json({ error: 'Failed to update template. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async deleteTemplate(req: Request, res: Response): Promise<void> {
        try {
            const result = await ParameterTemplateService.softDelete(
                req.params.templateId as string,
                req.body.inactiveBy || 'system',
                req.body.inactiveReason,
            );
            res.status(200).json(result);
        } catch (err: any) {
            const status = err.status || 500;
            res.status(status).json({ error: 'Failed to delete template. (Controller)', message: err.message });
        }
    },
};

export default ParameterTemplateController;
