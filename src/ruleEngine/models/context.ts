import { z } from "zod";
import { FuaSchema, type Fua } from "./fua";

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

// --- Historial del asegurado ---

export const FuaResumenSchema = z.object({
    numero_fua: z.string(),
    codigo_prestacional: z.string(),
    fecha_atencion: z.coerce.date(),
    fecha_alta: z.coerce.date().optional(),
    destino: z.string().optional(),
    diagnosticos_principales: z.array(z.string()),
    ipress_codigo: z.string(),
});
export type FuaResumen = z.infer<typeof FuaResumenSchema>;

export const HistorialAseguradoSchema = z.object({
    fuas_previos: z.array(FuaResumenSchema),
    prestaciones_periodo: z.record(z.string(), z.array(FuaResumenSchema)),
});
export type HistorialAsegurado = z.infer<typeof HistorialAseguradoSchema>;

// --- Contexto de evaluacion ---

export const FuaContextSchema = z.object({
    fua: FuaSchema,
    historial_asegurado: HistorialAseguradoSchema,
});
export type FuaContextData = z.infer<typeof FuaContextSchema>;

export class FuaContext {
    readonly fua: Fua;
    readonly edad_calculada: EdadCalculada;
    readonly historial_asegurado: HistorialAsegurado;

    constructor(data: FuaContextData) {
        const result = FuaContextSchema.safeParse(data);
        if (!result.success) {
            const error = new Error("FuaContext: datos invalidos");
            (error as any).details = result.error;
            throw error;
        }

        this.fua = result.data.fua;
        this.historial_asegurado = result.data.historial_asegurado;
        this.edad_calculada = EdadCalculada.fromDates(
            this.fua.asegurado.fecha_nacimiento,
            this.fua.fecha_atencion
        );
    }

    get prestacionesDelMismoCodigo(): FuaResumen[] {
        return this.historial_asegurado.prestaciones_periodo[this.fua.codigo_prestacional] ?? [];
    }

    get diagnosticoPrincipal(): string | undefined {
        const principal = this.fua.diagnosticos.find((d) => d.posicion === 1);
        return principal?.codigo_cie10;
    }
}
