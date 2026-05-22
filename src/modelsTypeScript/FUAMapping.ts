import { z } from "zod";

// --- Cabecera ---

export const FUAMappingFechaAtencionSchema = z.object({
    dia: z.number().int(),
    mes: z.number().int(),
    anio: z.number().int(),
    hora: z.string(),
});

export const FUAMappingIpressSchema = z.object({
    codigo_renipress: z.string(),
    nombre: z.string(),
});

// --- Personal que atiende ---

export const FUAMappingPersonalAtencionSchema = z.object({
    de_la_ipress: z.boolean().default(false),
    itinerante: z.boolean().default(false),
    plan_mas_salud: z.boolean().default(false),
    oferta_flexible: z.boolean().default(false),
    telesalud: z.boolean().default(false),
    codigo_oferta_flexible: z.string().default(""),
});

export const FUAMappingLugarAtencionSchema = z.object({
    intramural: z.boolean().default(false),
    extramural: z.boolean().default(false),
});

export const FUAMappingTipoAtencionSchema = z.object({
    ambulatoria: z.boolean().default(false),
    referencia: z.boolean().default(false),
    emergencia: z.boolean().default(false),
});

export const FUAMappingReferenciaRealizadaPorSchema = z.object({
    codigo_renaes: z.string().default(""),
    nombre_ipress: z.string().default(""),
    nro_hoja_referencia: z.string().default(""),
});

// --- Del asegurado / usuario ---

export const FUAMappingIdentificacionSchema = z.object({
    tipo_documento: z.string(),
    nro_documento: z.string(),
});

export const FUAMappingCodigoSisSchema = z.object({
    diresa_otros: z.string().default(""),
    numero: z.string().default(""),
});

export const FUAMappingDatosPersonalesSchema = z.object({
    apellido_paterno: z.string().default(""),
    apellido_materno: z.string().default(""),
    primer_nombre: z.string().default(""),
    otros_nombres: z.string().default(""),
});

export const FUAMappingSexoSchema = z.object({
    masculino: z.boolean().default(false),
    femenino: z.boolean().default(false),
});

export const FUAMappingFechaNacimientoSchema = z.object({
    dia: z.number().int().nullable().default(null),
    mes: z.number().int().nullable().default(null),
    anio: z.number().int().nullable().default(null),
});

export const FUAMappingSaludMaternaSchema = z.object({
    gestante: z.boolean().default(false),
    puerpera: z.boolean().default(false),
    fecha_probable_parto_dia: z.number().int().nullable().default(null),
    fecha_probable_parto_mes: z.number().int().nullable().default(null),
    fecha_probable_parto_anio: z.number().int().nullable().default(null),
    fecha_fallecimiento_dia: z.number().int().nullable().default(null),
    fecha_fallecimiento_mes: z.number().int().nullable().default(null),
    fecha_fallecimiento_anio: z.number().int().nullable().default(null),
});

export const FUAMappingAseguradoSchema = z.object({
    identificacion: FUAMappingIdentificacionSchema,
    codigo_sis: FUAMappingCodigoSisSchema,
    datos_personales: FUAMappingDatosPersonalesSchema,
    sexo: FUAMappingSexoSchema,
    fecha_nacimiento: FUAMappingFechaNacimientoSchema,
    salud_materna: FUAMappingSaludMaternaSchema,
    nro_historia_clinica: z.string().default(""),
    etnia: z.string().default(""),
    dni_rn_1: z.string().default(""),
    dni_rn_2: z.string().default(""),
    dni_rn_3: z.string().default(""),
});

// --- De la atención ---

export const FUAMappingFechaSchema = z.object({
    dia: z.number().int().nullable().default(null),
    mes: z.number().int().nullable().default(null),
    anio: z.number().int().nullable().default(null),
});

export const FUAMappingHospitalizacionSchema = z.object({
    atencion_directa: z.boolean().default(false),
    cob_extraordinaria_nro_autorizacion: z.string().default(""),
    cob_extraordinaria_monto: z.number().nullable().default(null),
    carta_garantia_nro_autorizacion: z.string().default(""),
    carta_garantia_monto: z.number().nullable().default(null),
    traslado: z.boolean().default(false),
    sepelio_natimuerto: z.boolean().default(false),
    sepelio_obito: z.boolean().default(false),
    sepelio_otro: z.boolean().default(false),
});

export const FUAMappingDestinoAseguradoSchema = z.object({
    alta: z.boolean().default(false),
    cita: z.boolean().default(false),
    hospitalizacion: z.boolean().default(false),
    referido_emergencia: z.boolean().default(false),
    referido_consulta_externa: z.boolean().default(false),
    referido_apoyo_diagnostico: z.boolean().default(false),
    contrareferido: z.boolean().default(false),
    fallecido: z.boolean().default(false),
    corte_administrativo: z.boolean().default(false),
});

