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

/**
 * Whether the test-auth bypass (anonymous-strategy login as an arbitrary
 * user via `/api/login/createOrLoginAsTest`) is enabled.
 *
 * This is a full authentication bypass, so it is guarded with defense in
 * depth:
 *   1. It is *never* enabled when NODE_ENV === "production", regardless of
 *      the flag, so a misconfigured deploy cannot expose it.
 *   2. It requires an explicit opt-in — the flag must equal "true". Any other
 *      value (including typos like "fasle", or "0"/"no") leaves it disabled,
 *      i.e. fail-closed.
 */
export function isTestAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.ENABLE_TEST_AUTH_BYPASS?.trim().toLowerCase() === "true";
}
