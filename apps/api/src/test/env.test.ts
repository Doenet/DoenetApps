import { afterEach, describe, expect, test } from "vitest";
import { isTestAuthBypassEnabled } from "../utils/env";

const originalNodeEnv = process.env.NODE_ENV;
const originalFlag = process.env.ENABLE_TEST_AUTH_BYPASS;

function restore(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

afterEach(() => {
  restore("NODE_ENV", originalNodeEnv);
  restore("ENABLE_TEST_AUTH_BYPASS", originalFlag);
});

describe("isTestAuthBypassEnabled", () => {
  test("enabled when flag is exactly 'true' and not in production", () => {
    process.env.NODE_ENV = "development";
    process.env.ENABLE_TEST_AUTH_BYPASS = "true";
    expect(isTestAuthBypassEnabled()).toBe(true);
  });

  test("case-insensitive and whitespace-tolerant for 'true'", () => {
    process.env.NODE_ENV = "development";
    process.env.ENABLE_TEST_AUTH_BYPASS = "  TRUE  ";
    expect(isTestAuthBypassEnabled()).toBe(true);
  });

  test("never enabled in production, even when flag is 'true'", () => {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_TEST_AUTH_BYPASS = "true";
    expect(isTestAuthBypassEnabled()).toBe(false);
  });

  test("fails closed for non-'true' values", () => {
    process.env.NODE_ENV = "development";
    for (const value of ["false", "0", "no", "disabled", "fasle", "", "1"]) {
      process.env.ENABLE_TEST_AUTH_BYPASS = value;
      expect(isTestAuthBypassEnabled()).toBe(false);
    }
  });

  test("fails closed when the flag is unset", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ENABLE_TEST_AUTH_BYPASS;
    expect(isTestAuthBypassEnabled()).toBe(false);
  });
});
