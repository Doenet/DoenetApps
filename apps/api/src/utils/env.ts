export function getEnvVar(name: string, required: true): string;
export function getEnvVar(name: string, required?: boolean): string | undefined;
export function getEnvVar(name: string, required = false): string | undefined {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }
  if (required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return undefined;
}
