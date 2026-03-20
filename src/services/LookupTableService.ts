import { z } from "zod";
import { sequelize } from "../modelsSequelize/database";
import LookupTableImplementation from "../implementation/sequelize/LookupTableImplementation";
import LookupTableRowImplementation from "../implementation/sequelize/LookupTableRowImplementation";
import RuleSetService from "./RuleSetService";
import { CREATED_BY_PLACEHOLDER } from "../utils/constants";

// ── Zod Schemas ──

const columnDefSchema = z.object({
    columnName: z.string().min(1).max(100),
    targetField: z.string().min(1).max(255),
    constraintKey: z.string().min(1).max(100),
    dataType: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'DATE']),
});

const createLookupTableSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    keyField: z.string().min(1).max(255),
    columns: z.array(columnDefSchema).min(1, "Se requiere al menos una columna"),
});

const updateLookupTableSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    keyField: z.string().min(1).max(255).optional(),
    columns: z.array(columnDefSchema).min(1).optional(),
});

const createRowSchema = z.object({
    keyValue: z.string().min(1).max(255),
    values: z.record(z.any()),
});

const importTableSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    keyField: z.string().min(1).max(255),
    columns: z.array(columnDefSchema).min(1),
    rows: z.array(z.object({
        keyValue: z.string().min(1),
        values: z.record(z.any()),
    })).min(1, "Se requiere al menos una fila"),
});

class LookupTableService {

    /**
     * Crea una LookupTable vacía (sin filas) asociada a un RuleSet.
     */
    async create(ruleSetId: number, data: Record<string, any>) {
        const parsed = createLookupTableSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("Datos inválidos para crear LookupTable");
            err.details = parsed.error.flatten().fieldErrors;
            throw err;
        }

        // Verificar que el RuleSet existe
        await RuleSetService.getByIdOrUUID(String(ruleSetId));

        // Verificar nombre no duplicado en el RuleSet
        const existing = await LookupTableImplementation.getByNameAndRuleSetSequelize(parsed.data.name, ruleSetId);
        if (existing) {
            const err: any = new Error(`Ya existe una LookupTable con nombre '${parsed.data.name}' en este RuleSet`);
            err.status = 409;
            throw err;
        }

        const created = await LookupTableImplementation.createLookupTableSequelize({
            RuleSetId: ruleSetId,
            ...parsed.data,
            createdBy: CREATED_BY_PLACEHOLDER,
        });

