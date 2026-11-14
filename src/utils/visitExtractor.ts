type FieldExtractor<T = unknown> = (payload: Record<string, unknown>) => T;

export type FieldMap<T extends string> = {
    [K in T]: FieldExtractor;
};

export type ExtractedFields<T extends string> = {
    [K in T]: unknown;
};

export function extractFields<T extends string>(
    payload: Record<string, unknown>,
    fieldMap: FieldMap<T>
): ExtractedFields<T> {
    const result = {} as ExtractedFields<T>;

    for (const key in fieldMap) {
        result[key] = fieldMap[key](payload);
    }

    return result;
}
