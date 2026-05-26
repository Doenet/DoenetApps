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

function writeApiEnv(offset, dbName, dbPort) {
  const out = fs
    .readFileSync(apiEnvExamplePath, "utf8")
    .replace(/^PORT=.*$/m, `PORT="${BASE.api + offset}"`)
    .replace(/^APP_URL=.*$/m, `APP_URL="http://localhost:${BASE.app + offset}"`)
    .replace(
      /^DATABASE_URL=.*$/m,
      `DATABASE_URL="mysql://myuser:mypassword@localhost:${dbPort}/${dbName}"`,
    )
    .replace(/^DATABASE_PORT=.*$/m, `DATABASE_PORT="${dbPort}"`)
    .replace(/^DATABASE_NAME=.*$/m, `DATABASE_NAME="${dbName}"`);
  fs.writeFileSync(apiEnvPath, out);
}

// Rewrites only DATABASE_PORT and the port inside DATABASE_URL on an existing
// apps/api/.env, leaving everything else (including dbName, user-edits) intact.
function realignDbPort(dbPort) {
  const out = fs
    .readFileSync(apiEnvPath, "utf8")
    .replace(/^DATABASE_PORT=.*$/m, `DATABASE_PORT="${dbPort}"`)
    .replace(/^(DATABASE_URL="mysql:\/\/[^@]+@[^:]+):\d+\//m, `$1:${dbPort}/`);
  fs.writeFileSync(apiEnvPath, out);
}

// Returns the host port for the shared doenet-mysql-1 container. If the
// container is already running, its published port is authoritative (every
// worktree must connect to the same instance). Otherwise probes from 3306
// upward for a free port. A non-running stale container is removed so compose
// can recreate it with the chosen port mapping.
async function determineDbPort() {
  try {
    const out = execFileSync(
      "docker",
      [
        "inspect",
        "doenet-mysql-1",
        "--format",
        '{{.State.Status}}|{{with index .NetworkSettings.Ports "3306/tcp"}}{{(index . 0).HostPort}}{{end}}',
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    const [status, hostPort] = out.split("|");
    if (status === "running" && hostPort) {
      return { port: Number(hostPort), reused: true };
    }
    log(`🧹 Removing stale doenet-mysql-1 container (state: ${status})...`);
    execFileSync("docker", ["rm", "-f", "doenet-mysql-1"], { stdio: "ignore" });
  } catch {
    // No container exists — fall through to probe.
  }
  for (let port = 3306; port < 3406; port++) {
    if (await portFree(port)) return { port, reused: false };
  }
  fail("Could not find a free port for MySQL between 3306 and 3406.");
  return { port: 0, reused: false }; // unreachable, satisfies the type checker
}

// The blog's committed apps/web/.env hardcodes the primary-checkout URLs.
// For an offset worktree, write a .env.local override so links from the blog
// (Header logo, MDX content) and the sitemap's canonical URL point at this
// worktree's app and blog ports. Vite/Astro auto-load .env.local with higher
// precedence than .env. Skipped at offset 0 — the committed file is correct.
function writeWebEnvLocal(offset) {
  const target = path.join(repoRoot, "apps/web/.env.local");
  const content =
    `PUBLIC_DOENET_MAIN_URL=http://localhost:${BASE.app + offset}\n` +
    `PUBLIC_SITE_URL=http://localhost:${BASE.web + offset}\n`;
  fs.writeFileSync(target, content);
}

async function main() {
  if (!isWorktree && fs.statSync(path.join(repoRoot, ".git")).isFile()) {
    log(
      "⚠️  This looks like a linked git worktree. " +
        "Use `npm run worktree:init` instead so it gets its own ports and database.\n",
    );
  }

  // 1. Determine the host port for the shared MySQL container. Done before
  // writing the env file so the chosen port is recorded in DATABASE_URL.
  const { port: dbPort, reused } = await determineDbPort();
  if (reused) {
    log(`✅ Reusing running doenet-mysql-1 on port ${dbPort}`);
  } else if (dbPort !== 3306) {
    log(`ℹ️  Port 3306 is taken; using ${dbPort} for MySQL instead`);
  }

  // 2. Per-worktree env file (single source of truth for ports + database).
  if (fs.existsSync(apiEnvPath)) {
    const env = parseEnvFile(apiEnvPath);
    log(
      `✅ apps/api/.env already exists (port ${env.PORT}, database ${env.DATABASE_NAME})`,
    );
    if (Number(env.DATABASE_PORT) !== dbPort) {
      realignDbPort(dbPort);
      log(`🔧 Updated apps/api/.env DATABASE_PORT to ${dbPort}`);
    }
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
    writeApiEnv(offset, dbName, dbPort);
    log(
      `✅ Created apps/api/.env (port ${BASE.api + offset}, database ${dbName}, db-port ${dbPort})`,
    );
    if (offset > 0) {
      writeWebEnvLocal(offset);
      log(`✅ Created apps/web/.env.local (blog URLs at offset ${offset})`);
    }
  }

  // 3. Shared MySQL container. The fixed `-p doenet` project name means every
  // worktree reuses the same container regardless of which directory starts it.
  // DATABASE_PORT is passed explicitly so compose binds to the port we picked.
  log("🐳 Starting MySQL container...");
  try {
    execFileSync("docker", ["compose", "-p", "doenet", "up", "-d", "--wait"], {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env, DATABASE_PORT: String(dbPort) },
    });
  } catch {
    fail("Failed to start MySQL. Is Docker running (with Compose v2)?");
  }

  // 4. Migrate + seed this worktree's database. Prisma creates the database if
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
