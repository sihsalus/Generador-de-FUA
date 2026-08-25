import type { Options } from 'sequelize';

export const DATABASE_SYNC_OPTIONS = Object.freeze({ force: false } as const);

export function getDatabaseConfig(
  environment: NodeJS.ProcessEnv = process.env,
): Options {
  const port = Number(environment.DB_PORT ?? '5433');

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535.');
  }

  return {
    database: environment.DB_NAME || 'fuagenerator',
    username: environment.DB_USER || 'fuagenerator',
    password: environment.DB_PASSWORD || 'fuagenerator',
    host: environment.DB_HOST || 'localhost',
    port,
    dialect: 'postgres',
  };
}
