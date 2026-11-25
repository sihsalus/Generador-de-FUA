import { afterEach, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { Request, Response } from 'express';
import { PDFDocument } from 'pdf-lib';
import FUAFormatFromSchemaController from './FUAFormatFromSchemaController';
import FUAFromVisitController from './FUAFromVisitController';
import { pdfMetadataAccess, pdfMetadataHashSignature } from '../utils/PDF_HASH_Signature';

jest.mock('../modelsSequelize', () => ({}));
jest.mock('../middleware/globalTransaction', () => ({}));
jest.mock('../middleware/logger/models/typescript/Logger', () => ({}));
jest.mock('dotenv', () => ({ config: jest.fn() }));

const testKey = 'synthetic-verification-only';
let signedPdf: Buffer;

beforeAll(async () => {
    const document = await PDFDocument.create();
    document.addPage();
    signedPdf = Buffer.from(await pdfMetadataHashSignature(await document.save(), testKey));
});

beforeEach(() => {
    jest.replaceProperty(process, 'env', { ...process.env, SECRET_KEY: testKey });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { jest.restoreAllMocks(); });

const controllers = [
    { name: 'visit', verify: FUAFromVisitController.hashSignatureVerification, result: (valid: boolean) => ({ result: valid }) },
    { name: 'format', verify: FUAFormatFromSchemaController.hashSignatureVerificationControllerTemporary, result: (valid: boolean) => valid },
];

describe.each(controllers)('PDF verification for $name', ({ verify, result }) => {
    test.each([true, false])('returns the verification result for matching key = %s', async (matches) => {
        process.env.SECRET_KEY = matches ? testKey : 'different-synthetic-key';
        const req = { files: { pdf: [{ buffer: signedPdf }] } } as unknown as Request;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await verify(req, res as unknown as Response);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(result(matches));
        expect(jest.mocked(console.log).mock.calls.length).toBe(0);
    });

    test('retains the missing document response', async () => {
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await verify({ files: {} } as Request, res as unknown as Response);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(jest.mocked(console.log).mock.calls.length).toBe(0);
    });

    test('retains the invalid document response with a fixed error diagnostic', async () => {
        const req = { files: { pdf: [{ buffer: Buffer.from('synthetic invalid file') }] } } as unknown as Request;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await verify(req, res as unknown as Response);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(jest.mocked(console.log).mock.calls.length).toBe(0);
        const calls = jest.mocked(console.error).mock.calls;
        expect(calls).toHaveLength(1);
        expect(calls[0]).toHaveLength(1);
        expect(typeof calls[0][0]).toBe('string');
    });
});

test('metadata diagnostics omit the signature stored in the document subject', async () => {
    const subject = (await PDFDocument.load(signedPdf)).getSubject();
    expect(subject).toBeTruthy();
    await pdfMetadataAccess(signedPdf);
    const diagnostics = jest.mocked(console.log).mock.calls.flat().map(String);
    expect(diagnostics.some((line) => line.includes(subject!))).toBe(false);
});
