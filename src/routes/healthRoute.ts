import { RequestHandler } from 'express';

export type DatabaseHealthcheck = () => Promise<unknown>;

export function createHealthHandler(
  checkDatabase: DatabaseHealthcheck,
): RequestHandler {
  return async (_request, response) => {
    try {
      await checkDatabase();
      response.status(200).json({ status: 'ok' });
    } catch {
      response.status(503).json({ status: 'unavailable' });
    }
  };
}
