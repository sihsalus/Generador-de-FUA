import { beforeEach, describe, expect, jest, test } from '@jest/globals';
jest.mock('../implementation/sequelize/FUAFormatFromSchemaImplementation', () => ({ __esModule: true, default: { createSequelize: jest.fn(), editSequelize: jest.fn() } }));
jest.mock('./BaseEntityVersionService', () => ({ __esModule: true, default: { create: jest.fn() } }));
import service from './FUAFormatFromSchemaService';
import implementation from '../implementation/sequelize/FUAFormatFromSchemaImplementation';
import { FUAFormatValidationError } from '../errors/FUAFormatValidationError';

describe('Invalid template persistence boundary', () => {
    beforeEach(() => { jest.clearAllMocks(); });
    const data = { name: 'synthetic', codeName: 'test', versionTag: '1', versionNumber: 1,
        content: '{"name":"synthetic","codeName":"test","versionTag":11}', createdBy: 'test', updatedBy: 'test', uuid: 'synthetic' };
    test('does not persist a malformed create', async () => {
        await expect(service.create(data)).rejects.toBeInstanceOf(FUAFormatValidationError);
        expect(implementation.createSequelize).not.toHaveBeenCalled();
    });
    test('does not persist a malformed edit', async () => {
        await expect(service.edit(data)).rejects.toBeInstanceOf(FUAFormatValidationError);
        expect(implementation.editSequelize).not.toHaveBeenCalled();
    });
});
