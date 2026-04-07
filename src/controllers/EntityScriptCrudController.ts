import { Request, Response } from "express";
import EntityScriptService from "../services/EntityScriptService";
import { Log } from "../middleware/logger/models/typescript/Log";
import { loggerInstance } from "../middleware/logger/models/typescript/Logger";
import { Logger_LogLevel } from "../middleware/logger/models/typescript/LogLevel";
import { Logger_SecurityLevel } from "../middleware/logger/models/typescript/SecurityLevel";
import { Logger_LogType } from "../middleware/logger/models/typescript/LogType";

const ENTITY_NAME = "EntityScript";

const LOG_TARGETS = [
  { name: "terminal" as const },
  { name: "file" as const, file: "logs/auxLog.log" },
  { name: "database" as const },
];

/**
 * EntityScriptCrudController
 *
 * POST /ws/entity-script     — Crear script
 * GET  /ws/entity-script      — Listar scripts
 * GET  /ws/entity-script/:id  — Obtener script por ID
 * PUT  /ws/entity-script/:id  — Actualizar script
 */
const EntityScriptCrudController = {

  async create(req: Request, res: Response): Promise<void> {
    try {
      const record = await EntityScriptService.create(req.body);

      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.INFO,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.CREATE,
          environmentType: loggerInstance.enviroment.toString(),
          description: "Creating EntityScript successful",
          content: { objectName: ENTITY_NAME, name: record.name },
        }),
        LOG_TARGETS
      );

      res.status(201).json({ success: true, data: record });
    } catch (err: any) {
      if (err.name === "SequelizeUniqueConstraintError") {
        res.status(409).json({ success: false, error: "Ya existe un script con ese nombre." });
        return;
      }
      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.ERROR,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.CREATE,
          environmentType: loggerInstance.enviroment.toString(),
          description: `EntityScript create error: ${err.message}`,
        }),
        LOG_TARGETS
      );
      res.status(500).json({
        error: 'Failed to create EntityScript. (Controller)',
        message: (err as Error).message,
        details: (err as any).details ?? null,
      });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const record = await EntityScriptService.getByIdOrUUID(req.params.id as string);
      if (!record) {
        res.status(404).json({ success: false, error: "No encontrado." });
        return;
      }

      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.INFO,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.READ,
          environmentType: loggerInstance.enviroment.toString(),
          description: "Getting EntityScript by Id successful",
          content: { objectName: ENTITY_NAME, id: req.params.id as string },
        }),
        LOG_TARGETS
      );

      res.json({ success: true, data: record });
    } catch (err: any) {
      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.ERROR,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.READ,
          environmentType: loggerInstance.enviroment.toString(),
          description: `EntityScript getById error: ${err.message}`,
        }),
        LOG_TARGETS
      );
      res.status(500).json({
        error: 'Failed to get EntityScript. (Controller)',
        message: (err as Error).message,
        details: (err as any).details ?? null,
      });
    }
  },

  async list(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        targetEntity: req.query.targetEntity as string | undefined,
        isActive: req.query.isActive as string | undefined,
      };
      const records = await EntityScriptService.listAll(filters);

      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.INFO,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.READ,
          environmentType: loggerInstance.enviroment.toString(),
          description: "Listing EntityScripts successful",
          content: { objectName: ENTITY_NAME, count: records.length },
        }),
        LOG_TARGETS
      );

      res.json({ success: true, data: records });
    } catch (err: any) {
      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.ERROR,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.READ,
          environmentType: loggerInstance.enviroment.toString(),
          description: `EntityScript list error: ${err.message}`,
        }),
        LOG_TARGETS
      );
      res.status(500).json({
        error: 'Failed to list EntityScripts. (Controller)',
        message: (err as Error).message,
        details: (err as any).details ?? null,
      });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const record = await EntityScriptService.update(req.params.id as string, req.body);

      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.INFO,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.EDIT,
          environmentType: loggerInstance.enviroment.toString(),
          description: "Updating EntityScript successful",
          content: { objectName: ENTITY_NAME, id: req.params.id as string },
        }),
        LOG_TARGETS
      );

      res.json({ success: true, data: record });
    } catch (err: any) {
      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.ERROR,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.EDIT,
          environmentType: loggerInstance.enviroment.toString(),
          description: `EntityScript update error: ${err.message}`,
        }),
        LOG_TARGETS
      );
      res.status(500).json({
        error: 'Failed to update EntityScript. (Controller)',
        message: (err as Error).message,
        details: (err as any).details ?? null,
      });
    }
  },

  async softDelete(req: Request, res: Response): Promise<void> {
    try {
      const deletedBy = req.body.deletedBy;
      if (!deletedBy) {
        res.status(400).json({ success: false, error: "deletedBy es requerido." });
        return;
      }

      const record = await EntityScriptService.softDelete(req.params.id as string, deletedBy);

      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.INFO,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.DELETE,
          environmentType: loggerInstance.enviroment.toString(),
          description: "Soft-deleting EntityScript successful",
          content: { objectName: ENTITY_NAME, id: req.params.id as string },
        }),
        LOG_TARGETS
      );

      res.json({ success: true, data: record });
    } catch (err: any) {
      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.ERROR,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.DELETE,
          environmentType: loggerInstance.enviroment.toString(),
          description: `EntityScript softDelete error: ${err.message}`,
        }),
        LOG_TARGETS
      );
      res.status(500).json({
        error: 'Failed to soft-delete EntityScript. (Controller)',
        message: (err as Error).message,
        details: (err as any).details ?? null,
      });
    }
  },
};

export default EntityScriptCrudController;
