import { describe, expect, test } from '@jest/globals';
import { parseFUAFormatContent } from './parseFUAFormatContent';
import { FUAFormatValidationError } from '../errors/FUAFormatValidationError';

const version = { codeName: 'synthetic', versionTag: '11', versionNumber: 11 };
function format(pageTag: unknown = '11') {
    return { ...version, name: 'Synthetic format', pages: [{ ...version, versionTag: pageTag,
        pageNumber: 1, height: 297, width: 210, sections: [{ ...version, top: 0, left: 0,
            bodyHeight: 100, bodyWidth: 100, fields: [] }] }] };
}

describe('FUA template validation', () => {
    test('reports the exact path of Pedro\'s numeric page versionTag', () => {
        try {
            parseFUAFormatContent(JSON.stringify(format(11)));
            throw new Error('Expected validation to reject numeric tag');
        } catch (error) {
            expect(error).toBeInstanceOf(FUAFormatValidationError);
            expect((error as FUAFormatValidationError).response()).toEqual({
                error: 'INVALID_FUA_FORMAT', message: 'El formato FUA contiene campos inválidos.',
                details: [{ path: ['pages', 0, 'versionTag'], code: 'invalid_type',
                    message: 'Se esperaba string; se recibió number.' }],
            });
        }
    });
    test('accepts a string tag and preserves numeric versionNumber and extra rendering properties', () => {
        const input = { ...format(), customRendering: { color: 'blue' } };
        expect(parseFUAFormatContent(JSON.stringify(input))).toEqual(input);
    });
    test('accepts JSONC comments and trailing commas', () => {
        expect(parseFUAFormatContent('{/*template*/ "name":"Synthetic","codeName":"test","versionTag":"11","versionNumber":11,}').versionTag).toBe('11');
    });
    test.each(['', '{"name":', '{"name":"value"} trailing'])('rejects malformed JSONC before rendering: %s', content => {
        expect(() => parseFUAFormatContent(content)).toThrow(FUAFormatValidationError);
    });
    test('reports section errors without echoing input values', () => {
        const input = format();
        input.pages[0].sections[0].versionTag = { privateValue: 'DO_NOT_ECHO' } as unknown as string;
        try { parseFUAFormatContent(JSON.stringify(input)); } catch (error) {
            const response = (error as FUAFormatValidationError).response();
            expect(response.details[0].path).toEqual(['pages', 0, 'sections', 0, 'versionTag']);
            expect(JSON.stringify(response)).not.toContain('DO_NOT_ECHO');
            return;
        }
        throw new Error('Expected invalid section tag to fail');
    });
});