export const FUAMappingAtencionSchema = z.object({
    ups: z.string().default(""),
    codigo_prestacional: z.string(),
    codigos_prestacionales_adicionales: z.array(z.string()).default([]),
    reporte_vinculado: z.string().default(""),
    codigo_autorizacion: z.string().default(""),
    fua_vinculado: z.string().default(""),
    fecha_ingreso: FUAMappingFechaSchema,
    fecha_alta: FUAMappingFechaSchema,
    fecha_corte_administrativo: FUAMappingFechaSchema,
    hospitalizacion: FUAMappingHospitalizacionSchema,
    destino_asegurado: FUAMappingDestinoAseguradoSchema,
    ipress_referencia_codigo: z.string().default(""),
    ipress_referencia_nombre: z.string().default(""),
    nro_hoja_referencia: z.string().default(""),
});

// --- Actividades preventivas ---

export const FUAMappingVacunaSchema = z.object({
    aplicada: z.boolean().default(false),
    nro_dosis: z.number().int().nullable().default(null),
});

export const FUAMappingActividadesPreventivas = z.object({
    peso_kg: z.number().nullable().default(null),
    talla_cm: z.number().nullable().default(null),
    pa_mmhg: z.string().default(""),

    // Gestante
    cpn_nro: z.number().int().nullable().default(null),
    edad_gestacional_sem: z.number().int().nullable().default(null),
    altura_uterina: z.number().nullable().default(null),
    parto_vertical: z.boolean().default(false),
    control_puerperio_nro: z.number().int().nullable().default(null),

    // Recién nacido
    edad_gestacional_rn_sem: z.number().int().nullable().default(null),
    apgar_1: z.number().int().nullable().default(null),
    apgar_5: z.number().int().nullable().default(null),
    corte_tardio_cordon: z.boolean().default(false),
    rn_prematuro: z.boolean().default(false),
    bajo_peso_al_nacer: z.boolean().default(false),
    enfer_congenita_secuela: z.boolean().default(false),
    nro_familiares_gest_puerp: z.number().int().nullable().default(null),

    // Gestante/Niño/Adulto
    cred_nro: z.number().int().nullable().default(null),
    pab_cm: z.number().nullable().default(null),
    tap_eedp_tepsi: z.boolean().default(false),
    consejeria_nutricional: z.boolean().default(false),
    consejeria_integral: z.boolean().default(false),
    imc_kg_m2: z.number().nullable().default(null),

    // Joven/Adulto
    evaluacion_integral: z.boolean().default(false),
    vacam: z.boolean().default(false),
    tamizaje_salud_mental: z.boolean().default(false),

    // Vacunas
    bcg: FUAMappingVacunaSchema,
    dpt: FUAMappingVacunaSchema,
    apo: FUAMappingVacunaSchema,
    asa: FUAMappingVacunaSchema,
    spr: FUAMappingVacunaSchema,
    sr: FUAMappingVacunaSchema,
    hvb: FUAMappingVacunaSchema,
    influenza: FUAMappingVacunaSchema,
    parotid: FUAMappingVacunaSchema,
    rubeola: FUAMappingVacunaSchema,
    rotavirus: FUAMappingVacunaSchema,
    dt_adulto: FUAMappingVacunaSchema,
    pentaval: FUAMappingVacunaSchema,
    antiamarilica: FUAMappingVacunaSchema,
    antineumoc: FUAMappingVacunaSchema,
    antitetanica: FUAMappingVacunaSchema,
    completas_para_edad: z.boolean().nullable().default(null),
    vph: FUAMappingVacunaSchema,
    ipv: FUAMappingVacunaSchema,
    varicela: FUAMappingVacunaSchema,
    otra_vacuna: FUAMappingVacunaSchema,
    grupo_riesgo_hvb: z.number().int().nullable().default(null),
});

// --- Diagnósticos ---

export const FUAMappingDiagnosticoSchema = z.object({
    descripcion: z.string().default(""),
    cie10_ingreso: z.string().default(""),
    cie10_egreso: z.string().default(""),
    tipo_ingreso: z.enum(["PRESUNTIVO", "DEFINITIVO", "REPETITIVO"]).nullable().default(null),
    tipo_egreso: z.enum(["PRESUNTIVO", "DEFINITIVO", "REPETITIVO"]).nullable().default(null),
});

// --- Medicamentos ---

export const FUAMappingMedicamentoSchema = z.object({
    codigo_sismed: z.string(),
    nombre: z.string(),
    forma_farmaceutica: z.string().default(""),
    concentracion: z.string().default(""),
    prescrito: z.number().int().min(0).default(0),
    entregado: z.number().int().min(0).default(0),
    diagnostico: z.number().int().min(0).default(0),
});

