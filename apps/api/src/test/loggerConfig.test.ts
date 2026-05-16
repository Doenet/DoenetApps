import { afterEach, describe, expect, test } from "vitest";
import { getApiLoggerOptions } from "../logging/loggerConfig";

const originalPrettyLogs = process.env.PRETTY_LOGS;

describe("getApiLoggerOptions", () => {
  afterEach(() => {
    if (originalPrettyLogs === undefined) {
      delete process.env.PRETTY_LOGS;
      return;
    }

    process.env.PRETTY_LOGS = originalPrettyLogs;
  });

  test("does not enable pretty logs by default", () => {
    delete process.env.PRETTY_LOGS;

    const loggerOptions = getApiLoggerOptions();

    expect(loggerOptions.transport).toBeUndefined();
  });

  test("enables pretty logs only when PRETTY_LOGS=true", () => {
    process.env.PRETTY_LOGS = "true";

    const loggerOptions = getApiLoggerOptions({
      prettyIgnore: ["pid", "hostname"],
    });

    expect(loggerOptions.transport).toMatchObject({
      options: {
        hideObject: true,
        ignore: "pid,hostname",
        messageFormat: "{msg}",
      },
      target: "pino-pretty",
    });
  });

  test("keeps pretty logs disabled when a custom stream is provided", () => {
    process.env.PRETTY_LOGS = "true";

    const loggerOptions = getApiLoggerOptions({
      stream: process.stdout,
    });

    expect(loggerOptions.transport).toBeUndefined();
  });
});
