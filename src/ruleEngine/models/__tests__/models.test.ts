import { EdadCalculada } from "../context";
import { FuaSchema } from "../fua";
import { consolidateResults, createRuleResult } from "../results";
import { FuaContext } from "../context";

// --- Helpers ---

function date(str: string): Date {
    return new Date(str + "T00:00:00.000Z");
}

function buildFuaMinimo(overrides: Record<string, unknown> = {}) {
    return {
        numero_fua: "001-00001",
        lote: "25",
        codigo_prestacional: "301",
        fecha_atencion: date("2025-03-15"),
        asegurado: {
            documento_identidad: "12345678",
            tipo_documento: "DNI",
            nombres: "JUAN",
            apellido_paterno: "PEREZ",
            apellido_materno: "GARCIA",
            fecha_nacimiento: date("1990-06-15"),
            sexo: "M",
            codigo_afiliacion: "7-12345678",
            contrato: "166",
        },
        condicion: {
            gestante: false,
            puerpera: false,
            hospitalizado: false,
        },
        responsable_atencion: {
            tipo_profesional: 1,
            colegiatura: "CMP-12345",
            dni: "87654321",
        },
        diagnosticos: [
            { codigo_cie10: "J06.9", tipo: "DEFINITIVO", posicion: 1 },
        ],
        medicamentos: [],
        insumos: [],
        procedimientos: [],
        actividades_preventivas: [],
        ipress: {
            codigo_renipress: "00000066",
            nivel_atencion: "II",
            categoria: "II-1",
        },
        fecha_digitacion: date("2025-03-16"),
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

// --- FuaSchema ---

describe("FuaSchema", () => {
    it("valida un FUA minimo correcto", () => {
        const result = FuaSchema.safeParse(buildFuaMinimo());
        expect(result.success).toBe(true);
    });

    it("falla sin numero_fua", () => {
        const data = buildFuaMinimo();
        delete (data as any).numero_fua;
        const result = FuaSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("falla con sexo invalido", () => {
        const data = buildFuaMinimo({
            asegurado: {
                ...buildFuaMinimo().asegurado,
                sexo: "X",
            },
        });
        const result = FuaSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("acepta campos opcionales ausentes", () => {
        const data = buildFuaMinimo();
        const result = FuaSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.fecha_ingreso).toBeUndefined();
            expect(result.data.fecha_alta).toBeUndefined();
            expect(result.data.destino_asegurado).toBeUndefined();
        }
    });

    it("acepta fechas como string ISO", () => {
        const data = buildFuaMinimo({
            fecha_atencion: "2025-03-15",
        });
        const result = FuaSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("valida diagnostico con tipo invalido", () => {
        const data = buildFuaMinimo({
            diagnosticos: [
                { codigo_cie10: "J06.9", tipo: "INVALIDO", posicion: 1 },
            ],
        });
        const result = FuaSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// --- FuaContext ---

describe("FuaContext", () => {
    const historialVacio = {
        fuas_previos: [],
        prestaciones_periodo: {},
    };

    it("calcula edad automaticamente", () => {
        const ctx = new FuaContext({
            fua: buildFuaMinimo() as any,
            historial_asegurado: historialVacio,
        });
        expect(ctx.edad_calculada.anios).toBe(34);
    });

    it("diagnosticoPrincipal retorna el de posicion 1", () => {
        const ctx = new FuaContext({
            fua: buildFuaMinimo() as any,
            historial_asegurado: historialVacio,
        });
        expect(ctx.diagnosticoPrincipal).toBe("J06.9");
    });

    it("diagnosticoPrincipal retorna undefined sin diagnosticos", () => {
        const ctx = new FuaContext({
            fua: buildFuaMinimo({ diagnosticos: [] }) as any,
            historial_asegurado: historialVacio,
        });
        expect(ctx.diagnosticoPrincipal).toBeUndefined();
    });

    it("prestacionesDelMismoCodigo retorna array vacio si no hay historial", () => {
        const ctx = new FuaContext({
            fua: buildFuaMinimo() as any,
            historial_asegurado: historialVacio,
        });
        expect(ctx.prestacionesDelMismoCodigo).toEqual([]);
    });

    it("prestacionesDelMismoCodigo filtra por codigo prestacional", () => {
        const resumen = {
            numero_fua: "001-00002",
            codigo_prestacional: "301",
            fecha_atencion: date("2025-02-01"),
            diagnosticos_principales: ["J06.9"],
            ipress_codigo: "00000066",
        };
        const ctx = new FuaContext({
            fua: buildFuaMinimo() as any,
            historial_asegurado: {
                fuas_previos: [resumen],
                prestaciones_periodo: { "301": [resumen] },
            },
        });
        expect(ctx.prestacionesDelMismoCodigo).toHaveLength(1);
    });
});

// --- Results ---

describe("consolidateResults", () => {
    it("allowed es true sin bloqueos", () => {
        const results = [
            createRuleResult({
                rule_id: "R1",
                rule_name: "Regla 1",
                passed: true,
                action: "BLOCK",
            }),
        ];
        const validation = consolidateResults("001-00001", results);
        expect(validation.allowed).toBe(true);
        expect(validation.blocks).toHaveLength(0);
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
        const validation = consolidateResults("001-00001", results);
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
        const validation = consolidateResults("001-00001", results);
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
        const validation = consolidateResults("001-00001", results);
        expect(validation.enabled_fields).toEqual({
            medicamentos: true,
            insumos: false,
        });
    });
});
