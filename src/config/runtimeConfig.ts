const REQUIRED_RUNTIME_VARIABLES = [
  'TOKEN',
  'SECRET_KEY',
  'ENCRYPTION_KEY',
  'HMAC_SECRET',
] as const;

export function getRequiredEnvironment(
  name: string,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const value = environment[name];
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function validateRuntimeConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): void {
  const missingVariables = REQUIRED_RUNTIME_VARIABLES.filter(
    (name) => !environment[name]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}`,
    );
  }
}
