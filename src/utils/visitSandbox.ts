import { GroupResult } from "./visitOrchestrator";
import EntityScriptImplementation from "../implementation/sequelize/EntityScriptImplementation";
import { ScriptExecutorService } from "../services/ScriptExecutorService";

export type SandboxResult =
    | { status: "ok";    name: string; entity: Record<string, any>; executionTimeMs: number }
    | { status: "error"; name: string; reason: string };

export async function runSandboxes(
    groupResults: GroupResult<unknown>[]
): Promise<SandboxResult[]> {
    const results: SandboxResult[] = [];

    for (const groupResult of groupResults) {
        if (groupResult.status === "error") {
            results.push({ status: "error", name: groupResult.name, reason: groupResult.reason });
            continue;
        }

        const script = await EntityScriptImplementation.getByNameSequelize(groupResult.name);

        if (!script) {
            results.push({ status: "error", name: groupResult.name, reason: `Script "${groupResult.name}" no encontrado en BD.` });
            continue;
        }

        const execution = ScriptExecutorService.executeFromRecord(
            script,
            {},
            groupResult.data as Record<string, any>
        );

        if (!execution.success) {
            results.push({ status: "error", name: groupResult.name, reason: execution.error! });
            continue;
        }

        results.push({
            status: "ok",
            name:   groupResult.name,
            entity: execution.entity!,
            executionTimeMs: execution.executionTimeMs,
        });
    }

    return results;
}
