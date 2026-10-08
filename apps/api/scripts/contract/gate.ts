/**
 * Breaking-change check for the API contract: lists the changes in `head`
 * that would break a client built against `base`, as classified by oasdiff
 * (with the overrides in oasdiff-severity.txt).
 */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { OpenApiDocument } from "../../src/contract";

export type OasdiffChange = {
  id: string;
  text: string;
  level: number;
  operation?: string;
  path?: string;
};

const SEVERITY_FILE = path.join(__dirname, "oasdiff-severity.txt");

export function breakingChanges(
  base: OpenApiDocument,
  head: OpenApiDocument,
): OasdiffChange[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contract-gate-"));
  try {
    const basePath = path.join(dir, "base.json");
    const headPath = path.join(dir, "head.json");
    fs.writeFileSync(basePath, JSON.stringify(base));
    fs.writeFileSync(headPath, JSON.stringify(head));
    const output = execFileSync(
      process.env.OASDIFF ?? "oasdiff",
      [
        "breaking",
        basePath,
        headPath,
        "--format",
        "json",
        "--severity-levels",
        SEVERITY_FILE,
      ],
      { encoding: "utf8" },
    );
    return JSON.parse(output || "[]") as OasdiffChange[];
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function describeChange(change: OasdiffChange) {
  const where = change.operation
    ? `${change.operation} ${change.path ?? ""}`.trim()
    : (change.path ?? "");
  return `  - [${change.id}] ${where}: ${change.text}`;
}
