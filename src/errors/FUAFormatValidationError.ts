import { z } from 'zod';

export interface FormatIssue {
    path: Array<string | number>;
    code: string;
    message: string;
}

export class FUAFormatValidationError extends Error {
    readonly status = 422;
    readonly code = 'INVALID_FUA_FORMAT';

    constructor(readonly issues: FormatIssue[]) {
        super('El formato FUA contiene campos inválidos.');
        Object.setPrototypeOf(this, new.target.prototype);
    }

    static fromZod(error: z.ZodError): FUAFormatValidationError {
        return new FUAFormatValidationError(error.issues.map(issue => ({
            path: issue.path,
            code: issue.code,
            // No submitted values, custom validator messages or stack traces in responses.
            message: issue.code === 'invalid_type'
                ? `Se esperaba ${issue.expected}; se recibió ${issue.received}.`
                : 'El campo no cumple el formato requerido.',
        })));
    }

    response() {
        return { error: this.code, message: this.message, details: this.issues };
    }
}
