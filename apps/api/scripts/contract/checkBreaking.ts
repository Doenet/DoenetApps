/**
 * CI check: fails if the committed `apps/api/openapi.json` makes a breaking
 * change relative to the base branch (default `origin/main`), unless
 * ALLOW_BREAKING=1 (CI sets it when the PR has the `api-breaking` label).
 *
 * A breaking change is safe only once no deployed client still needs the old
 * shape: the replacement has been deployed (for at least a day, so open tabs
 * have reloaded) and nothing in the repo calls the old one. The type checker
 * proves the second; the label records that someone checked the first.
 *
 * Usage:
 *   npm run contract:check-breaking --workspace @doenet-tools/api [-- --base <git-ref>]
 *
 * Requires the `oasdiff` binary on PATH (or set OASDIFF to its path).
 */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { OpenApiDocument } from "../../src/contract";
import { breakingChanges, describeChange } from "./gate";
import { repoRoot, SPEC_PATH } from "./paths";

function readSpecAt(ref: string): OpenApiDocument | null {
  // A bad ref is an error, not "no spec on the base branch".
  execFileSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  try {
    const json = execFileSync("git", ["show", `${ref}:${SPEC_PATH}`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(json) as OpenApiDocument;
  } catch {
    return null;
  }
}

function main(): number {
  const baseIndex = process.argv.indexOf("--base");
  const baseRef = baseIndex >= 0 ? process.argv[baseIndex + 1] : "origin/main";
  const base = readSpecAt(baseRef);
  if (!base) {
    console.log(`No ${SPEC_PATH} on ${baseRef}; nothing to compare against.`);
    return 0;
  }
  const head = JSON.parse(
    fs.readFileSync(path.join(repoRoot, SPEC_PATH), "utf8"),
  ) as OpenApiDocument;

  const changes = breakingChanges(base, head);
  if (changes.length === 0) {
    console.log("No breaking changes to the API contract.");
    return 0;
  }

  const list = changes.map(describeChange).join("\n");
  if (["1", "true"].includes(process.env.ALLOW_BREAKING ?? "")) {
    console.log(
      `Breaking changes, allowed by the api-breaking label:\n${list}`,
    );
    return 0;
  }
  console.error(
    `Breaking changes to the API contract:\n${list}\n\n` +
      "Clients already running in browsers still use the old shape. Add the " +
      "replacement first and migrate every caller in one PR; once that has " +
      "been deployed for at least a day, remove the old shape in a PR " +
      "labelled `api-breaking`. See apps/api/AGENTS.md.",
  );
  return 1;
}

process.exitCode = main();
