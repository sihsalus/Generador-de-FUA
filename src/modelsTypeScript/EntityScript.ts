export interface ScriptExecutionParams {
    entity:    Record<string, any>;
    payload:   Record<string, any>;
    script:    string;
    maxChars:  number;
    maxTimeMs: number;
}

export interface ScriptExecutionResult {
    success:        boolean;
    entity:         Record<string, any> | null;
    error?:         string;
    executionTimeMs: number;
    executedLines:  number;
}
