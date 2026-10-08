/**
 * CI check: fails if a migration added since the base branch (default
 * `origin/main`) contains a destructive statement, unless
 * ALLOW_DESTRUCTIVE=1 (CI sets it when the PR has the `db-destructive`
 * label). See "Expand-Migrate-Contract" in apps/api/AGENTS.md.
 *
 * Usage: npm run db:check-migrations --workspace @doenet-tools/api [-- --base <git-ref>]
 */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { findDestructiveStatements } from "./destructiveMigrations";

const repoRoot = path.resolve(__dirname, "../../../..");
const MIGRATIONS = "apps/api/prisma/migrations";

function main(): number {
  const baseIndex = process.argv.indexOf("--base");
  const baseRef = baseIndex >= 0 ? process.argv[baseIndex + 1] : "origin/main";

  const added = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "--diff-filter=A",
      `${baseRef}...HEAD`,
      "--",
      MIGRATIONS,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  )
    .split("\n")
    .filter((file) => file.endsWith("migration.sql"));

  const problems = added.flatMap((file) =>
    findDestructiveStatements(
      fs.readFileSync(path.join(repoRoot, file), "utf8"),
    ).map((f) => `  - ${file}: ${f.reason}\n      ${f.statement}`),
  );

  if (problems.length === 0) {
    console.log(
      `No destructive statements in ${added.length} new migration(s).`,
    );
    return 0;
  }
  const list = problems.join("\n");
  if (["1", "true"].includes(process.env.ALLOW_DESTRUCTIVE ?? "")) {
    console.log(
      `Destructive migrations, allowed by the db-destructive label:\n${list}`,
    );
    return 0;
  }
  console.error(
    `Destructive migrations:\n${list}\n\n` +
      "Migrations run while the previous backend is still serving. Stop the " +
      "code using the column first (e.g. mark it @ignore) in one PR; once that " +
      "has deployed, make the destructive change in a PR labelled " +
      "`db-destructive`. See apps/api/AGENTS.md.",
  );
  return 1;
}

process.exitCode = main();
