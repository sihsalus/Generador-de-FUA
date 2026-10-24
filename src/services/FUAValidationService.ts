import { runGroups } from "../utils/visitOrchestrator";
import { runSandboxes } from "../utils/visitSandbox";
import { RC_01Group } from "../utils/visitFieldMaps/RC_01Group";

const RC_GROUPS = [RC_01Group];

export type ValidationSummary = {
    total:   number;
    ok:      number;
    failed:  number;
    details: { name: string; status: "ok" | "error"; reason?: string }[];
};

class FUAValidationService {

    async validateRC(payload: Record<string, unknown>): Promise<ValidationSummary> {
        const groupResults  = runGroups(payload, RC_GROUPS);
        const sandboxResults = await runSandboxes(groupResults);

        const details = sandboxResults.map((r) =>
            r.status === "ok"
                ? { name: r.name, status: "ok" as const }
                : { name: r.name, status: "error" as const, reason: r.reason }
        );

        return {
            total:  details.length,
            ok:     details.filter((d) => d.status === "ok").length,
            failed: details.filter((d) => d.status === "error").length,
            details,
        };
    }
}

export default new FUAValidationService();
