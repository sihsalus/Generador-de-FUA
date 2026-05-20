import * as fs from "fs";
import * as path from "path";
import { ScriptExecutorService } from "../../../services/ScriptExecutorService";

const script = fs.readFileSync(
    path.resolve(__dirname, "../RC_01.js"),
    "utf-8"
);

const DEFAULTS = { maxChars: 20000, maxTimeMs: 1000 };

function date(str: string): string {
    return str + "T00:00:00.000Z";
}

function buildPayload(overrides: Record<string, any> = {}) {
    return {
        fua: {
            codigo_prestacional: "301",
            condicion: { gestante: false, puerpera: false, hospitalizado: false },
            hospitalizacion: { fecha_ingreso: null },
            diagnosticos: [],
        },
        patient_details: {
            fecha_nacimiento: date("2020-01-01"),
            sexo: "M",
        },
        // edad_calculada de un niño de 5 años (startDatetime 2025-01-01)
        edad_calculada: { anios: 5, meses: 60, total_dias: 1826 },
        ...overrides,
    };
}

function run(payload: Record<string, any>) {
    return ScriptExecutorService.execute({ script, entity: {}, payload, ...DEFAULTS });
}

// ---------------------------------------------------------------------------

describe("RC_01 — código prestacional no admisible", () => {
    it("BLOCK si el código no existe en la tabla", () => {
        const r = run(buildPayload({ fua: { ...buildPayload().fua, codigo_prestacional: "999" } }));
        expect(r.success).toBe(true);
        expect(r.entity!.passed).toBe(false);
        expect(r.entity!.action).toBe("BLOCK");
        expect(r.entity!.message).toMatch(/no está admitido/);
    });
});

describe("RC_01 — validación de sexo", () => {
    it("pasa: código 301 (ambos sexos) con paciente M", () => {
        const r = run(buildPayload());
        expect(r.entity!.passed).toBe(true);
    });

    it("pasa: código 301 (ambos sexos) con paciente F", () => {
        const payload = buildPayload({ patient_details: { fecha_nacimiento: date("2020-01-01"), sexo: "F" } });
        const r = run(payload);
        expect(r.entity!.passed).toBe(true);
    });

    it("BLOCK: código 023 (solo M) con paciente F", () => {
        const r = run(buildPayload({
            fua: { ...buildPayload().fua, codigo_prestacional: "023" },
            patient_details: { fecha_nacimiento: date("1970-01-01"), sexo: "F" },
            edad_calculada: { anios: 55, meses: 660, total_dias: 20075 },
        }));
        expect(r.entity!.passed).toBe(false);
        expect(r.entity!.message).toMatch(/Sexo/);
    });

    it("BLOCK: código 025 (solo F) con paciente M", () => {
        const r = run(buildPayload({
            fua: { ...buildPayload().fua, codigo_prestacional: "025" },
            patient_details: { fecha_nacimiento: date("1990-01-01"), sexo: "M" },
            edad_calculada: { anios: 35, meses: 420, total_dias: 12775 },
        }));
        expect(r.entity!.passed).toBe(false);
        expect(r.entity!.message).toMatch(/Sexo/);
    });
});

describe("RC_01 — validación de hospitalización", () => {
    it("BLOCK: código 301 requiere N pero paciente hospitalizado", () => {
        const r = run(buildPayload({
            fua: {
                ...buildPayload().fua,
                codigo_prestacional: "301",
                condicion: { gestante: false, puerpera: false, hospitalizado: true },
            },
        }));
        expect(r.entity!.passed).toBe(false);
        expect(r.entity!.message).toMatch(/Hospitalización/);
    });

    it("pasa: código 051 requiere S y paciente hospitalizado (RN 10 días)", () => {
        const r = run(buildPayload({
            fua: {
                ...buildPayload().fua,
                codigo_prestacional: "051",
                condicion: { gestante: false, puerpera: false, hospitalizado: true },
                hospitalizacion: { fecha_ingreso: null },
            },
            edad_calculada: { anios: 0, meses: 0, total_dias: 10 },
        }));
        expect(r.entity!.passed).toBe(true);
    });
});

