import { ZodError } from "zod";

export type Group<T> = {
    name: string;
    extract:  (payload: Record<string, unknown>) => unknown;
    validate: (raw: unknown) => { success: true; data: T } | { success: false; error: ZodError };
    process:  (data: T) => unknown;
};

export type GroupResult<T> =
    | { status: "ok";    name: string; data: unknown }
    | { status: "error"; name: string; reason: string };

export function runGroups(
    payload: Record<string, unknown>,
    groups: Group<unknown>[]
): GroupResult<unknown>[] {
    return groups.map((group) => {
        try {
            const raw = group.extract(payload);
            const validated = group.validate(raw);

            if (!validated.success) {
                return {
                    status: "error",
                    name: group.name,
                    reason: validated.error.message,
                };
            }

            const processed = group.process(validated.data);
            return { status: "ok", name: group.name, data: processed };

        } catch (err) {
            return {
                status: "error",
                name: group.name,
                reason: err instanceof Error ? err.message : String(err),
            };
        }
    });
}
