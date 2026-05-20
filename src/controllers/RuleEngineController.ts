import { Request, Response } from "express";
import { VisitPayloadSchema } from "../ruleEngine/models/visitPayload";
import RuleEngineService from "../services/RuleEngineService";
import { Log } from "../middleware/logger/models/typescript/Log";
import { loggerInstance } from "../middleware/logger/models/typescript/Logger";
import { Logger_LogLevel } from "../middleware/logger/models/typescript/LogLevel";
import { Logger_SecurityLevel } from "../middleware/logger/models/typescript/SecurityLevel";
import { Logger_LogType } from "../middleware/logger/models/typescript/LogType";

const ENTITY_NAME = "RuleEngine";

const LOG_TARGETS = [
    { name: "terminal" as const },
    { name: "file" as const, file: "logs/auxLog.log" },
    { name: "database" as const },
];

const RuleEngineController = {

    async validate(req: Request, res: Response): Promise<void> {
        try {
            const parsed = VisitPayloadSchema.safeParse(req.body.visit_payload);
            if (!parsed.success) {
                res.status(400).json({
                    error: "Invalid visit_payload",
                    details: parsed.error,
                });
                return;
            }

            const executedBy: string = req.body.executed_by ?? "anonymous";
            const result = await RuleEngineService.validate(parsed.data, executedBy);

            loggerInstance.printLog(
                new Log({
                    timeStamp: new Date(),
                    logLevel: result.allowed ? Logger_LogLevel.INFO : Logger_LogLevel.WARN,
                    securityLevel: Logger_SecurityLevel.Admin,
                    logType: Logger_LogType.SYSTEM,
                    environmentType: loggerInstance.enviroment.toString(),
                    description: result.allowed
                        ? `Rule validation passed for visit ${result.visit_uuid}`
                        : `Rule validation BLOCKED for visit ${result.visit_uuid} (${result.blocks.length} block(s))`,
                    content: { objectName: ENTITY_NAME, visit_uuid: result.visit_uuid },
                }),
                LOG_TARGETS
            );

            res.status(200).json(result);
        } catch (err: any) {
            loggerInstance.printLog(
                new Log({
                    timeStamp: new Date(),
                    logLevel: Logger_LogLevel.ERROR,
                    securityLevel: Logger_SecurityLevel.Admin,
                    logType: Logger_LogType.SYSTEM,
                    environmentType: loggerInstance.enviroment.toString(),
                    description: `RuleEngine validate error: ${err.message}`,
                }),
                LOG_TARGETS
            );
            res.status(500).json({
                error: "Failed to validate FUA rules. (Controller)",
                message: (err as Error).message,
                details: (err as any).details ?? null,
            });
        }
    },
};

export default RuleEngineController;
