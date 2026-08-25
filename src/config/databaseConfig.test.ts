import { describe, expect, test } from '@jest/globals';
import {
  DATABASE_SYNC_OPTIONS,
  getDatabaseConfig,
} from './databaseConfig';

describe('database configuration', () => {
  test('maps canonical environment variables without crossing credentials', () => {
    const config = getDatabaseConfig({
      DB_NAME: 'fua_database',
      DB_USER: 'fua_user',
      DB_PASSWORD: 'fua_password',
      DB_HOST: 'fua-db',
      DB_PORT: '5432',
    });

    expect(config).toMatchObject({
      database: 'fua_database',
      username: 'fua_user',
      password: 'fua_password',
      host: 'fua-db',
      port: 5432,
      dialect: 'postgres',
    });
  });

  test('rejects an invalid database port', () => {
    expect(() => getDatabaseConfig({ DB_PORT: 'invalid' })).toThrow(
      'DB_PORT must be an integer between 1 and 65535.',
    );
  });

  test('never enables destructive synchronization', () => {
    expect(DATABASE_SYNC_OPTIONS).toEqual({ force: false });
  });
});
