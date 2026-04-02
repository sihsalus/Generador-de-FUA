import { EdadCalculada } from "../context";
import { VisitPayloadSchema } from "../visitPayload";
import { consolidateResults, createRuleResult } from "../results";
import { ValidationContext } from "../context";

// --- Helpers ---

function date(str: string): Date {
    return new Date(str + "T00:00:00.000Z");
}

function buildVisitPayloadMinimo(overrides: Record<string, unknown> = {}) {
    return {
        uuid: "549e5078-ec89-41b5-9691-adb8e16999e4",
        display: "Consulta Ambulatoria @ UPSS - CONSULTA EXTERNA - 25/03/2026 10:37",

        patient: {
            uuid: "26cdcb17-2226-474e-800b-155bc1ba2d25",
            display: "58147747 - Ignacio TORRES CUETO",
        },
        patient_details: {
            fecha_nacimiento: date("1990-06-15"),
            sexo: "M",
            nombres: "IGNACIO",
            apellido_paterno: "TORRES",
            apellido_materno: "CUETO",
            documento_identidad: "58147747",
            tipo_documento: "DNI",
        },
        visitType: {
            uuid: "b1f0e8a1-9c5d-4f0e-8892-81f3140fbc09",
            display: "Consulta Ambulatoria",
        },
        location: {
            uuid: "35d2234e-129a-4c40-abb2-1ae0b2400001",
            display: "UPSS - CONSULTA EXTERNA",
        },

        startDatetime: date("2026-03-25"),
        stopDatetime: null,

        encounters: [],
        attributes: [],

        fua: {
            numero_fua: "001-00234",
            lote: "26",
            fecha_digitacion: date("2026-03-26"),

            ipress: {
                codigo_renipress: "00000066",
                nombre: "HOSPITAL II-1 SANTA CLOTILDE",
                nivel_atencion: "II",
                categoria: "II-1",
                codigo_oferta_flexible: "",
            },

            codigo_prestacional: "301",
            codigos_prestacionales_adicionales: [],
            ups: "001",
            fua_vinculado: "",
            reporte_vinculado: "",

            asegurado_sis: {
                codigo_asegurado: "7-58147747",
                diresa: "166",
                contrato: "S.I.S",
            },
            condicion: {
                gestante: false,
                puerpera: false,
                hospitalizado: false,
            },
            hospitalizacion: {
                fecha_ingreso: null,
                atencion_directa: false,
                cob_extraordinaria: false,
                monto_cob: null,
                carta_garantia: false,
                monto_carta: null,
                traslado: false,
                sepelio: false,
            },
            destino_asegurado: "ALTA",
            referencia: {
                ipress_origen_codigo: "",
                ipress_origen_nombre: "",
                numero_hoja_referencia: "",
                ipress_destino_codigo: "",
                ipress_destino_nombre: "",
            },
            responsable_atencion: {
                dni: "43218765",
                tipo_profesional: 1,
                colegiatura: "CMP-12345",
            },

            diagnosticos: [
                {
                    posicion: 1,
                    descripcion: "RINOFARINGITIS AGUDA",
                    codigo_cie10: "J00",
                    tipo: "DEFINITIVO",
                },
            ],
            medicamentos: [],
            insumos: [],
            procedimientos: [],

            sub_componente_prestacional: {
                medicamentos_monto: 0,
                insumos_monto: 0,
                procedimientos_monto: 0,
            },
        },

        ...overrides,
    };
}

// --- EdadCalculada ---

describe("EdadCalculada", () => {
    it("recien nacido 0 dias", () => {
        const edad = EdadCalculada.fromDates(date("2025-03-15"), date("2025-03-15"));
        expect(edad.anios).toBe(0);
        expect(edad.meses).toBe(0);
        expect(edad.dias).toBe(0);
        expect(edad.total_dias).toBe(0);
    });

    it("recien nacido 1 dia", () => {
        const edad = EdadCalculada.fromDates(date("2025-03-15"), date("2025-03-16"));
        expect(edad.anios).toBe(0);
        expect(edad.meses).toBe(0);
        expect(edad.dias).toBe(1);
        expect(edad.total_dias).toBe(1);
    });

    it("exactamente 12 anios", () => {
        const edad = EdadCalculada.fromDates(date("2013-03-15"), date("2025-03-15"));
        expect(edad.anios).toBe(12);
        expect(edad.meses).toBe(0);
        expect(edad.dias).toBe(0);
    });

    it("11 anios 11 meses 29 dias", () => {
        const edad = EdadCalculada.fromDates(date("2013-03-16"), date("2025-03-15"));
        expect(edad.anios).toBe(11);
        expect(edad.meses).toBe(11);
        expect(edad.dias).toBe(27);
    });

    it("29 de febrero - anio bisiesto", () => {
        const edad = EdadCalculada.fromDates(date("2024-02-29"), date("2025-02-28"));
        expect(edad.anios).toBe(0);
        expect(edad.meses).toBe(11);
        expect(edad.dias).toBe(30);
    });

    it("29 de febrero cumple 1 anio en bisiesto", () => {
        const edad = EdadCalculada.fromDates(date("2024-02-29"), date("2025-03-01"));
        expect(edad.anios).toBe(1);
        expect(edad.meses).toBe(0);
        expect(edad.dias).toBe(0);
    });

    it("falla si fecha referencia es anterior a nacimiento", () => {
        expect(() => {
            EdadCalculada.fromDates(date("2025-03-15"), date("2020-01-01"));
        }).toThrow("anterior");
    });

    it("edad avanzada - 85 anios", () => {
        const edad = EdadCalculada.fromDates(date("1940-01-01"), date("2025-03-15"));
        expect(edad.anios).toBe(85);
        expect(edad.meses).toBe(2);
        expect(edad.dias).toBe(14);
    });

    it("total_dias es consistente para 1 anio exacto", () => {
        const edad = EdadCalculada.fromDates(date("2024-03-15"), date("2025-03-15"));
        expect(edad.anios).toBe(1);
        expect(edad.total_dias).toBe(365);
    });

    it("toJSON retorna objeto serializable", () => {
        const edad = EdadCalculada.fromDates(date("2020-06-15"), date("2025-03-15"));
        const json = edad.toJSON();
        expect(json).toEqual({
            anios: 4,
            meses: 9,
            dias: 0,
            total_dias: expect.any(Number),
        });
    });
});