        return { uuid: created.get('uuid'), id: created.get('id') };
    }

    /**
     * Lista todas las LookupTables de un RuleSet.
     */
    async listByRuleSet(ruleSetId: number) {
        return await LookupTableImplementation.listByRuleSetSequelize(ruleSetId);
    }

    /**
     * Obtiene una LookupTable por ID o UUID.
     */
    async getByIdOrUUID(idReceived: string) {
        const isNumeric = /^\d+$/.test(idReceived);
        let item;

        if (isNumeric) {
            item = await LookupTableImplementation.getByIdSequelize(Number(idReceived));
        } else {
            // Intentar por UUID primero, luego por nombre
            item = await LookupTableImplementation.getByUUIDSequelize(idReceived);
            if (!item) {
                item = await LookupTableImplementation.getByNameSequelize(idReceived);
            }
        }

        if (!item) {
            const err: any = new Error(`LookupTable '${idReceived}' no encontrada`);
            err.status = 404;
            throw err;
        }

        return item;
    }

    /**
     * Obtiene una LookupTable completa con todas sus filas.
     */
    async getFullTable(idReceived: string) {
        const table = await this.getByIdOrUUID(idReceived);
        const id = table.get('id') as number;
        const full = await LookupTableImplementation.getFullTableSequelize(id);

        if (!full) {
            const err: any = new Error(`LookupTable '${idReceived}' no encontrada`);
            err.status = 404;
            throw err;
        }

        const plain = full.get({ plain: true }) as any;
        return {
            id: plain.id,
            uuid: plain.uuid,
            name: plain.name,
            description: plain.description,
            keyField: plain.keyField,
            columns: plain.columns,
            rows: (plain.LookupTableRows || []).map((r: any) => ({
                id: r.id,
                uuid: r.uuid,
                keyValue: r.keyValue,
                values: r.values,
            })),
        };
    }

    /**
     * Actualiza metadata de una LookupTable.
     */
    async update(idReceived: string, data: Record<string, any>) {
        const parsed = updateLookupTableSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("Datos inválidos para actualizar LookupTable");
            err.details = parsed.error.flatten().fieldErrors;
            throw err;
        }

        const existing = await this.getByIdOrUUID(idReceived);
        const id = existing.get('id') as number;
        await LookupTableImplementation.updateLookupTableSequelize(id, parsed.data);
        return { uuid: existing.get('uuid'), updated: true };
    }

    /**
     * Soft-delete de una LookupTable y todas sus filas.
     */
    async softDelete(idReceived: string, inactiveBy: string, inactiveReason?: string) {
        const existing = await this.getByIdOrUUID(idReceived);
        const id = existing.get('id') as number;

        const transaction = await sequelize.transaction();
        try {
            await LookupTableRowImplementation.softDeleteRowsByTableIdSequelize(id, inactiveBy);
            await LookupTableImplementation.softDeleteLookupTableSequelize(id, inactiveBy, inactiveReason);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        return { uuid: existing.get('uuid'), deleted: true };
    }

    // ─── ROW OPERATIONS ───

    /**
     * Agrega una fila a una LookupTable.
     */
    async addRow(tableIdOrUUID: string, data: Record<string, any>) {
        const parsed = createRowSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("Datos inválidos para crear fila");
            err.details = parsed.error.flatten().fieldErrors;
            throw err;
        }

        const table = await this.getByIdOrUUID(tableIdOrUUID);
        const tableId = table.get('id') as number;

        // Verificar keyValue no duplicado
        const existing = await LookupTableRowImplementation.getByKeyValueSequelize(tableId, parsed.data.keyValue);
        if (existing) {
            const err: any = new Error(`Ya existe una fila con keyValue '${parsed.data.keyValue}' en esta tabla`);
            err.status = 409;
            throw err;
        }

        // Validar que los valores coinciden con las columnas definidas
        const columns = table.get('columns') as any[];
        this.validateRowValues(parsed.data.values, columns);

        const created = await LookupTableRowImplementation.createRowSequelize({
            LookupTableId: tableId,
            ...parsed.data,
            createdBy: CREATED_BY_PLACEHOLDER,
        });

        return { uuid: created.get('uuid'), id: created.get('id') };
    }

    /**
     * Actualiza una fila existente.
     */
    async updateRow(tableIdOrUUID: string, rowId: number, data: Record<string, any>) {
        const table = await this.getByIdOrUUID(tableIdOrUUID);
        const columns = table.get('columns') as any[];

        const row = await LookupTableRowImplementation.getByIdSequelize(rowId);
        if (!row) {
            const err: any = new Error(`Fila ${rowId} no encontrada`);
            err.status = 404;
            throw err;
        }

        if (data.values) {
            this.validateRowValues(data.values, columns);
        }

        await LookupTableRowImplementation.updateRowSequelize(rowId, data);
        return { uuid: row.get('uuid'), updated: true };
    }

    /**
     * Elimina una fila (soft delete).
     */
    async deleteRow(rowId: number, inactiveBy: string) {
        const row = await LookupTableRowImplementation.getByIdSequelize(rowId);
        if (!row) {
            const err: any = new Error(`Fila ${rowId} no encontrada`);
            err.status = 404;
            throw err;
        }

        await LookupTableRowImplementation.softDeleteRowSequelize(rowId, inactiveBy);
        return { uuid: row.get('uuid'), deleted: true };
    }

    /**
     * Importa una LookupTable completa (definición + filas) en una transacción atómica.
     */
    async importFullTable(ruleSetId: number, data: Record<string, any>) {
        const parsed = importTableSchema.safeParse(data);
        if (!parsed.success) {
            const err: any = new Error("JSON de importación de LookupTable inválido");
            err.details = parsed.error.flatten().fieldErrors;
            throw err;
        }

        // Verificar RuleSet
        await RuleSetService.getByIdOrUUID(String(ruleSetId));

        // Validar keyValues únicos
        const keyValues = parsed.data.rows.map(r => r.keyValue);
        const uniqueKeys = new Set(keyValues);
        if (uniqueKeys.size !== keyValues.length) {
            const err: any = new Error("Hay keyValues duplicados en las filas");
            err.status = 422;
            throw err;
        }

        // Validar cada fila contra las columnas
        for (const row of parsed.data.rows) {
            this.validateRowValues(row.values, parsed.data.columns);
        }

        const transaction = await sequelize.transaction();
        try {
            const table = await LookupTableImplementation.createLookupTableSequelize({
                RuleSetId: ruleSetId,
                name: parsed.data.name,
                description: parsed.data.description,
                keyField: parsed.data.keyField,
                columns: parsed.data.columns,
                createdBy: CREATED_BY_PLACEHOLDER,
            });

            const tableId = table.get('id') as number;

            const rowsToCreate = parsed.data.rows.map(r => ({
                LookupTableId: tableId,
                keyValue: r.keyValue,
                values: r.values,
                createdBy: CREATED_BY_PLACEHOLDER,
            }));

            await LookupTableRowImplementation.bulkCreateRowsSequelize(rowsToCreate);

            await transaction.commit();

            return {
                uuid: table.get('uuid'),
                id: tableId,
                rowsCreated: parsed.data.rows.length,
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Exporta una LookupTable completa a JSON.
     */
    async exportFullTable(tableIdOrUUID: string) {
        const full = await this.getFullTable(tableIdOrUUID);
        return {
            $schema: "lookup-table-v1",
            version: "1.0.0",
            exportedAt: new Date().toISOString(),
            table: full,
        };
    }

    // ─── RESOLUCIÓN EN TIEMPO DE EVALUACIÓN ───

    /**
     * Dado un tableId y un keyValue, devuelve los constraints resueltos.
     * Este método es usado por el ruleEvaluator para resolver dinámicamente
     * los constraints de un PARAMETER que referencia una LookupTable.
     *
     * Retorna un mapa: { targetField → { constraintKey: value } }
     */
    async resolveConstraints(tableId: number, keyValue: string): Promise<Record<string, Record<string, any>> | null> {
        const table = await LookupTableImplementation.getByIdSequelize(tableId);
        if (!table) return null;

        const row = await LookupTableRowImplementation.getByKeyValueSequelize(tableId, keyValue);
        if (!row) return null;

        const columns = table.get('columns') as any[];
        const rowValues = row.get('values') as Record<string, any>;

        // Construir mapa: targetField → constraints parciales
        const resolved: Record<string, Record<string, any>> = {};
        for (const col of columns) {
            if (!resolved[col.targetField]) {
                resolved[col.targetField] = {};
            }
            resolved[col.targetField][col.constraintKey] = rowValues[col.columnName];
        }

        return resolved;
    }

    /**
     * Retorna todas las keyValues de una LookupTable.
     * Usado por el evaluador para resolver CONDITIONs con "IN lookup(...)".
     */
    async getAllKeys(tableId: number): Promise<string[]> {
        const rows = await LookupTableRowImplementation.listByTableIdSequelize(tableId);
        return rows.map((r: any) => r.get('keyValue') as string);
    }

    // ─── HELPERS PRIVADOS ───

    /**
     * Valida que los values de una fila contengan todas las columnName definidas.
     */
    private validateRowValues(values: Record<string, any>, columns: any[]) {
        const missingColumns: string[] = [];
        for (const col of columns) {
            if (!(col.columnName in values)) {
                missingColumns.push(col.columnName);
            }
        }

        if (missingColumns.length > 0) {
            const err: any = new Error(
                `Faltan valores para las columnas: ${missingColumns.join(', ')}`
            );
            err.status = 422;
            throw err;
        }
    }
}

export default new LookupTableService();
