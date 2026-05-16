export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal"
  | "silent";

export type LoggerConfigOptions = {
  prettyIgnore?: string[];
  stream?: NodeJS.WritableStream;
};

const sensitiveHeaderPaths = [
  "req.headers.cookie",
  "req.headers.authorization",
  'req.headers["proxy-authorization"]',
  'req.headers["x-api-key"]',
  'req.headers["x-auth-token"]',
  'req.headers["x-csrf-token"]',
  'req.headers["csrf-token"]',
  'res.headers["set-cookie"]',
];

/**
 * Shared pino configuration for logs
 */
export function getApiLoggerOptions(options: LoggerConfigOptions = {}) {
  const logLevel = getLogLevel();

  return {
    level: logLevel,
    redact: {
      paths: sensitiveHeaderPaths,
      remove: true,
    },
    stream: options.stream,
    ...(shouldUsePrettyLogs(options)
      ? getPrettyTransportOptions(logLevel, options.prettyIgnore)
      : {}),
  };
}

function getLogLevel(): LogLevel {
  const logLevel = process.env.LOG_LEVEL?.trim().toLowerCase();
  return isLogLevel(logLevel) ? logLevel : "info";
}

function isLogLevel(logLevel: string | undefined): logLevel is LogLevel {
  return (
    logLevel === "trace" ||
    logLevel === "debug" ||
    logLevel === "info" ||
    logLevel === "warn" ||
    logLevel === "error" ||
    logLevel === "fatal" ||
    logLevel === "silent"
  );
}

function shouldUsePrettyLogs(options: LoggerConfigOptions) {
  if (options.stream) {
    return false;
  }

  return process.env.PRETTY_LOGS?.trim().toLowerCase() === "true";
}

function getPrettyTransportOptions(
  logLevel: LogLevel,
  prettyIgnore: string[] | undefined,
) {
  return {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        hideObject: true,
        messageFormat: "{msg}",
        timestampKey: "__pretty_timestamp_disabled__",
        translateTime: "SYS:standard",
        ...(logLevel === "silent" ? {} : { minimumLevel: logLevel }),
        ...(prettyIgnore?.length ? { ignore: prettyIgnore.join(",") } : {}),
      },
    },
  };
}
