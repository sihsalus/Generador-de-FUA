import { z } from "zod";
import { VisitPayloadSchema, type VisitPayload } from "./visitPayload";

// --- Edad calculada ---

export class EdadCalculada {
    readonly anios: number;
    readonly meses: number;
    readonly dias: number;
    readonly total_dias: number;

    private constructor(anios: number, meses: number, dias: number, total_dias: number) {
        this.anios = anios;
        this.meses = meses;
        this.dias = dias;
        this.total_dias = total_dias;
    }

    static fromDates(fechaNacimiento: Date, fechaReferencia: Date): EdadCalculada {
        if (fechaReferencia < fechaNacimiento) {
            throw new Error(
                `fecha_referencia (${fechaReferencia.toISOString()}) es anterior a fecha_nacimiento (${fechaNacimiento.toISOString()})`
            );
        }

        const totalDias = EdadCalculada.diffDays(fechaNacimiento, fechaReferencia);
        const { anios, meses, dias } = EdadCalculada.calcularComponentes(fechaNacimiento, fechaReferencia);

        return new EdadCalculada(anios, meses, dias, totalDias);
    }

    private static diffDays(from: Date, to: Date): number {
        const MS_PER_DAY = 86_400_000;
        const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
        const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
        return Math.floor((utcTo - utcFrom) / MS_PER_DAY);
    }

    private static calcularComponentes(
        nacimiento: Date,
        referencia: Date
    ): { anios: number; meses: number; dias: number } {
        let anios = referencia.getUTCFullYear() - nacimiento.getUTCFullYear();
        let meses = referencia.getUTCMonth() - nacimiento.getUTCMonth();
        let dias = referencia.getUTCDate() - nacimiento.getUTCDate();

        if (dias < 0) {
            meses -= 1;
            const mesAnterior = new Date(
                Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth(), 0)
            );
            dias += mesAnterior.getUTCDate();
        }

        if (meses < 0) {
            anios -= 1;
            meses += 12;
        }

        return { anios, meses, dias };
    }

    toJSON(): { anios: number; meses: number; dias: number; total_dias: number } {
        return {
            anios: this.anios,
            meses: this.meses,
            dias: this.dias,
            total_dias: this.total_dias,
        };
    }
}

// --- Contexto de evaluacion ---

export const ValidationContextSchema = z.object({
    visit: VisitPayloadSchema,
});
export type ValidationContextData = z.infer<typeof ValidationContextSchema>;

export class ValidationContext {
    readonly visit: VisitPayload;
    readonly edad_calculada: EdadCalculada;

    constructor(data: ValidationContextData) {
        const result = ValidationContextSchema.safeParse(data);
        if (!result.success) {
            const error = new Error("ValidationContext: datos invalidos");
            (error as any).details = result.error;
            throw error;
        }

        this.visit = result.data.visit;
        this.edad_calculada = EdadCalculada.fromDates(
            this.visit.patient_details.fecha_nacimiento,
            this.visit.startDatetime
        );
    }

    get diagnosticoPrincipal(): string | undefined {
        const principal = this.visit.fua.diagnosticos.find((d) => d.posicion === 1);
        return principal?.codigo_cie10;
    }

    get codigoPrestacional(): string {
        return this.visit.fua.codigo_prestacional;
    }
}