describe("RC_01 — regla especial código 306 + CIE-10 de parto", () => {
    it("pasa: código 306 con CIE-10 O800 fuerza hospitalización a S", () => {
        const r = run(buildPayload({
            fua: {
                codigo_prestacional: "306",
                condicion: { gestante: true, puerpera: true, hospitalizado: false },
                hospitalizacion: { fecha_ingreso: date("2025-01-01") },
                diagnosticos: [{ posicion: 1, codigo_cie10: "O800", tipo: "DEFINITIVO" }],
            },
            patient_details: { fecha_nacimiento: date("2000-01-01"), sexo: "F" },
            edad_calculada: { anios: 25, meses: 300, total_dias: 9131 },
        }));
        expect(r.entity!.passed).toBe(true);
    });

    it("BLOCK: código 306 sin CIE-10 de parto y hospitalización N, gestante F", () => {
        const r = run(buildPayload({
            fua: {
                codigo_prestacional: "306",
                condicion: { gestante: false, puerpera: false, hospitalizado: false },
                hospitalizacion: { fecha_ingreso: null },
                diagnosticos: [{ posicion: 1, codigo_cie10: "J00", tipo: "DEFINITIVO" }],
            },
            patient_details: { fecha_nacimiento: date("2000-01-01"), sexo: "F" },
            edad_calculada: { anios: 25, meses: 300, total_dias: 9131 },
        }));
        expect(r.entity!.passed).toBe(false);
    });
});

describe("RC_01 — validación de rango de edad", () => {
    it("BLOCK: código 301 (0-11 años) con paciente de 12 años exactos", () => {
        const r = run(buildPayload({
            edad_calculada: { anios: 12, meses: 144, total_dias: 4380 },
        }));
        expect(r.entity!.passed).toBe(false);
        expect(r.entity!.message).toMatch(/máximo/);
    });

    it("pasa: código 301 con paciente de 11 años (límite superior)", () => {
        const r = run(buildPayload({
            edad_calculada: { anios: 11, meses: 132, total_dias: 4015 },
        }));
        expect(r.entity!.passed).toBe(true);
    });

    it("BLOCK: código 002 (0-28 días) con paciente de 29 días", () => {
        const r = run(buildPayload({
            fua: { ...buildPayload().fua, codigo_prestacional: "002" },
            edad_calculada: { anios: 0, meses: 0, total_dias: 29 },
        }));
        expect(r.entity!.passed).toBe(false);
        expect(r.entity!.message).toMatch(/máximo/);
    });

    it("pasa: código 002 con paciente de 28 días (límite superior exacto)", () => {
        const r = run(buildPayload({
            fua: { ...buildPayload().fua, codigo_prestacional: "002" },
            edad_calculada: { anios: 0, meses: 0, total_dias: 28 },
        }));
        expect(r.entity!.passed).toBe(true);
    });

    it("BLOCK: código 029 (0-12 meses) con paciente de 13 meses", () => {
        const r = run(buildPayload({
            fua: { ...buildPayload().fua, codigo_prestacional: "029" },
            edad_calculada: { anios: 1, meses: 13, total_dias: 395 },
        }));
        expect(r.entity!.passed).toBe(false);
        expect(r.entity!.message).toMatch(/máximo/);
    });

    it("pasa: código 029 con paciente de 12 meses exactos", () => {
        const r = run(buildPayload({
            fua: { ...buildPayload().fua, codigo_prestacional: "029" },
            edad_calculada: { anios: 1, meses: 12, total_dias: 365 },
        }));
        expect(r.entity!.passed).toBe(true);
    });

    it("BLOCK: código 302 (12-17 años) con paciente de 11 años", () => {
        const r = run(buildPayload({
            fua: { ...buildPayload().fua, codigo_prestacional: "302" },
            edad_calculada: { anios: 11, meses: 132, total_dias: 4015 },
        }));
        expect(r.entity!.passed).toBe(false);
        expect(r.entity!.message).toMatch(/mínimo/);
    });
});

describe("RC_01 — edad calculada desde fecha_ingreso en hospitalizados", () => {
    it("usa fecha_ingreso para hospitalizado con RN de 5 días", () => {
        // nacimiento: 2025-01-01, ingreso: 2025-01-06 → 5 días → válido para código 051 (0-28 días)
        const r = run(buildPayload({
            fua: {
                codigo_prestacional: "051",
                condicion: { gestante: false, puerpera: false, hospitalizado: true },
                hospitalizacion: { fecha_ingreso: date("2025-01-06") },
                diagnosticos: [],
            },
            patient_details: { fecha_nacimiento: date("2025-01-01"), sexo: "M" },
            edad_calculada: { anios: 0, meses: 0, total_dias: 5 },
        }));
        expect(r.entity!.passed).toBe(true);
    });
});
