import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Request, Response } from 'express';

jest.mock('../services/FUAFormatFromSchemaService', () => ({ __esModule: true, default: { renderById: jest.fn(), edit: jest.fn() } }));
jest.mock('../middleware/logger/models/typescript/Logger', () => ({ loggerInstance: { enviroment: 'test', printLog: jest.fn() } }));
jest.mock('../middleware/globalTransaction', () => ({ transactionInst: { renewTransaction: jest.fn(), confirmTransaction: jest.fn(), unconfirmTransaction: jest.fn() } }));

import controller from './FUAFormatFromSchemaController';
import service from '../services/FUAFormatFromSchemaService';
import { transactionInst } from '../middleware/globalTransaction';
import { FUAFormatValidationError } from '../errors/FUAFormatValidationError';

function response() {
    const res = { status: jest.fn(), json: jest.fn(), send: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
}

describe('FUA render HTTP responses', () => {
    beforeEach(() => { jest.clearAllMocks(); });
    test('returns 422 with the invalid field, without rendering an HTML startup page', async () => {
        const error = new FUAFormatValidationError([{ path: ['pages', 0, 'versionTag'], code: 'invalid_type', message: 'Se esperaba string; se recibió number.' }]);
        jest.mocked(service.renderById).mockRejectedValue(error);
        const res = response();
        await controller.render({ params: { id: 'synthetic-id' } } as unknown as Request, res as unknown as Response);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json).toHaveBeenCalledWith(error.response());
        expect(res.send).not.toHaveBeenCalled();
    });
    test('does not expose database messages or stack traces for unexpected failures', async () => {
        jest.mocked(service.renderById).mockRejectedValue(new Error('private database connection details'));
        const res = response();
        await controller.render({ params: { id: 'synthetic-id' } } as unknown as Request, res as unknown as Response);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'FUA_RENDER_FAILED', message: 'No se pudo generar el formato FUA.' });
    });
    test('preserves successful HTML rendering', async () => {
        jest.mocked(service.renderById).mockResolvedValue('<html>synthetic</html>');
        const res = response();
        await controller.render({ params: { id: 'synthetic-id' } } as unknown as Request, res as unknown as Response);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith('<html>synthetic</html>');
    });
    test('preserves a missing template as 404', async () => {
        jest.mocked(service.renderById).mockResolvedValue(null);
        const res = response();
        await controller.render({ params: { id: 'synthetic-id' } } as unknown as Request, res as unknown as Response);
        expect(res.status).toHaveBeenCalledWith(404);
    });
    test('rejects an invalid edit before opening a transaction or writing', async () => {
        const req = { params: { id: 'synthetic-id' }, body: {}, files: { formatPayload: [{ buffer: Buffer.from('{"name":"test","codeName":"test","versionTag":11}') }] } };
        const res = response();
        await controller.edit(req as unknown as Request, res as unknown as Response);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(transactionInst.renewTransaction).not.toHaveBeenCalled();
        expect(transactionInst.unconfirmTransaction).not.toHaveBeenCalled();
        expect(service.edit).not.toHaveBeenCalled();
    });
    test('rolls back a failed edit before returning an error', async () => {
        const content = JSON.stringify({ name: 'synthetic', codeName: 'synthetic', versionTag: '1', versionNumber: 1 });
        const req = { params: { id: 'synthetic-id' }, body: { name: 'synthetic' }, files: { formatPayload: [{ buffer: Buffer.from(content) }] } };
        jest.mocked(service.edit).mockRejectedValue(new Error('synthetic write failure'));
        const res = response();
        await controller.edit(req as unknown as Request, res as unknown as Response);
        expect(transactionInst.renewTransaction).toHaveBeenCalledTimes(1);
        expect(transactionInst.unconfirmTransaction).toHaveBeenCalledTimes(1);
        expect(transactionInst.confirmTransaction).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
    });
    test('waits for commit before reporting a successful edit', async () => {
        const content = JSON.stringify({ name: 'synthetic', codeName: 'synthetic', versionTag: '1', versionNumber: 1 });
        const req = { params: { id: 'synthetic-id' }, body: { name: 'synthetic' }, files: { formatPayload: [{ buffer: Buffer.from(content) }] } };
        jest.mocked(service.edit).mockResolvedValue({ uuid: 'synthetic-id' });
        let commit: () => void = () => {};
        jest.mocked(transactionInst.confirmTransaction).mockImplementation(() => new Promise<void>(resolve => { commit = resolve; }));
        const res = response();
        const result = controller.edit(req as unknown as Request, res as unknown as Response);
        await new Promise(resolve => setImmediate(resolve));
        expect(res.status).not.toHaveBeenCalled();
        commit();
        await result;
        expect(res.status).toHaveBeenCalledWith(200);
        expect(transactionInst.unconfirmTransaction).not.toHaveBeenCalled();
    });

});
