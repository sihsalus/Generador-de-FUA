import { z } from "zod";
import { extractFields } from "../visitExtractor";
import { RC_01FieldMap } from "./RC_01FieldMap";

const RC_01Schema = z.object({
    codigo_prestacional: z.string(),
    fecha_nac:           z.string(),
    fecha_ingreso:       z.string(),
    sexo:                z.enum(["M", "F"]),
    hospitalizacion:     z.boolean(),
    gestante:            z.boolean(),
    puerpera:            z.boolean(),
});

export type RC01Data = z.infer<typeof RC_01Schema>;

export const RC_01Group = {
    name:     "RC_01",
    extract:  (payload: Record<string, unknown>) => extractFields(payload, RC_01FieldMap),
    validate: (raw: unknown) => RC_01Schema.safeParse(raw),
    process:  (data: RC01Data): RC01Data => data,
};
