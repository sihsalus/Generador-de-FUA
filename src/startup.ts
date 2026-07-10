export interface DatabaseLifecycle {
  authenticate(): Promise<void>;
  sync(): Promise<unknown>;
}

interface StartupDependencies {
  database: DatabaseLifecycle;
  listen: () => void | Promise<void>;
}

export async function startApplication({
  database,
  listen,
}: StartupDependencies): Promise<void> {
  await database.authenticate();
  await database.sync();
  await listen();
}
