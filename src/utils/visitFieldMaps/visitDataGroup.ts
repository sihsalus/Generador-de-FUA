import { z } from "zod";
import { extractFields } from "../visitExtractor";
import { visitDataFieldMap } from "./visitDataFieldMap";

const visitDataSchema = z.object({
    codigo_prestacional: z.string(),
    fecha_nac:           z.string(),
    fecha_ingreso:       z.string(),
    sexo:                z.enum(["M", "F"]),
    hospitalizacion:     z.boolean(),
    gestante:            z.boolean(),
    puerpera:            z.boolean(),
});

export type VisitData = z.infer<typeof visitDataSchema>;

export const visitDataGroup = {
    name:      "visitData",
    extract:   (payload: Record<string, unknown>) => extractFields(payload, visitDataFieldMap),
    validate:  (raw: unknown) => visitDataSchema.safeParse(raw),
    process:   (data: VisitData): VisitData => data,
};
