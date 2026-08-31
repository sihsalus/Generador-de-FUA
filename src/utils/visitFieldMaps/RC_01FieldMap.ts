import { FieldMap } from "../visitExtractor";

const CONSULTA_MEDICA = "Consulta Médica";
const UUID_CODIGO_PRESTACIONAL = "PRESCODE-0001-AAAAAAAAAAAAAAAAAAAAAAA";
const UUID_HOSPITALIZACION = "HOSPITALIZACION-0001-AAAAAAAAAAAAAAAAAAA";
const UUID_GESTANTE = "GESTANTE-0001-AAAAAAAAAAAAAAAAAAAAAAA";
const UUID_PUERPERA = "PUERPERA-0001-AAAAAAAAAAAAAAAAAAAAAAA";

type RC01Fields =
    | "codigo_prestacional"
    | "fecha_nac"
    | "fecha_ingreso"
    | "sexo"
    | "hospitalizacion"
    | "gestante"
    | "puerpera";

function getConsultaMedica(payload: Record<string, unknown>) {
    const encounters = payload.encounters as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(encounters)) return undefined;
    return encounters.find(
        (e) => (e.encounterType as Record<string, unknown>)?.name === CONSULTA_MEDICA
    );
}

function getObsValue(payload: Record<string, unknown>, conceptUuid: string): unknown {
    const consulta = getConsultaMedica(payload);
    if (!consulta) return undefined;
    const obs = consulta.obs as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(obs)) return undefined;
    const match = obs.find(
        (o) => (o.concept as Record<string, unknown>)?.uuid === conceptUuid
    );
    return match?.value;
}

export const RC_01FieldMap: FieldMap<RC01Fields> = {
    codigo_prestacional: (p) => getObsValue(p, UUID_CODIGO_PRESTACIONAL),

    fecha_nac: (p) =>
        (p.patient as Record<string, unknown>)?.person
            ? ((p.patient as Record<string, unknown>).person as Record<string, unknown>).birthdate
            : undefined,

    fecha_ingreso: (p) => p.startDatetime,

    sexo: (p) =>
        (p.patient as Record<string, unknown>)?.person
            ? ((p.patient as Record<string, unknown>).person as Record<string, unknown>).gender
            : undefined,

    hospitalizacion: (p) => getObsValue(p, UUID_HOSPITALIZACION),

    gestante: (p) => getObsValue(p, UUID_GESTANTE),

    puerpera: (p) => getObsValue(p, UUID_PUERPERA),
};
