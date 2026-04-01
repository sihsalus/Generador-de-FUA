import { z } from "zod";

// --- Resultado individual de una regla ---

export const RULE_ACTIONS = ["BLOCK", "WARN", "ENABLE"] as const;

export const RuleResultSchema = z.object({
    rule_id: z.string(),
    rule_name: z.string(),
    passed: z.boolean(),
    action: z.enum(RULE_ACTIONS),
    message: z.string().optional(),
    details: z.record(z.unknown()).optional(),
    observation_code: z.string().optional(),
});
export type RuleResult = z.infer<typeof RuleResultSchema>;

// --- Resultado consolidado de la validacion de un FUA ---

export const ValidationResultSchema = z.object({
    fua_numero: z.string(),
    allowed: z.boolean(),
    blocks: z.array(RuleResultSchema),
    warnings: z.array(RuleResultSchema),
    enabled_fields: z.record(z.string(), z.boolean()),
    filtered_catalogs: z.record(z.string(), z.array(z.unknown())),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// --- Funciones de construccion ---

export function createRuleResult(params: {
    rule_id: string;
    rule_name: string;
    passed: boolean;
    action: (typeof RULE_ACTIONS)[number];
    message?: string;
    details?: Record<string, unknown>;
    observation_code?: string;
}): RuleResult {
    return RuleResultSchema.parse(params);
}

export function createEmptyValidationResult(fuaNumero: string): ValidationResult {
    return {
        fua_numero: fuaNumero,
        allowed: true,
        blocks: [],
        warnings: [],
        enabled_fields: {},
        filtered_catalogs: {},
    };
}

export function consolidateResults(
    fuaNumero: string,
    results: RuleResult[]
): ValidationResult {
    const blocks = results.filter((r) => !r.passed && r.action === "BLOCK");
    const warnings = results.filter((r) => !r.passed && r.action === "WARN");

    const enabled_fields: Record<string, boolean> = {};
    for (const r of results.filter((r) => r.action === "ENABLE")) {
        if (r.details?.["field_name"] && typeof r.details["field_name"] === "string") {
            enabled_fields[r.details["field_name"]] = r.passed;
        }
    }

    return {
        fua_numero: fuaNumero,
        allowed: blocks.length === 0,
        blocks,
        warnings,
        enabled_fields,
        filtered_catalogs: {},
    };
}
