import { afterAll, beforeAll, describe, expect, test } from "vitest";
import express from "express";
import { AddressInfo } from "node:net";
import { Server, request } from "node:http";
import { prisma } from "../model";
import { perfMiddleware, perfOptionsFromEnv } from "./middleware";

let server: Server;
let baseUrl: string;
const logLines: string[] = [];

beforeAll(async () => {
  const app = express();
  app.use(
    perfMiddleware({
      serverTiming: true,
      requestLog: true,
      sha: "abc123",
      log: (line) => logLines.push(line),
    }),
  );
  // Stands in for the session store: queries before routing count too.
  app.use(async (_req, _res, next) => {
    await prisma.users.count();
    next();
  });

  const router = express.Router();
  router.get("/queries/:n", async (req, res) => {
    for (let i = 0; i < Number(req.params.n); i++) {
      await prisma.content.count();
    }
    res.json({ ok: true });
  });
  router.get("/slow", async (_req, res) => {
    await prisma.content.count();
    await new Promise((resolve) => setTimeout(resolve, 200));
    res.json({ ok: true });
  });
  app.use("/api/perfTest", router);
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/notApi", (_req, res) => {
    res.json({ ok: true });
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

function parseServerTiming(header: string | null) {
  const metrics: Record<string, number> = {};
  for (const entry of (header ?? "").split(",")) {
    const [name, ...params] = entry.trim().split(";");
    const dur = params.find((p) => p.startsWith("dur="));
    metrics[name] = Number(dur?.slice("dur=".length));
  }
  return metrics;
}

async function lastLogFor(path: string) {
  const res = await fetch(baseUrl + path);
  await res.text();
  // The log line is written on "close", which can land after the client
  // has the response.
  await new Promise((resolve) => setTimeout(resolve, 20));
  return { res, line: logLines.at(-1) };
}

describe("perfMiddleware", () => {
  test("Server-Timing reports the request's query count and DB time", async () => {
    const res = await fetch(`${baseUrl}/api/perfTest/queries/3`);
    const timing = parseServerTiming(res.headers.get("Server-Timing"));

    // 3 in the route + 1 in the earlier middleware
    expect(timing.dbq).toBe(4);
    expect(timing.db).toBeGreaterThan(0);
    expect(timing.app).toBeGreaterThanOrEqual(timing.db);
  });

  test("concurrent requests are counted separately", async () => {
    const counts = [1, 5, 2, 8, 0];
    const responses = await Promise.all(
      counts.map((n) => fetch(`${baseUrl}/api/perfTest/queries/${n}`)),
    );
    const reported = responses.map(
      (res) => parseServerTiming(res.headers.get("Server-Timing")).dbq,
    );
    expect(reported).toEqual(counts.map((n) => n + 1));
  });

  test("logs one line per request with the route pattern, not the URL", async () => {
    const { line } = await lastLogFor("/api/perfTest/queries/2?secret=x");
    expect(JSON.parse(line!)).toEqual({
      type: "perf.request",
      method: "GET",
      route: "/api/perfTest/queries/:n",
      status: 200,
      aborted: false,
      durMs: expect.any(Number),
      dbMs: expect.any(Number),
      queries: 3,
      sha: "abc123",
    });
  });

  test("logs unmatched API paths without the URL", async () => {
    const { res, line } = await lastLogFor("/api/perfTest/nope/123");
    expect(res.status).toBe(404);
    expect(JSON.parse(line!)).toMatchObject({
      route: "unmatched",
      status: 404,
    });
  });

  test("logs requests the client aborts", async () => {
    const before = logLines.length;
    const req = request(`${baseUrl}/api/perfTest/slow`);
    req.on("error", () => {});
    req.end();
    await new Promise((resolve) => setTimeout(resolve, 50));
    req.destroy();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(logLines.length).toBe(before + 1);
    expect(JSON.parse(logLines.at(-1)!)).toMatchObject({
      route: "/api/perfTest/slow",
      aborted: true,
    });
  });

  test("skips the health check and non-API requests", async () => {
    const before = logLines.length;
    const health = await fetch(`${baseUrl}/api/health`);
    const notApi = await fetch(`${baseUrl}/notApi`);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(logLines.length).toBe(before);
    expect(health.headers.get("Server-Timing")).not.toBeNull();
    expect(notApi.headers.get("Server-Timing")).toBeNull();
  });
});

describe("perfOptionsFromEnv", () => {
  test("development: Server-Timing on, request log off", () => {
    expect(perfOptionsFromEnv({ NODE_ENV: "development" })).toEqual({
      serverTiming: true,
      requestLog: false,
      sha: null,
    });
  });

  test("production: request log on, Server-Timing off unless flagged", () => {
    expect(
      perfOptionsFromEnv({ NODE_ENV: "production", GIT_SHA: "abc" }),
    ).toEqual({ serverTiming: false, requestLog: true, sha: "abc" });
    expect(
      perfOptionsFromEnv({
        NODE_ENV: "production",
        PERF_SERVER_TIMING: "true",
      }).serverTiming,
    ).toBe(true);
  });

  test("PERF_REQUEST_LOG turns logging on outside production", () => {
    expect(perfOptionsFromEnv({ PERF_REQUEST_LOG: "TRUE" }).requestLog).toBe(
      true,
    );
  });
});
