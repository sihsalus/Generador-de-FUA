import { Request, Response } from 'express';
import GraphRuleService from '../services/GraphRuleService';
import RuleService from '../services/RuleService';
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

const GraphRuleController = {

    // ─── RULE CRUD ───

    async createFullRule(req: Request, res: Response): Promise<void> {
        try {
            const ruleSetId = Number(req.params.ruleSetId);
            if (isNaN(ruleSetId)) {
                res.status(400).json({ error: 'ruleSetId debe ser numérico' });
                return;
            }
            const result = await GraphRuleService.createFullRule(ruleSetId, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                content: { object: { name: 'Rule', uuid: result.uuid ?? '---' } },
                description: 'Creating full Rule Successful',
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
            res.status(status).json({ error: 'Failed to create Rule. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async getFullRule(req: Request, res: Response): Promise<void> {
        try {
            const result = await GraphRuleService.getFullRule(req.params.ruleId);
            if (result === null) {
                res.status(404).json({ error: `Rule '${req.params.ruleId}' couldn't be found.` });
                return;
            }
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Getting full Rule Successful',
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
            res.status(status).json({ error: 'Failed to get Rule. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async listRulesByRuleSet(req: Request, res: Response): Promise<void> {
        try {
            const ruleSetId = Number(req.params.ruleSetId);
            if (isNaN(ruleSetId)) {
                res.status(400).json({ error: 'ruleSetId debe ser numérico' });
                return;
            }
            const items = await RuleService.listByRuleSet(ruleSetId);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Listing Rules by RuleSet Successful',
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
            res.status(500).json({ error: 'Failed to list Rules. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async updateRule(req: Request, res: Response): Promise<void> {
        try {
            const result = await RuleService.update(req.params.ruleId, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.EDIT,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Updating Rule Successful',
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
            res.status(status).json({ error: 'Failed to update Rule. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async deleteRule(req: Request, res: Response): Promise<void> {
        try {
            const result = await RuleService.softDelete(req.params.ruleId, req.body.inactiveBy || 'system', req.body.inactiveReason);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.DELETE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Deleting Rule Successful',
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
            res.status(status).json({ error: 'Failed to delete Rule. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    // ─── GRAPH REPLACEMENT ───

    async replaceGraph(req: Request, res: Response): Promise<void> {
        try {
            const result = await GraphRuleService.replaceGraph(
                req.params.ruleId,
                req.body.graph,
                req.body.replacedBy || 'system',
            );
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.EDIT,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Replacing graph Successful',
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
            res.status(status).json({ error: 'Failed to replace graph. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    // ─── NODE OPERATIONS ───

    async addNode(req: Request, res: Response): Promise<void> {
        try {
            const result = await GraphRuleService.addNode(req.params.ruleId, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Adding node Successful',
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
            res.status(status).json({ error: 'Failed to add node. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async updateNode(req: Request, res: Response): Promise<void> {
        try {
            const result = await GraphRuleService.updateNode(req.params.ruleId, req.params.nodeId, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.EDIT,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Updating node Successful',
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
            res.status(status).json({ error: 'Failed to update node. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async removeNode(req: Request, res: Response): Promise<void> {
        try {
            const result = await GraphRuleService.removeNode(
                req.params.ruleId,
                req.params.nodeId,
                req.body.inactiveBy || 'system',
            );
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.DELETE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Removing node Successful',
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
            res.status(status).json({ error: 'Failed to remove node. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    // ─── EDGE OPERATIONS ───

    async addEdge(req: Request, res: Response): Promise<void> {
        try {
            const result = await GraphRuleService.addEdge(req.params.ruleId, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Adding edge Successful',
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
            res.status(status).json({ error: 'Failed to add edge. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async removeEdge(req: Request, res: Response): Promise<void> {
        try {
            const edgeId = Number(req.params.edgeId);
            if (isNaN(edgeId)) {
                res.status(400).json({ error: 'edgeId debe ser numérico' });
                return;
            }
            const result = await GraphRuleService.removeEdge(
                req.params.ruleId,
                edgeId,
                req.body.inactiveBy || 'system',
            );
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.DELETE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Removing edge Successful',
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
            res.status(status).json({ error: 'Failed to remove edge. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    // ─── VALIDATION ───

    async validateGraph(req: Request, res: Response): Promise<void> {
        try {
            const result = await GraphRuleService.validateRuleGraph(req.params.ruleId);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.SYSTEM,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Validating graph Successful',
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
            res.status(status).json({ error: 'Failed to validate graph. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    // ─── IMPORT / EXPORT ───

    async importFromJSON(req: Request, res: Response): Promise<void> {
        try {
            const ruleSetId = Number(req.params.ruleSetId);
            if (isNaN(ruleSetId)) {
                res.status(400).json({ error: 'ruleSetId debe ser numérico' });
                return;
            }
            const result = await GraphRuleService.importFromJSON(ruleSetId, req.body);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Importing from JSON Successful',
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
            res.status(status).json({ error: 'Failed to import from JSON. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async exportRuleToJSON(req: Request, res: Response): Promise<void> {
        try {
            const result = await GraphRuleService.exportRuleToJSON(req.params.ruleId);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Exporting Rule to JSON Successful',
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
            res.status(status).json({ error: 'Failed to export Rule to JSON. (Controller)', message: err.message, details: err.details ?? null });
        }
    },

    async exportRuleSetToJSON(req: Request, res: Response): Promise<void> {
        try {
            const result = await GraphRuleService.exportRuleSetToJSON(req.params.ruleSetId);
            loggerInstance.printLog(new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: 'Exporting RuleSet to JSON Successful',
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
            res.status(status).json({ error: 'Failed to export RuleSet to JSON. (Controller)', message: err.message, details: err.details ?? null });
        }
    },
};

export default GraphRuleController;
