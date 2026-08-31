import { z } from "zod";

import { TxtEntry, zipAndEncryptTxtFiles } from "../utils/utils";

const packageCreateSchema = z.object({
    fuaFromVisits: z.array(z.record(z.any())).min(1),
    password: z.string().min(1),
    archiveName: z.string().optional(),
});

type FUAFromVisitLike = Record<string, unknown>;

class PackageService {

    private buildTxtFileName(entity: FUAFromVisitLike, index: number) {
        const rawName = typeof entity.uuid === "string" && entity.uuid.trim().length > 0
            ? entity.uuid.trim()
            : `fua-from-visit-${index + 1}`;

        return `${rawName}.txt`;
    }

    private parseEntitiesToTxtEntries(entities: FUAFromVisitLike[]): TxtEntry[] {
        return entities.map((entity, index) => ({
            name: this.buildTxtFileName(entity, index),
            content: Buffer.from(JSON.stringify(entity, null, 2), "utf-8"),
        }));
    }

    async create(data: {
        fuaFromVisits: FUAFromVisitLike[];
        password: string;
        archiveName?: string;
    }) {
        const result = packageCreateSchema.safeParse(data);
        if (!result.success) {
            console.error("Error in Package Service - create: ZOD validation.\n", result.error);
            const newError = new Error("Error in Package Service - create: ZOD validation.");
            (newError as any).details = result.error;
            throw newError;
        }

        const txtFiles = this.parseEntitiesToTxtEntries(data.fuaFromVisits);
        const packageBuffer = await zipAndEncryptTxtFiles(txtFiles, data.password);

        return {
            archiveName: data.archiveName ?? "fua-package.zip.enc",
            fileData: packageBuffer,
            totalFiles: txtFiles.length,
        };
    }
}

export default new PackageService();