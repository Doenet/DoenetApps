import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { z } from "zod";
import { defineOperation } from "./defineOperation";
import { implement, operationsRouter } from "./implement";

const echo = defineOperation({
  name: "echo",
  method: "get",
  path: "/test/echo/:id",
  auth: "optional",
  request: z.object({ id: z.string(), times: z.coerce.number() }),
  response: z.object({ id: z.string(), times: z.number() }),
});

const secret = defineOperation({
  name: "secret",
  method: "post",
  path: "/test/secret",
  auth: "required",
});

const broken = defineOperation({
  name: "broken",
  method: "get",
  path: "/test/broken",
  auth: "optional",
  response: z.object({ count: z.number() }),
});

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    operationsRouter([
      implement(echo, async ({ id, times }) => ({ id, times })),
      implement(secret, async () => {}),
      // Deliberately wrong at runtime, as if a query returned bad data.
      implement(broken, async () => ({ count: "many" }) as never),
    ]),
  );
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/api`;
});

afterAll(() => {
  server.close();
});

describe("operationsRouter", () => {
  test("merges path and query parameters and returns JSON", async () => {
    const res = await fetch(`${baseUrl}/test/echo/abc?times=3`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "abc", times: 3 });
  });

  test("rejects invalid input with 400", async () => {
    const res = await fetch(`${baseUrl}/test/echo/abc?times=lots`);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid data" });
  });

  test("requires sign-in when auth is required", async () => {
    const res = await fetch(`${baseUrl}/test/secret`, { method: "POST" });
    expect(res.status).toBe(403);
  });

  test("a response that breaks its contract is a 500 outside production", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await fetch(`${baseUrl}/test/broken`);
    expect(res.status).toBe(500);
    expect((await res.json()).details).toMatch(/broken does not match/);
    error.mockRestore();
  });

  test("in production a response that breaks its contract is only logged", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await fetch(`${baseUrl}/test/broken`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: "many" });
    expect(error).toHaveBeenCalledWith(
      expect.stringMatching(/\[Contract\].*broken/s),
    );
    error.mockRestore();
    vi.unstubAllEnvs();
  });
});
