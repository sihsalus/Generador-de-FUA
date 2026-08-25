import { describe, expect, test } from '@jest/globals';
import express from 'express';
import { AddressInfo } from 'node:net';
import { createHealthHandler } from './healthRoute';
import type { DatabaseHealthcheck } from './healthRoute';

async function requestHealth(checkDatabase: DatabaseHealthcheck) {
  const app = express();
  app.get('/health', createHealthHandler(checkDatabase));

  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${address.port}/health`,
    );

    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

describe('health route', () => {
  test('reports healthy when PostgreSQL is reachable', async () => {
    const result = await requestHealth(async () => undefined);

    expect(result).toEqual({ status: 200, body: { status: 'ok' } });
  });

  test('reports unavailable without exposing database errors', async () => {
    const result = await requestHealth(async () => {
      throw new Error('synthetic database failure');
    });

    expect(result).toEqual({
      status: 503,
      body: { status: 'unavailable' },
    });
  });
});
