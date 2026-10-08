import { describe, expect, test, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type { Router } from "express";

// Importing the routers loads the media config; give it something valid.
vi.hoisted(() => {
  process.env.MEDIA_S3_MODE ??= "aws";
  process.env.MEDIA_S3_REGION ??= "us-east-1";
  process.env.MEDIA_S3_BUCKET ??= "unused";
});

import { mountApiRoutes } from "../apiRoutes";
import { apiOperations } from "../apiOperations";

/**
 * Ratchet: every `/api` route must be in the API contract, except those
 * listed in `contract-uncovered.json`. The list may only shrink: a listed
 * route that is now covered (or gone) must be removed from it.
 */

const UNCOVERED_PATH = path.resolve(__dirname, "../../contract-uncovered.json");

/**
 * Infrastructure, not part of the contract. Test-only routes are mounted
 * depending on env vars, so excluding them also keeps this test independent
 * of the local `.env`.
 */
const EXCLUDED = [
  /^\w+ \/api\/test\//,
  /^\w+ \/api\/(docs|openapi\.json)$/,
  /^POST \/api\/login\/createOrLoginAsTest$/,
];

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean> };
  name: string;
};

function routesOf(router: Router, mountPath: string): string[] {
  return (router.stack as RouteLayer[]).flatMap((layer) => {
    if (!layer.route) {
      if (layer.name === "router") {
        throw new Error(
          `Nested router under ${mountPath}: extend coverage.test.ts to walk it`,
        );
      }
      return [];
    }
    const { path: routePath, methods } = layer.route;
    return Object.keys(methods)
      .filter((m) => m !== "_all")
      .map((m) => `${m.toUpperCase()} ${mountPath}${routePath}`);
  });
}

function allApiRoutes() {
  const routes: string[] = [];
  mountApiRoutes(
    {
      use: ((mountPath: unknown, handler: unknown) => {
        if (typeof mountPath === "string" && typeof handler === "function") {
          if ("stack" in handler) {
            routes.push(...routesOf(handler as Router, mountPath));
          }
        }
      }) as never,
    },
    { enableTestRoutes: false },
  );

  // Routes registered directly on `app` in index.ts.
  const indexSource = fs.readFileSync(
    path.resolve(__dirname, "../index.ts"),
    "utf8",
  );
  for (const match of indexSource.matchAll(
    /app\.(get|post|put|delete|patch)\(\s*"(\/api[^"]*)"/g,
  )) {
    routes.push(`${match[1].toUpperCase()} ${match[2]}`);
  }

  return [...new Set(routes)].filter(
    (route) => !EXCLUDED.some((re) => re.test(route)),
  );
}

function coveredRoutes() {
  return new Set(
    apiOperations.map(
      ({ contract }) => `${contract.method.toUpperCase()} /api${contract.path}`,
    ),
  );
}

describe("API contract coverage", () => {
  test("every /api route is covered or listed in contract-uncovered.json", () => {
    const covered = coveredRoutes();
    const uncovered = allApiRoutes().filter((r) => !covered.has(r));
    const listed = new Set<string>(
      JSON.parse(fs.readFileSync(UNCOVERED_PATH, "utf8")),
    );

    const unlisted = uncovered.filter((r) => !listed.has(r));
    expect(
      unlisted,
      "New /api routes must be added to the API contract (defineOperation + implement), not as plain Express routes",
    ).toEqual([]);
  });

  test("contract-uncovered.json only lists uncovered routes (it may only shrink)", () => {
    const covered = coveredRoutes();
    const all = new Set(allApiRoutes());
    const listed: string[] = JSON.parse(
      fs.readFileSync(UNCOVERED_PATH, "utf8"),
    );

    const stale = listed.filter((r) => covered.has(r) || !all.has(r));
    expect(
      stale,
      "Remove these from contract-uncovered.json: they are now covered or no longer exist",
    ).toEqual([]);
    expect(listed, "Keep contract-uncovered.json sorted").toEqual(
      [...listed].sort(),
    );
  });
});
