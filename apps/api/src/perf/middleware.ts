import { NextFunction, Request, Response } from "express";
import onHeaders from "on-headers";
import { performance } from "node:perf_hooks";
import { RequestStats, runWithRequestStats } from "./requestStats";

export type PerfOptions = {
  /**
   * Expose timings to the client in a `Server-Timing` header. The header is
   * written with the response headers, so it misses queries made after
   * that, such as express-session refreshing the session at the end of the
   * response. The log line counts everything.
   */
  serverTiming: boolean;
  /** Write one structured log line per API request. */
  requestLog: boolean;
  /** Deployed git SHA, included in log lines. */
  sha: string | null;
  /** Where log lines go. */
  log?: (line: string) => void;
};

/**
 * Read perf options from the environment.
 *
 * - `Server-Timing` is on outside production, and in production only when
 *   `PERF_SERVER_TIMING=true` (dev3). It reveals query counts, so prod
 *   leaves it off.
 * - Request logs are on in production, and elsewhere only when
 *   `PERF_REQUEST_LOG=true`, to keep local dev and test output quiet.
 */
export function perfOptionsFromEnv(env = process.env): PerfOptions {
  const isProduction = env.NODE_ENV === "production";
  const flag = (name: string) => env[name]?.trim().toLowerCase() === "true";
  return {
    serverTiming: !isProduction || flag("PERF_SERVER_TIMING"),
    requestLog: isProduction || flag("PERF_REQUEST_LOG"),
    sha: env.GIT_SHA || null,
  };
}

// Polled by the health check; logging it would only add noise.
const UNLOGGED_PATHS = new Set(["/api/health"]);

/**
 * Measures each `/api` request: wall time, and the number and duration of
 * Prisma operations made while handling it. Register it before any
 * middleware that queries the database (e.g. the session store) so their
 * queries count too.
 */
export function perfMiddleware(options: PerfOptions) {
  const log = options.log ?? ((line: string) => console.log(line));

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.originalUrl.startsWith("/api/")) {
      next();
      return;
    }

    const start = performance.now();
    const stats: RequestStats = { queries: 0, dbMs: 0 };

    if (options.serverTiming) {
      onHeaders(res, () => {
        res.setHeader(
          "Server-Timing",
          [
            `app;dur=${round(performance.now() - start)}`,
            `db;dur=${round(stats.dbMs)}`,
            `dbq;desc="queries";dur=${stats.queries}`,
          ].join(", "),
        );
      });
    }

    if (options.requestLog && !UNLOGGED_PATHS.has(req.path)) {
      // "close" rather than "finish", so requests the client gives up on
      // (often the slowest ones) are logged too. `status` is then whatever
      // had been set when the connection closed.
      res.on("close", () => {
        log(
          JSON.stringify({
            type: "perf.request",
            method: req.method,
            route: routePattern(req),
            status: res.statusCode,
            aborted: !res.writableFinished,
            durMs: round(performance.now() - start),
            dbMs: round(stats.dbMs),
            queries: stats.queries,
            sha: options.sha,
          }),
        );
      });
    }

    runWithRequestStats(stats, next);
  };
}

/**
 * The matched route as written in the router, e.g.
 * `/api/content/:contentId`, so requests group by endpoint and no IDs or
 * query parameters reach the logs. If an error is passed out of a router
 * (`next(err)`), Express has already reset `baseUrl`, so only the route's
 * own path is left, e.g. `/:id`.
 */
function routePattern(req: Request) {
  if (!req.route) {
    return "unmatched";
  }
  return req.baseUrl + String(req.route.path);
}

function round(ms: number) {
  return Math.round(ms * 10) / 10;
}
