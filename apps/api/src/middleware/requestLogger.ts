import type { NextFunction, Request, Response } from "express";
import pinoHttp from "pino-http";
import {
  getApiLoggerOptions,
  type LoggerConfigOptions,
  type LogLevel,
} from "../logging/loggerConfig";
import { fromUUID } from "../utils/uuid";

type LoggableObject = Record<string, unknown>;
type SerializedRequest = {
  headers?: Record<string, string>;
} & Record<string, unknown>;
type RequestWithLogger = Request & {
  log: {
    debug: (object: Record<string, unknown>, message: string) => void;
  };
};

const noisyRequestHeaders = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "connection",
  "dnt",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-gpc",
  "user-agent",
]);

/**
 * Initialize the pino-http middleware for logging API requests.
 *
 * The middleware logs two events per API call
 * 1) a start event as soon as a request enters the API (level: debug)
 * 2) a completion event when the response ends (level: info/warn/error)
 *
 * Each log entry includes only the metadata fields we want. No sensitive data.
 * LOG_LEVEL controls the minimum emitted log level in both local dev and prod.
 */
export function initRequestLogger(options: LoggerConfigOptions = {}) {
  const httpLogger = pinoHttp({
    ...getApiLoggerOptions({
      ...options,
      prettyIgnore: ["pid", "hostname"],
    }),
    customErrorMessage(
      req: Request,
      res: Response,
      _err: Error,
      responseTime?: number,
    ) {
      return getRequestCompletionMessage(req, res, responseTime);
    },
    customErrorObject(
      req: Request,
      res: Response,
      _err: Error,
      loggableObject: LoggableObject,
    ) {
      return getRequestCompletionObject(req, res, loggableObject);
    },
    customSuccessMessage(req: Request, res: Response, responseTime?: number) {
      return getRequestCompletionMessage(req, res, responseTime);
    },
    customSuccessObject(
      req: Request,
      res: Response,
      loggableObject: LoggableObject,
    ) {
      return getRequestCompletionObject(req, res, loggableObject);
    },
    customLogLevel(_req: Request, res: Response, err?: Error) {
      return getRequestCompletionLogLevel(res, err);
    },
    quietReqLogger: true,
    serializers: {
      req: sanitizeSerializedRequest,
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    httpLogger(req, res);
    logRequestStart(req);
    next();
  };
}

/**
 * Pulls the safe request fields that we want to include in every lifecycle log.
 */
function getRequestMetadata(req: Request) {
  const userId = getLoggedUserId(req);

  return {
    anonymous: req.user?.isAnonymous ?? false,
    authenticated: req.user !== undefined,
    method: req.method,
    route: getRequestRoute(req) ?? getRequestPath(req),
    path: getRequestPath(req),
    ...(userId ? { userId } : {}),
  };
}

function getDurationMs(loggableObject: LoggableObject) {
  const responseTime = loggableObject.responseTime;

  return typeof responseTime === "number" ? responseTime : undefined;
}

function getRequestPath(req: Request) {
  if (req.baseUrl || req.path) {
    return `${req.baseUrl}${req.path}`;
  }

  return (req.originalUrl || req.url).split("?")[0];
}

function getRequestRoute(req: Request) {
  if (!req.route) {
    return undefined;
  }

  const routePath = req.route.path;
  if (typeof routePath === "string") {
    return `${req.baseUrl}${routePath}`;
  }

  if (Array.isArray(routePath)) {
    return routePath
      .filter((path): path is string => typeof path === "string")
      .map((path) => `${req.baseUrl}${path}`)
      .join("|");
  }

  return undefined;
}

function getRequestStartMessage(req: Request) {
  return `START: ${req.method} ${getRequestPath(req)}`;
}

function getRequestCompletionMessage(
  req: Request,
  res: Response,
  responseTime?: number,
) {
  const baseMessage = `${res.statusCode} ${req.method} ${getRequestPath(req)}`;

  if (responseTime === undefined) {
    return baseMessage;
  }

  return `${baseMessage} (${Math.round(responseTime)}ms)`;
}

function getRequestCompletionLogLevel(res: Response, err?: Error): LogLevel {
  if (res.statusCode >= 500 || err) {
    return "error";
  }

  if (res.statusCode >= 400) {
    return "warn";
  }

  return "info";
}

function sanitizeSerializedRequest(req: SerializedRequest) {
  const {
    params: _params,
    query: _query,
    remotePort: _remotePort,
    ...rest
  } = req;

  return {
    ...rest,
    ...(req.headers ? { headers: sanitizeRequestHeaders(req.headers) } : {}),
  };
}

function sanitizeRequestHeaders(headers: Record<string, string>) {
  const sanitizedHeaders: Record<string, string> = {};

  for (const [headerName, value] of Object.entries(headers)) {
    if (noisyRequestHeaders.has(headerName)) {
      continue;
    }

    if (headerName === "referer") {
      const refererOrigin = getRefererOrigin(value);

      if (refererOrigin) {
        sanitizedHeaders.referer = refererOrigin;
      }
      continue;
    }

    sanitizedHeaders[headerName] = value;
  }

  return sanitizedHeaders;
}

function getRefererOrigin(referer: string) {
  if (!URL.canParse(referer)) {
    return undefined;
  }

  return new URL(referer).origin;
}

function getLoggedUserId(req: Request) {
  const userId = req.user?.userId;

  if (typeof userId === "string") {
    return userId;
  }

  if (userId instanceof Uint8Array) {
    return fromUUID(userId);
  }

  return undefined;
}

function logRequestStart(req: Request) {
  (req as RequestWithLogger).log.debug(
    {
      ...getRequestMetadata(req),
      event: "request_start",
    },
    getRequestStartMessage(req),
  );
}

function getRequestCompletionObject(
  req: Request,
  res: Response,
  loggableObject: LoggableObject,
) {
  return {
    ...getRequestMetadata(req),
    durationMs: getDurationMs(loggableObject),
    event: "request_end",
    statusCode: res.statusCode,
  };
}
