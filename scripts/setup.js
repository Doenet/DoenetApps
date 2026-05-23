/* global process, console */
import { execFileSync } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";
import {
  apiEnvExamplePath,
  apiEnvPath,
  parseEnvFile,
  repoRoot,
  BASE,
} from "./worktree-env.js";

const isWorktree = process.argv.includes("--worktree");

function log(msg) {
  console.log(msg);
}

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

// Resolves true if nothing is listening on the port locally.
function portFree(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.setTimeout(700);
    socket.on("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(true));
  });
}

// Collects the port offset already claimed by every linked worktree.
function usedOffsets() {
  const offsets = new Set();
  for (const line of git(["worktree", "list", "--porcelain"]).split("\n")) {
    const match = line.match(/^worktree (.+)$/);
    if (!match) continue;
    const env = parseEnvFile(path.join(match[1], "apps/api/.env"));
    if (env.PORT) offsets.add(Number(env.PORT) - BASE.api);
  }
  return offsets;
}

async function nextFreeOffset() {
  const used = usedOffsets();
  for (let n = 1; n < 100; n++) {
    if (used.has(n)) continue;
    const free = await Promise.all([
      portFree(BASE.api + n),
      portFree(BASE.app + n),
      portFree(BASE.web + n),
    ]);
    if (free.every(Boolean)) return n;
  }
  fail("Could not find a free port offset after 100 attempts.");
}

function dbNameFromBranch(branch, offset) {
  const slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `doenet_${slug || `wt${offset}`}`.slice(0, 64);
}

function writeApiEnv(offset, dbName) {
  const out = fs
    .readFileSync(apiEnvExamplePath, "utf8")
    .replace(/^PORT=.*$/m, `PORT="${BASE.api + offset}"`)
    .replace(/^APP_URL=.*$/m, `APP_URL="http://localhost:${BASE.app + offset}"`)
    .replace(
      /^DATABASE_URL=.*$/m,
      `DATABASE_URL="mysql://myuser:mypassword@localhost:3306/${dbName}"`,
    )
    .replace(/^DATABASE_NAME=.*$/m, `DATABASE_NAME="${dbName}"`);
  fs.writeFileSync(apiEnvPath, out);
}

async function main() {
  if (!isWorktree && fs.statSync(path.join(repoRoot, ".git")).isFile()) {
    log(
      "⚠️  This looks like a linked git worktree. " +
        "Use `npm run worktree:init` instead so it gets its own ports and database.\n",
    );
  }

  // 1. Per-worktree env file (single source of truth for ports + database).
  if (fs.existsSync(apiEnvPath)) {
    const env = parseEnvFile(apiEnvPath);
    log(
      `✅ apps/api/.env already exists (port ${env.PORT}, database ${env.DATABASE_NAME})`,
    );
  } else {
    if (!fs.existsSync(apiEnvExamplePath)) {
      fail(`Example file not found: ${apiEnvExamplePath}`);
    }
    let offset = 0;
    let dbName = "doenet";
    if (isWorktree) {
      offset = await nextFreeOffset();
      dbName = dbNameFromBranch(git(["branch", "--show-current"]), offset);
    }
    writeApiEnv(offset, dbName);
    log(
      `✅ Created apps/api/.env (port ${BASE.api + offset}, database ${dbName})`,
    );
  }

  // 2. Shared MySQL container. The fixed `-p doenet` project name means every
  // worktree reuses the same container regardless of which directory starts it.
  log("🐳 Starting MySQL container...");
  try {
    execFileSync(
      "docker",
      ["compose", "-p", "doenet", "up", "-d", "--wait"],
      { cwd: repoRoot, stdio: "inherit" },
    );
  } catch {
    fail("Failed to start MySQL. Is Docker running (with Compose v2)?");
  }

  // 3. Migrate + seed this worktree's database. Prisma creates the database if
  // it does not exist yet (myuser has global CREATE — see configs/mysql).
  log("🗄️  Migrating and seeding the database...");
  try {
    execFileSync("npm", ["run", "db:setup"], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  } catch {
    fail("Database migrate/seed failed.");
  }

  log("\n✅ Setup complete. Run `npm run dev` to start the dev servers.\n");
}

main();
