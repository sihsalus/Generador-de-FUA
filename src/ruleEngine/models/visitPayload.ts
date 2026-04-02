import { z } from "zod";

// =====================================================================
// Fuente de datos: OpenMRS Visit Payload + bloque "fua" enriquecido
//
// Representa el payload completo que recibe el rule engine:
// - Datos base del visit (OpenMRS REST API)
// - Bloque "fua" agregado con datos administrativos SIS e IPRESS
// - Bloque "patient_details" con datos demográficos del paciente
//
// Referencia: src/utils/VisitExamples/Visit2.json
// =====================================================================

// --- OpenMRS base refs (uuid + display) ---

const OpenMrsRefSchema = z.object({
    uuid: z.string().min(1),
    display: z.string(),
});

// --- Patient details (datos demográficos enriquecidos) ---

export const PatientDetailsSchema = z.object({
    fecha_nacimiento: z.coerce.date(),
    sexo: z.enum(["M", "F"]),
    nombres: z.string().min(1),
    apellido_paterno: z.string().min(1),
    apellido_materno: z.string().min(1),
    documento_identidad: z.string().min(1),
    tipo_documento: z.string().min(1),
});
export type PatientDetails = z.infer<typeof PatientDetailsSchema>;

// --- Sub-modelos del bloque fua ---

export const IpressSchema = z.object({
    codigo_renipress: z.string().min(1),
    nombre: z.string().min(1),
    nivel_atencion: z.enum(["I", "II", "III"]),
    categoria: z.enum([
        "I-1", "I-2", "I-3", "I-4",
        "II-1", "II-2", "II-E",
        "III-1", "III-2", "III-E",
    ]),
    codigo_oferta_flexible: z.string().default(""),
});
export type Ipress = z.infer<typeof IpressSchema>;

export const AseguradoSisSchema = z.object({
    codigo_asegurado: z.string().default(""),
    diresa: z.string().default(""),
    contrato: z.string().default(""),
});
export type AseguradoSis = z.infer<typeof AseguradoSisSchema>;

export const CondicionPacienteSchema = z.object({
    gestante: z.boolean().default(false),
    puerpera: z.boolean().default(false),
    hospitalizado: z.boolean().default(false),
});
export type CondicionPaciente = z.infer<typeof CondicionPacienteSchema>;

export const HospitalizacionSchema = z.object({
    fecha_ingreso: z.coerce.date().nullable().default(null),
    atencion_directa: z.boolean().default(false),
    cob_extraordinaria: z.boolean().default(false),
    monto_cob: z.number().nullable().default(null),
    carta_garantia: z.boolean().default(false),
    monto_carta: z.number().nullable().default(null),
    traslado: z.boolean().default(false),
    sepelio: z.boolean().default(false),
});
export type Hospitalizacion = z.infer<typeof HospitalizacionSchema>;

export const ReferenciaSchema = z.object({
    ipress_origen_codigo: z.string().default(""),
    ipress_origen_nombre: z.string().default(""),
    numero_hoja_referencia: z.string().default(""),
    ipress_destino_codigo: z.string().default(""),
    ipress_destino_nombre: z.string().default(""),
});
export type Referencia = z.infer<typeof ReferenciaSchema>;

export const ResponsableAtencionSchema = z.object({
    dni: z.string().optional(),
    tipo_profesional: z.number().int().optional(),
    colegiatura: z.string().optional(),
    especialidad: z.string().optional(),
    rne: z.string().optional(),
});
export type ResponsableAtencion = z.infer<typeof ResponsableAtencionSchema>;

export const DESTINOS_ASEGURADO = [
    "ALTA", "CITADO", "HOSPITALIZADO",
    "REFERIDO", "CONTRAREFERIDO", "DESERCION", "FALLECIDO",
] as const;

export const DiagnosticoSchema = z.object({
    posicion: z.number().int().min(1),
    descripcion: z.string().default(""),
    codigo_cie10: z.string().min(1),
    tipo: z.enum(["PRESUNTIVO", "DEFINITIVO", "REPETITIVO"]),
});
export type Diagnostico = z.infer<typeof DiagnosticoSchema>;

export const MedicamentoSchema = z.object({
    codigo_sismed: z.string().min(1),
    nombre: z.string().min(1),
    forma_terapeutica: z.string().min(1),
    cantidad: z.number().int().min(0),
});
export type Medicamento = z.infer<typeof MedicamentoSchema>;

export const InsumoSchema = z.object({
    codigo_sismed: z.string().min(1),
    nombre: z.string().min(1),
    cantidad: z.number().int().min(0),
});
export type Insumo = z.infer<typeof InsumoSchema>;

export const ProcedimientoSchema = z.object({
    codigo_cpms: z.string().min(1),
    nombre: z.string().min(1),
    cantidad_indicada: z.number().int().min(0),
    cantidad_ejecutada: z.number().int().min(0),
    resultado: z.string().optional(),
});
export type Procedimiento = z.infer<typeof ProcedimientoSchema>;

export const SubComponentePrestacionalSchema = z.object({
    medicamentos_monto: z.number().default(0),
    insumos_monto: z.number().default(0),
    procedimientos_monto: z.number().default(0),
});
export type SubComponentePrestacional = z.infer<typeof SubComponentePrestacionalSchema>;

// --- Bloque fua (datos agregados al payload) ---

export const FuaBlockSchema = z.object({
    numero_fua: z.string().min(1),
    lote: z.string().default(""),
    fecha_digitacion: z.coerce.date(),

    ipress: IpressSchema,

    codigo_prestacional: z.string().min(1),
    codigos_prestacionales_adicionales: z.array(z.string()).default([]),
    ups: z.string().default(""),
    fua_vinculado: z.string().default(""),
    reporte_vinculado: z.string().default(""),

    asegurado_sis: AseguradoSisSchema,
    condicion: CondicionPacienteSchema,
    hospitalizacion: HospitalizacionSchema,
    destino_asegurado: z.enum(DESTINOS_ASEGURADO).optional(),
    referencia: ReferenciaSchema,
    responsable_atencion: ResponsableAtencionSchema,

    diagnosticos: z.array(DiagnosticoSchema),
    medicamentos: z.array(MedicamentoSchema),
    insumos: z.array(InsumoSchema),
    procedimientos: z.array(ProcedimientoSchema),

    sub_componente_prestacional: SubComponentePrestacionalSchema,
});
export type FuaBlock = z.infer<typeof FuaBlockSchema>;

// --- Modelo principal: VisitPayload ---

export const VisitPayloadSchema = z.object({
    uuid: z.string().min(1),
    display: z.string().default(""),

    patient: OpenMrsRefSchema,
    patient_details: PatientDetailsSchema,
    visitType: OpenMrsRefSchema,
    location: OpenMrsRefSchema,

    startDatetime: z.coerce.date(),
    stopDatetime: z.coerce.date().nullable().default(null),

    encounters: z.array(OpenMrsRefSchema).default([]),
    attributes: z.array(z.unknown()).default([]),

    fua: FuaBlockSchema,
});
export type VisitPayload = z.infer<typeof VisitPayloadSchema>;