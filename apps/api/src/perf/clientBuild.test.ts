import { afterAll, beforeAll, describe, expect, test } from "vitest";
import express from "express";
import { AddressInfo } from "node:net";
import { Server } from "node:http";
import { perfMiddleware } from "./middleware";

// The `clientBuild` field of the request log. Unlike middleware.test.ts, the
// routes here make no queries, so this runs without a database.

let server: Server;
let baseUrl: string;
const logLines: string[] = [];

beforeAll(async () => {
  const app = express();
  app.use(
    perfMiddleware({
      serverTiming: false,
      requestLog: true,
      sha: "abc123",
      log: (line) => logLines.push(line),
    }),
  );
  app.get("/api/clientBuildTest", (_req, res) => {
    res.json({ ok: true });
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

async function loggedClientBuild(headers?: Record<string, string>) {
  const before = logLines.length;
  const res = await fetch(`${baseUrl}/api/clientBuildTest`, { headers });
  await res.text();
  // The log line is written on "close", which can land after the client
  // has the response.
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(logLines.length).toBe(before + 1);
  return JSON.parse(logLines.at(-1)!).clientBuild;
}

describe("perfMiddleware clientBuild", () => {
  const build = "0123456789abcdef0123456789abcdef01234567";

  test("logs the app build from X-Client-Build", async () => {
    expect(await loggedClientBuild({ "X-Client-Build": build })).toBe(build);
  });

  test("logs null without the header, as from older builds or other clients", async () => {
    expect(await loggedClientBuild()).toBeNull();
  });

  test("logs null for a value that isn't a full lowercase commit SHA", async () => {
    for (const value of [
      "x".repeat(5000),
      build.toUpperCase(),
      build.slice(0, 7),
      `${build}0`,
    ]) {
      expect(await loggedClientBuild({ "X-Client-Build": value })).toBeNull();
    }
  });
});
