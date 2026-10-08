import { describe, expect, test } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { apiOperations } from "../apiOperations";

/**
 * A covered operation must have typed callers only: the type checker is what
 * proves no caller still uses what a breaking change removes. This fails if
 * any string in the app or e2e tests still names a covered operation's path
 * (an untyped `axios`/`cy.request` call or a `genericAction` `path`).
 */

const repoRoot = path.resolve(__dirname, "../../../..");
const SCANNED = ["apps/app/src", "packages/e2e-tests"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : sourceFiles(full);
    }
    return EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
  });
}

/** The static part of an operation's path, e.g. `assign/getAssignmentData`. */
function staticPrefix(contractPath: string) {
  return contractPath.split("/:")[0].replace(/^\//, "");
}

describe("untyped callers", () => {
  test("no covered operation is called by path", () => {
    const prefixes = apiOperations.map(({ contract }) => ({
      name: contract.name,
      pattern: new RegExp(
        `["'\`/]${staticPrefix(contract.path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`,
      ),
    }));

    const offenders: string[] = [];
    for (const dir of SCANNED) {
      for (const file of sourceFiles(path.join(repoRoot, dir))) {
        const lines = fs.readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          // Component tests stub the network by URL; they aren't callers.
          if (line.includes("cy.intercept(")) {
            return;
          }
          for (const { name, pattern } of prefixes) {
            if (pattern.test(line)) {
              offenders.push(
                `${path.relative(repoRoot, file)}:${i + 1} calls ${name} by path; use api("${name}", ...)`,
              );
            }
          }
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