// --- Insumos complementarios ---

export const FUAMappingInsumoSchema = z.object({
    codigo: z.string(),
    nombre: z.string(),
    indicado: z.number().int().min(0).default(0),
    ejecutado: z.number().int().min(0).default(0),
    diagnostico: z.number().int().min(0).default(0),
    resultado: z.number().min(1).max(30).multipleOf(0.01).nullable().default(null),
});

// --- Procedimientos / Diagnóstico por Imágenes / Laboratorio ---

export const FUAMappingProcedimientoSchema = z.object({
    codigo: z.string(),
    nombre: z.string(),
    indicado: z.number().int().min(0).default(0),
    ejecutado: z.number().int().min(0).default(0),
    diagnostico: z.number().int().min(0).default(0),
    resultado: z.number().min(1).max(30).multipleOf(0.01).nullable().default(null),
});

// --- Sub-componente prestacional ---

export const FUAMappingSubComponenteItemSchema = z.object({
    codigo: z.string(),
    nombre: z.string(),
    caracteristica: z.string().default(""),
    indicado_prescrito: z.number().int().min(0).default(0),
    ejecutado_entregado: z.number().int().min(0).default(0),
    diagnostico: z.number().int().min(0).default(0),
    resultado: z.number().min(1).max(30).multipleOf(0.01).nullable().default(null),
    nro_ticket: z.string().default(""),
    po: z.string().default(""),
});

// --- Responsable de la atención ---

export const FUAMappingResponsableAtencionSchema = z.object({
    nro_dni: z.string().default(""),
    nombre_completo: z.string().default(""),
    nro_colegiatura: z.string().default(""),
    especialidad: z.string().default(""),
    nro_rne: z.string().default(""),
    egresado: z.boolean().default(false),
});

// --- Entidad raíz: FUAMapping ---

export const FUAMappingSchema = z.object({
    fecha_atencion: FUAMappingFechaAtencionSchema,
    ipress: FUAMappingIpressSchema,
    personal_atencion: FUAMappingPersonalAtencionSchema,
    lugar_atencion: FUAMappingLugarAtencionSchema,
    tipo_atencion: FUAMappingTipoAtencionSchema,
    referencia_realizada_por: FUAMappingReferenciaRealizadaPorSchema,
    asegurado: FUAMappingAseguradoSchema,
    atencion: FUAMappingAtencionSchema,
    actividades_preventivas: FUAMappingActividadesPreventivas,
    diagnosticos: z.array(FUAMappingDiagnosticoSchema).max(5),
    medicamentos: z.array(FUAMappingMedicamentoSchema),
    insumos: z.array(FUAMappingInsumoSchema),
    procedimientos: z.array(FUAMappingProcedimientoSchema),
    sub_componente_prestacional: z.array(FUAMappingSubComponenteItemSchema),
    responsable_atencion: FUAMappingResponsableAtencionSchema,
});

export type FUAMappingFechaAtencion = z.infer<typeof FUAMappingFechaAtencionSchema>;
export type FUAMappingIpress = z.infer<typeof FUAMappingIpressSchema>;
export type FUAMappingPersonalAtencion = z.infer<typeof FUAMappingPersonalAtencionSchema>;
export type FUAMappingLugarAtencion = z.infer<typeof FUAMappingLugarAtencionSchema>;
export type FUAMappingTipoAtencion = z.infer<typeof FUAMappingTipoAtencionSchema>;
export type FUAMappingReferenciaRealizadaPor = z.infer<typeof FUAMappingReferenciaRealizadaPorSchema>;
export type FUAMappingAsegurado = z.infer<typeof FUAMappingAseguradoSchema>;
export type FUAMappingAtencion = z.infer<typeof FUAMappingAtencionSchema>;
export type FUAMappingActividadesPreventivasType = z.infer<typeof FUAMappingActividadesPreventivas>;
export type FUAMappingDiagnostico = z.infer<typeof FUAMappingDiagnosticoSchema>;
export type FUAMappingMedicamento = z.infer<typeof FUAMappingMedicamentoSchema>;
export type FUAMappingInsumo = z.infer<typeof FUAMappingInsumoSchema>;
export type FUAMappingProcedimiento = z.infer<typeof FUAMappingProcedimientoSchema>;
export type FUAMappingSubComponenteItem = z.infer<typeof FUAMappingSubComponenteItemSchema>;
export type FUAMappingResponsableAtencion = z.infer<typeof FUAMappingResponsableAtencionSchema>;
export type FUAMapping = z.infer<typeof FUAMappingSchema>;
