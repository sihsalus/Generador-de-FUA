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
 * EntityScriptExecutionController
 *
 * POST /ws/entity-script/execute     — Ejecutar script ad-hoc
 * POST /ws/entity-script/execute/:id — Ejecutar script almacenado en BD
 */
const EntityScriptExecutionController = {

  async executeAdHoc(req: Request, res: Response): Promise<void> {
    try {
      const result = EntityScriptService.executeAdHoc(req.body);

      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: result.success ? Logger_LogLevel.INFO : Logger_LogLevel.WARN,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.SYSTEM,
          environmentType: loggerInstance.enviroment.toString(),
          description: result.success
            ? "Ad-hoc script execution successful"
            : `Ad-hoc script execution failed: ${result.error}`,
          content: { objectName: ENTITY_NAME, executionTimeMs: result.executionTimeMs },
        }),
        LOG_TARGETS
      );

      const status = result.success ? 200 : 422;
      res.status(status).json(result);
    } catch (err: any) {
      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.ERROR,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.SYSTEM,
          environmentType: loggerInstance.enviroment.toString(),
          description: `EntityScript executeAdHoc error: ${err.message}`,
        }),
        LOG_TARGETS
      );
      res.status(500).json({
        error: 'Failed to execute ad-hoc script. (Controller)',
        message: (err as Error).message,
        details: (err as any).details ?? null,
      });
    }
  },

  async executeStored(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { entity, payload } = req.body;

      const result = await EntityScriptService.executeStored(id, entity, payload);

      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: result.success ? Logger_LogLevel.INFO : Logger_LogLevel.WARN,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.SYSTEM,
          environmentType: loggerInstance.enviroment.toString(),
          description: result.success
            ? `Stored script id=${id} execution successful`
            : `Stored script id=${id} execution failed: ${result.error}`,
          content: { objectName: ENTITY_NAME, scriptId: id, executionTimeMs: result.executionTimeMs },
        }),
        LOG_TARGETS
      );

      const status = result.success ? 200 : 422;
      res.status(status).json(result);
    } catch (err: any) {
      loggerInstance.printLog(
        new Log({
          timeStamp: new Date(),
          logLevel: Logger_LogLevel.ERROR,
          securityLevel: Logger_SecurityLevel.Admin,
          logType: Logger_LogType.SYSTEM,
          environmentType: loggerInstance.enviroment.toString(),
          description: `EntityScript executeStored error: ${err.message}`,
        }),
        LOG_TARGETS
      );
      res.status(500).json({
        error: 'Failed to execute stored script. (Controller)',
        message: (err as Error).message,
        details: (err as any).details ?? null,
      });
    }
  },
};

export default EntityScriptExecutionController;