// --- VisitPayloadSchema ---

describe("VisitPayloadSchema", () => {
    it("valida un payload minimo correcto", () => {
        const result = VisitPayloadSchema.safeParse(buildVisitPayloadMinimo());
        expect(result.success).toBe(true);
    });

    it("falla sin uuid", () => {
        const data = buildVisitPayloadMinimo();
        delete (data as any).uuid;
        const result = VisitPayloadSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("falla con sexo invalido en patient_details", () => {
        const data = buildVisitPayloadMinimo({
            patient_details: {
                ...buildVisitPayloadMinimo().patient_details,
                sexo: "X",
            },
        });
        const result = VisitPayloadSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("acepta campos opcionales ausentes", () => {
        const data = buildVisitPayloadMinimo();
        const result = VisitPayloadSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.stopDatetime).toBeNull();
        }
    });

    it("acepta fechas como string ISO", () => {
        const data = buildVisitPayloadMinimo({
            startDatetime: "2026-03-25T10:37:40.000+0000",
        });
        const result = VisitPayloadSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("valida diagnostico con tipo invalido", () => {
        const data = buildVisitPayloadMinimo();
        data.fua = {
            ...data.fua,
            diagnosticos: [
                { posicion: 1, descripcion: "TEST", codigo_cie10: "J06.9", tipo: "INVALIDO" },
            ],
        } as any;
        const result = VisitPayloadSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("falla sin numero_fua en bloque fua", () => {
        const data = buildVisitPayloadMinimo();
        delete (data.fua as any).numero_fua;
        const result = VisitPayloadSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("valida patient_details completo", () => {
        const data = buildVisitPayloadMinimo();
        const result = VisitPayloadSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.patient_details.documento_identidad).toBe("58147747");
            expect(result.data.patient_details.sexo).toBe("M");
        }
    });
});

// --- ValidationContext ---

describe("ValidationContext", () => {
    it("calcula edad automaticamente desde patient_details", () => {
        const ctx = new ValidationContext({
            visit: buildVisitPayloadMinimo() as any,
        });
        expect(ctx.edad_calculada.anios).toBe(35);
    });

    it("diagnosticoPrincipal retorna el de posicion 1", () => {
        const ctx = new ValidationContext({
            visit: buildVisitPayloadMinimo() as any,
        });
        expect(ctx.diagnosticoPrincipal).toBe("J00");
    });

    it("diagnosticoPrincipal retorna undefined sin diagnosticos", () => {
        const data = buildVisitPayloadMinimo();
        data.fua = { ...data.fua, diagnosticos: [] };
        const ctx = new ValidationContext({ visit: data as any });
        expect(ctx.diagnosticoPrincipal).toBeUndefined();
    });

    it("codigoPrestacional retorna el codigo del bloque fua", () => {
        const ctx = new ValidationContext({
            visit: buildVisitPayloadMinimo() as any,
        });
        expect(ctx.codigoPrestacional).toBe("301");
    });

    it("falla con datos invalidos", () => {
        expect(() => {
            new ValidationContext({ visit: {} as any });
        }).toThrow("ValidationContext: datos invalidos");
    });
});

// --- Results ---

describe("consolidateResults", () => {
    const visitUuid = "549e5078-ec89-41b5-9691-adb8e16999e4";

    it("allowed es true sin bloqueos", () => {
        const results = [
            createRuleResult({
                rule_id: "R1",
                rule_name: "Regla 1",
                passed: true,
                action: "BLOCK",
            }),
        ];
        const validation = consolidateResults(visitUuid, results);
        expect(validation.allowed).toBe(true);
        expect(validation.blocks).toHaveLength(0);
        expect(validation.visit_uuid).toBe(visitUuid);
    });

    it("allowed es false con al menos un bloqueo fallido", () => {
        const results = [
            createRuleResult({
                rule_id: "R1",
                rule_name: "Regla 1",
                passed: false,
                action: "BLOCK",
                message: "FUA bloqueado",
            }),
        ];
        const validation = consolidateResults(visitUuid, results);
        expect(validation.allowed).toBe(false);
        expect(validation.blocks).toHaveLength(1);
    });

    it("warnings no afectan allowed", () => {
        const results = [
            createRuleResult({
                rule_id: "R1",
                rule_name: "Regla 1",
                passed: false,
                action: "WARN",
                message: "Advertencia",
            }),
        ];
        const validation = consolidateResults(visitUuid, results);
        expect(validation.allowed).toBe(true);
        expect(validation.warnings).toHaveLength(1);
    });

    it("consolida enabled_fields desde reglas ENABLE", () => {
        const results = [
            createRuleResult({
                rule_id: "R1",
                rule_name: "Habilitar medicamentos",
                passed: true,
                action: "ENABLE",
                details: { field_name: "medicamentos" },
            }),
            createRuleResult({
                rule_id: "R2",
                rule_name: "Deshabilitar insumos",
                passed: false,
                action: "ENABLE",
                details: { field_name: "insumos" },
            }),
        ];
        const validation = consolidateResults(visitUuid, results);
        expect(validation.enabled_fields).toEqual({
            medicamentos: true,
            insumos: false,
        });
    });
});