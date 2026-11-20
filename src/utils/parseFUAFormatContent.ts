import { parse, ParseError } from 'jsonc-parser';
import { z } from 'zod';
import { BaseFieldFormEntitySchema } from '../modelsTypeScript/BaseFieldFormEntity';
import { FUAFormatSchema, FUAFormatInterface } from '../modelsTypeScript/FUAFormat';
import { FUAPageSchema } from '../modelsTypeScript/FUAPage';
import { FUASectionSchema } from '../modelsTypeScript/FUASection';
import { FUAFieldSchema } from '../modelsTypeScript/FUAField';
import { FUAFormatValidationError } from '../errors/FUAFormatValidationError';

// Reuse the model contracts. Validate the hierarchy before constructors lose
// the location of a nested error or a write persists an unusable format.
const fieldSchema: z.ZodTypeAny = z.lazy(() => FUAFieldSchema.merge(BaseFieldFormEntitySchema).extend({
    fields: z.array(fieldSchema).optional(),
}));
const sectionSchema = FUASectionSchema.merge(BaseFieldFormEntitySchema).extend({
    fields: z.array(fieldSchema),
});
const pageSchema = FUAPageSchema.merge(BaseFieldFormEntitySchema).extend({
    sections: z.array(sectionSchema),
});
const formatSchema = FUAFormatSchema.merge(BaseFieldFormEntitySchema).extend({
    pages: z.array(pageSchema).optional(),
});

export function parseFUAFormatContent(content: string): FUAFormatInterface {
    const errors: ParseError[] = [];
    const parsed = parse(content, errors, { allowTrailingComma: true });
    if (errors.length || parsed === undefined) {
        throw new FUAFormatValidationError([{ path: [], code: 'invalid_jsonc', message: 'El archivo no es JSONC válido.' }]);
    }
    const result = formatSchema.safeParse(parsed);
    if (!result.success) {
        throw FUAFormatValidationError.fromZod(result.error);
    }
    // Validation must not strip rendering-specific properties or coerce tags.
    return parsed;
}
