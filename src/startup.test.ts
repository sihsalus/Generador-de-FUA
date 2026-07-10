import { describe, expect, jest, test } from '@jest/globals';
import { DatabaseLifecycle, startApplication } from './startup';

function startupFakes() {
  const calls: string[] = [];
  const database: DatabaseLifecycle = {
    authenticate: jest.fn(async () => {
      calls.push('authenticate');
    }),
    sync: jest.fn(async () => {
      calls.push('sync');
    }),
  };
  const listen = jest.fn(() => {
    calls.push('listen');
  });

  return { calls, database, listen };
}

describe('application startup', () => {
  test('authenticates and performs a non-destructive sync before listening', async () => {
    const { calls, database, listen } = startupFakes();

    await startApplication({ database, listen });

    expect(calls).toEqual(['authenticate', 'sync', 'listen']);
    expect(database.sync).toHaveBeenCalledWith();
  });

  test('does not sync or listen when authentication fails', async () => {
    const { database, listen } = startupFakes();
    jest.mocked(database.authenticate).mockRejectedValue(new Error('database unavailable'));

    await expect(startApplication({ database, listen })).rejects.toThrow(
      'database unavailable',
    );
    expect(database.sync).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });

  test('does not listen when schema synchronization fails', async () => {
    const { database, listen } = startupFakes();
    jest.mocked(database.sync).mockRejectedValue(new Error('schema unavailable'));

    await expect(startApplication({ database, listen })).rejects.toThrow(
      'schema unavailable',
    );
    expect(listen).not.toHaveBeenCalled();
  });
});
