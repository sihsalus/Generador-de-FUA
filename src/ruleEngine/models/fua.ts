import { z } from "zod";

// =====================================================================
// Fuente de datos: OpenMRS Visit Payload
//
// Cada campo documenta su ORIGEN en el payload de OpenMRS.
// Campos marcados [EXTERNO] no provienen del payload y deben ser
// provistos por el proceso de digitacion/IPRESS.
//
// Referencia: src/utils/VisitExamples/Visit2.json
// =====================================================================

// --- Sub-modelos embebidos ---

export const AseguradoSchema = z.object({
    // [PAYLOAD] patient.identifiers → display "DNI = XXXXX"
    documento_identidad: z.string().min(1),
    // [PAYLOAD] derivado del prefijo del identifier (DNI, CE, PTP, etc.)
    tipo_documento: z.string().min(1),
    // [PAYLOAD] person.preferredName.display → parsing primer nombre
    nombres: z.string().min(1),
    // [PAYLOAD] person.preferredName.display → parsing apellido paterno
    apellido_paterno: z.string().min(1),
    // [PAYLOAD] person.preferredName.display → parsing apellido materno
    apellido_materno: z.string().min(1),
    // [PAYLOAD] person.birthdate
    fecha_nacimiento: z.coerce.date(),
    // [PAYLOAD] person.gender ("M" | "F")
    sexo: z.enum(["M", "F"]),
    // [PAYLOAD] visit.attributes → "Número de Seguro"
    codigo_afiliacion: z.string().default(""),
    // [PAYLOAD] visit.attributes → "Financiador" → concept.display (ej: "S.I.S")
    contrato: z.string().default(""),
});
export type Asegurado = z.infer<typeof AseguradoSchema>;

export const CondicionPacienteSchema = z.object({
    // [PAYLOAD] derivable de obs con concepto de gestacion en encounters
    gestante: z.boolean().default(false),
    // [PAYLOAD] derivable de obs con concepto de puerperio en encounters
    puerpera: z.boolean().default(false),
    // [PAYLOAD] derivable de visitType.name o encounters de hospitalizacion
    hospitalizado: z.boolean().default(false),
});
export type CondicionPaciente = z.infer<typeof CondicionPacienteSchema>;

export const ResponsableAtencionSchema = z.object({
    // [EXTERNO] codigo MINSA del tipo de profesional (1=Medico, 2=Farmaceutico, etc.)
    tipo_profesional: z.number().int().optional(),
    // [EXTERNO] numero de colegiatura
    colegiatura: z.string().optional(),
    // [EXTERNO] especialidad del profesional
    especialidad: z.string().optional(),
    // [EXTERNO] Registro Nacional de Especialista
    rne: z.string().optional(),
    // [PAYLOAD] encounterProviders[].provider.person.uuid (limitado, no tiene DNI)
    provider_uuid: z.string().optional(),
    // [PAYLOAD] encounterProviders[].provider.person.display
    provider_nombre: z.string().optional(),
    // [EXTERNO] DNI del responsable — no disponible en payload de OpenMRS
    dni: z.string().optional(),
});
export type ResponsableAtencion = z.infer<typeof ResponsableAtencionSchema>;

export const DiagnosticoSchema = z.object({
    // [PAYLOAD] encounter.diagnoses[].diagnosis.coded.display (codigo CIE-10)
    codigo_cie10: z.string().min(1),
    // [PAYLOAD] encounter.diagnoses[].certainty (PROVISIONAL → PRESUNTIVO, CONFIRMED → DEFINITIVO)
    tipo: z.enum(["PRESUNTIVO", "DEFINITIVO", "REPETITIVO"]),
    // [PAYLOAD] encounter.diagnoses[].rank o posicion en el array
    posicion: z.number().int().min(1),
});
export type Diagnostico = z.infer<typeof DiagnosticoSchema>;

export const MedicamentoRegistradoSchema = z.object({
    // [EXTERNO] codigo SISMED — no disponible en payload de OpenMRS
    codigo_sismed: z.string().min(1),
    nombre: z.string().min(1),
    cantidad: z.number().int().min(0),
    // TAB, INY, CAP, etc.
    forma_terapeutica: z.string().min(1),
});
export type MedicamentoRegistrado = z.infer<typeof MedicamentoRegistradoSchema>;

export const InsumoRegistradoSchema = z.object({
    // [EXTERNO] codigo SISMED — no disponible en payload de OpenMRS
    codigo_sismed: z.string().min(1),
    nombre: z.string().min(1),
    cantidad: z.number().int().min(0),
});
export type InsumoRegistrado = z.infer<typeof InsumoRegistradoSchema>;

