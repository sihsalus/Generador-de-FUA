import { Request, Response } from 'express';
import LookupTableService from '../services/LookupTableService';
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

const LookupTableController = {

    // ─── TABLE CRUD ───

    async createTable(req: Request, res: Response): Promise<void> {
        try {
            const ruleSetId = Number(req.params.ruleSetId);
            if (isNaN(ruleSetId)) {
                res.status(400).json({ error: 'ruleSetId debe ser numérico' });
                return;
            }
            const result = await LookupTableService.create(ruleSetId, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                content: { object: { name: 'LookupTable', uuid: result.uuid ?? '---' } },
                description: 'Creating LookupTable Successful',
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
            res.status(status).json({ error: 'Failed to create LookupTable. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async listByRuleSet(req: Request, res: Response): Promise<void> {
        try {
            const ruleSetId = Number(req.params.ruleSetId);
            if (isNaN(ruleSetId)) {
                res.status(400).json({ error: 'ruleSetId debe ser numérico' });
                return;
            }
            const items = await LookupTableService.listByRuleSet(ruleSetId);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Listing LookupTables by RuleSet Successful',
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
            res.status(500).json({ error: 'Failed to list LookupTables. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async getFullTable(req: Request, res: Response): Promise<void> {
        try {
            const result = await LookupTableService.getFullTable(req.params.tableId as string);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Getting full LookupTable Successful',
            }), LOG_TARGETS);
            res.status(200).json(result);
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
            res.status(status).json({ error: 'Failed to get LookupTable. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async updateTable(req: Request, res: Response): Promise<void> {
        try {
            const result = await LookupTableService.update(req.params.tableId as string, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.EDIT,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Updating LookupTable Successful',
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
            res.status(status).json({ error: 'Failed to update LookupTable. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async deleteTable(req: Request, res: Response): Promise<void> {
        try {
            const result = await LookupTableService.softDelete(
                req.params.tableId as string,
                req.body.inactiveBy || 'system',
                req.body.inactiveReason,
            );
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.DELETE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Deleting LookupTable Successful',
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
            res.status(status).json({ error: 'Failed to delete LookupTable. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    // ─── ROW OPERATIONS ───

    async addRow(req: Request, res: Response): Promise<void> {
        try {
            const result = await LookupTableService.addRow(req.params.tableId as string, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Adding LookupTable row Successful',
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
            res.status(status).json({ error: 'Failed to add row. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async updateRow(req: Request, res: Response): Promise<void> {
        try {
            const rowId = Number(req.params.rowId);
            if (isNaN(rowId)) {
                res.status(400).json({ error: 'rowId debe ser numérico' });
                return;
            }
            const result = await LookupTableService.updateRow(req.params.tableId as string, rowId, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.EDIT,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Updating LookupTable row Successful',
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
            res.status(status).json({ error: 'Failed to update row. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async deleteRow(req: Request, res: Response): Promise<void> {
        try {
            const rowId = Number(req.params.rowId);
            if (isNaN(rowId)) {
                res.status(400).json({ error: 'rowId debe ser numérico' });
                return;
            }
            const result = await LookupTableService.deleteRow(rowId, req.body.inactiveBy || 'system');
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.DELETE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Deleting LookupTable row Successful',
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
            res.status(status).json({ error: 'Failed to delete row. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    // ─── IMPORT / EXPORT ───

    async importFullTable(req: Request, res: Response): Promise<void> {
        try {
            const ruleSetId = Number(req.params.ruleSetId);
            if (isNaN(ruleSetId)) {
                res.status(400).json({ error: 'ruleSetId debe ser numérico' });
                return;
            }
            const result = await LookupTableService.importFullTable(ruleSetId, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Importing LookupTable Successful',
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
            res.status(status).json({ error: 'Failed to import LookupTable. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async exportFullTable(req: Request, res: Response): Promise<void> {
        try {
            const result = await LookupTableService.exportFullTable(req.params.tableId as string);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Exporting LookupTable Successful',
            }), LOG_TARGETS);
            res.status(200).json(result);
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
            res.status(status).json({ error: 'Failed to export LookupTable. (Controller)', message: err.message, details: err.details ?? null });
        }
    },
};

export default LookupTableController;
