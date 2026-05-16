import { EventEmitter } from "node:events";
import { Writable } from "node:stream";
import type { Request, Response } from "express";
import { afterEach, describe, expect, test } from "vitest";
import { initRequestLogger } from "../middleware/requestLogger";
import { fromUUID, newUUID } from "../utils/uuid";

class MockResponse extends EventEmitter {
  err?: Error;
  headers: Record<string, string | string[]> = {};
  headersSent = true;
  statusCode = 200;
  writableEnded = false;

  getHeaders() {
    return this.headers;
  }
}

const originalLogLevel = process.env.LOG_LEVEL;

function createMockRequest(overrides: Partial<Request> = {}) {
  return {
    baseUrl: "/api",
    method: "GET",
    originalUrl: "/api/health",
    path: "/health",
    url: "/health",
    ...overrides,
  } as Request;
}

function createLogCapture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });

  return { lines, stream };
}

function parseLogs(lines: string[]) {
  return lines.map((line) => JSON.parse(line));
}

describe("initRequestLogger", () => {
  afterEach(() => {
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
      return;
    }

    process.env.LOG_LEVEL = originalLogLevel;
  });

  test("defaults to info and suppresses the debug start log", () => {
    delete process.env.LOG_LEVEL;

    const { lines, stream } = createLogCapture();
    const middleware = initRequestLogger({ stream });
    const req = createMockRequest();
    const mockResponse = new MockResponse();
    const res = mockResponse as unknown as Response;

    middleware(req, res, () => {});

    mockResponse.statusCode = 204;
    mockResponse.writableEnded = true;
    mockResponse.emit("finish");

    const [endLog] = parseLogs(lines);

    expect(lines).toHaveLength(1);
    expect(endLog).toMatchObject({
      event: "request_end",
      level: 30,
      route: "/api/health",
      statusCode: 204,
    });
    expect(endLog.durationMs).toBeGreaterThanOrEqual(0);
    expect(endLog.msg).toBe(
      `204 GET /api/health (${Math.round(endLog.durationMs)}ms)`,
    );
  });

  test("emits the request start log when LOG_LEVEL=debug", () => {
    process.env.LOG_LEVEL = "debug";

    const { lines, stream } = createLogCapture();
    const middleware = initRequestLogger({ stream });
    const userId = newUUID();
    const req = createMockRequest({
      method: "POST",
      originalUrl: "/api/login/anonymous?token=secret",
      path: "/login/anonymous",
      url: "/login/anonymous?token=secret",
      user: {
        email: null,
        firstNames: null,
        isAnonymous: true,
        lastNames: "",
        userId,
      } as unknown as Request["user"],
    });
    const mockResponse = new MockResponse();
    const res = mockResponse as unknown as Response;

    middleware(req, res, () => {});

    mockResponse.statusCode = 200;
    mockResponse.writableEnded = true;
    mockResponse.emit("finish");

    const [startLog, endLog] = parseLogs(lines);

    expect(startLog).toMatchObject({
      anonymous: true,
      authenticated: true,
      event: "request_start",
      method: "POST",
      path: "/api/login/anonymous",
      route: "/api/login/anonymous",
      userId: fromUUID(userId),
    });
    expect(endLog).toMatchObject({
      anonymous: true,
      authenticated: true,
      event: "request_end",
      level: 30,
      method: "POST",
      path: "/api/login/anonymous",
      route: "/api/login/anonymous",
      statusCode: 200,
      userId: fromUUID(userId),
    });
    expect(endLog.msg).toBe(
      `200 POST /api/login/anonymous (${Math.round(endLog.durationMs)}ms)`,
    );
  });

  test("logs 4xx responses at warn", () => {
    delete process.env.LOG_LEVEL;

    const { lines, stream } = createLogCapture();
    const middleware = initRequestLogger({ stream });
    const req = createMockRequest({
      originalUrl: "/api/content/not-found?token=super-secret",
      path: "/content/not-found",
      url: "/content/not-found?token=super-secret",
    });
    const mockResponse = new MockResponse();
    const res = mockResponse as unknown as Response;

    middleware(req, res, () => {});

    Object.assign(req, {
      baseUrl: "/api/content",
      path: "/not-found",
      route: { path: "/:contentId" } as Request["route"],
    });
    mockResponse.statusCode = 404;
    mockResponse.writableEnded = true;
    mockResponse.emit("finish");

    const [endLog] = parseLogs(lines);

    expect(lines).toHaveLength(1);
    expect(endLog).toMatchObject({
      event: "request_end",
      level: 40,
      route: "/api/content/:contentId",
      path: "/api/content/not-found",
      statusCode: 404,
    });
    expect(endLog.msg).toBe(
      `404 GET /api/content/not-found (${Math.round(endLog.durationMs)}ms)`,
    );
  });

  test("uses a failure-specific completion message for errored requests", () => {
    delete process.env.LOG_LEVEL;

    const { lines, stream } = createLogCapture();
    const middleware = initRequestLogger({ stream });
    const req = createMockRequest({
      originalUrl: "/api/login/magic?token=super-secret",
      path: "/login/magic",
      url: "/login/magic?token=super-secret",
    });
    const mockResponse = new MockResponse();
    const res = mockResponse as unknown as Response;

    middleware(req, res, () => {});

    mockResponse.err = new Error("boom");
    mockResponse.statusCode = 500;
    mockResponse.writableEnded = true;
    mockResponse.emit("finish");

    const [endLog] = parseLogs(lines);

    expect(endLog).toMatchObject({
      event: "request_end",
      level: 50,
      path: "/api/login/magic",
      statusCode: 500,
    });
    expect(endLog.msg).toBe(
      `500 GET /api/login/magic (${Math.round(endLog.durationMs)}ms)`,
    );
  });

  test("sanitizes request headers and redacts sensitive ones", () => {
    delete process.env.LOG_LEVEL;

    const { lines, stream } = createLogCapture();
    const middleware = initRequestLogger({ stream });
    const req = createMockRequest({
      headers: {
        accept: "application/json",
        "accept-encoding": "gzip, br",
        authorization: "Bearer secret-token",
        connection: "close",
        cookie: "session=top-secret",
        referer: "http://localhost:8000/library?token=secret",
        "sec-fetch-mode": "cors",
        "user-agent": "Mozilla/5.0",
        "x-api-key": "key-123",
      },
      params: { ownerId: "abc123" },
      query: { parentId: "folder1" },
      // pino-http request serializer includes remotePort
      socket: {
        remoteAddress: "::1",
        remotePort: 62051,
      } as Request["socket"],
    });
    const mockResponse = new MockResponse();
    mockResponse.headers = {
      "content-type": "application/json",
      "set-cookie": ["session=top-secret"],
    };
    const res = mockResponse as unknown as Response;

    middleware(req, res, () => {});

    mockResponse.writableEnded = true;
    mockResponse.emit("finish");

    const [endLog] = parseLogs(lines);

    expect(endLog.req.headers).toMatchObject({
      referer: "http://localhost:8000",
    });
    expect(endLog.req).toMatchObject({
      remoteAddress: "::1",
    });
    expect(endLog.req).not.toHaveProperty("params");
    expect(endLog.req).not.toHaveProperty("query");
    expect(endLog.req).not.toHaveProperty("remotePort");
    expect(endLog.req.headers).not.toHaveProperty("accept");
    expect(endLog.req.headers).not.toHaveProperty("accept-encoding");
    expect(endLog.req.headers).not.toHaveProperty("authorization");
    expect(endLog.req.headers).not.toHaveProperty("connection");
    expect(endLog.req.headers).not.toHaveProperty("cookie");
    expect(endLog.req.headers).not.toHaveProperty("sec-fetch-mode");
    expect(endLog.req.headers).not.toHaveProperty("user-agent");
    expect(endLog.req.headers).not.toHaveProperty("x-api-key");
    expect(endLog.res?.headers?.["set-cookie"]).toBeUndefined();
  });
});