export const ProcedimientoRegistradoSchema = z.object({
    // [EXTERNO] codigo CPMS — no disponible directamente en payload
    codigo_cpms: z.string().min(1),
    nombre: z.string().min(1),
    cantidad_indicada: z.number().int().min(0),
    cantidad_ejecutada: z.number().int().min(0),
    resultado: z.string().optional(),
});
export type ProcedimientoRegistrado = z.infer<typeof ProcedimientoRegistradoSchema>;

export const ActividadPreventivaSchema = z.object({
    // [PAYLOAD] encounter.obs[].concept.uuid o concept.display
    codigo: z.string().min(1),
    // [PAYLOAD] encounter.obs[].value (numero, string, o concept.display)
    valor: z.string(),
});
export type ActividadPreventiva = z.infer<typeof ActividadPreventivaSchema>;

export const IpressSchema = z.object({
    // [PAYLOAD] visit.location → parentLocation o location tags
    // El codigo RENIPRESS puede venir de location attributes o ser configuracion fija
    codigo_renipress: z.string().min(1),
    // [EXTERNO] nivel y categoria — configuracion de la IPRESS, no del payload
    nivel_atencion: z.enum(["I", "II", "III"]),
    categoria: z.enum([
        "I-1", "I-2", "I-3", "I-4",
        "II-1", "II-2", "II-E",
        "III-1", "III-2", "III-E",
    ]),
});
export type Ipress = z.infer<typeof IpressSchema>;

// --- Modelo principal: Fua ---

export const DESTINOS_ASEGURADO = [
    "ALTA", "CITADO", "HOSPITALIZADO",
    "REFERIDO", "CONTRAREFERIDO", "DESERCION", "FALLECIDO",
] as const;

export const TIPOS_ATENCION = [
    "AMBULATORIA", "REFERENCIA", "EMERGENCIA",
] as const;

export const FuaSchema = z.object({
    // [EXTERNO] asignado por el proceso SIS, no existe en OpenMRS
    numero_fua: z.string().min(1),
    // [EXTERNO] lote del FUA para envio al SIS
    lote: z.string().default(""),

    // [PAYLOAD] derivable de encounterType.name → mapeo a codigo prestacional MINSA
    codigo_prestacional: z.string().min(1),

    // [PAYLOAD] visit.startDatetime
    fecha_atencion: z.coerce.date(),
    // [PAYLOAD] solo hospitalizados — derivable de encounters de admision
    fecha_ingreso: z.coerce.date().optional(),
    // [PAYLOAD] visit.stopDatetime para hospitalizados
    fecha_alta: z.coerce.date().optional(),
    // [PAYLOAD] derivable de obs con concepto FPP en encounter de gestante
    fecha_probable_parto: z.coerce.date().optional(),
    // [PAYLOAD] derivable de obs con concepto fecha de parto
    fecha_parto: z.coerce.date().optional(),
    // [PAYLOAD] person.deathDate (si person.dead === true)
    fecha_fallecimiento: z.coerce.date().optional(),

    asegurado: AseguradoSchema,
    condicion: CondicionPacienteSchema,
    responsable_atencion: ResponsableAtencionSchema,

    // [PAYLOAD] derivable de encounter de alta / destino asegurado en obs
    destino_asegurado: z.enum(DESTINOS_ASEGURADO).optional(),
    // [PAYLOAD] visitType.name → mapeo a tipo atencion SIS
    tipo_atencion: z.enum(TIPOS_ATENCION).optional(),

    // [PAYLOAD] encounter.diagnoses[]
    diagnosticos: z.array(DiagnosticoSchema),
    // [EXTERNO] no disponible en payload de OpenMRS
    medicamentos: z.array(MedicamentoRegistradoSchema),
    // [EXTERNO] no disponible en payload de OpenMRS
    insumos: z.array(InsumoRegistradoSchema),
    // [PARCIAL] encounters tipo "Procedimiento" pero sin codigo CPMS
    procedimientos: z.array(ProcedimientoRegistradoSchema),
    // [PAYLOAD] encounter.obs[] — concepto + valor
    actividades_preventivas: z.array(ActividadPreventivaSchema),

    ipress: IpressSchema,
    // [EXTERNO] fecha de digitacion en el sistema SIS
    fecha_digitacion: z.coerce.date(),
});
export type Fua = z.infer<typeof FuaSchema>;
