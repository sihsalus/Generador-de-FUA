import { describe, expect, test } from '@jest/globals';
import {
  getRequiredEnvironment,
  validateRuntimeConfiguration,
} from './runtimeConfig';

const validEnvironment = {
  TOKEN: 'token',
  SECRET_KEY: 'signature-secret',
  ENCRYPTION_KEY: 'encryption-secret',
  HMAC_SECRET: 'hmac-secret',
};

describe('runtime configuration', () => {
  test('accepts all required secrets', () => {
    expect(() => validateRuntimeConfiguration(validEnvironment)).not.toThrow();
  });

  test('reports every missing or blank secret', () => {
    expect(() =>
      validateRuntimeConfiguration({
        ...validEnvironment,
        TOKEN: '',
        ENCRYPTION_KEY: '   ',
      }),
    ).toThrow('Missing required environment variables: TOKEN, ENCRYPTION_KEY');
  });

  test('returns a required environment value without changing it', () => {
    expect(getRequiredEnvironment('TOKEN', validEnvironment)).toBe('token');
  });
});
