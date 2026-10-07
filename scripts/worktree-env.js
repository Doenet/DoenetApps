/* global process */
import fs from "fs";
import path from "path";

// Base ports for a primary checkout (offset 0). Each additional worktree gets a
// stable offset N, so its servers run on BASE + N. The offset is stored
// implicitly as the API PORT in apps/api/.env, which is this worktree's single
// source of truth — every other port and the database name derive from it.
const BASE = { api: 3000, app: 8000, web: 4321 };

export function parseEnvFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) return result;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

// Walks up from the current working directory to the repo root. Using cwd
// (rather than import.meta) keeps this correct even when vite/astro inline this
// module into a bundled config file written to a temporary location.
function findRepoRoot() {
  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, "apps/api/.env.example"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

export const repoRoot = findRepoRoot();
export const apiEnvPath = path.join(repoRoot, "apps/api/.env");
export const apiEnvExamplePath = path.join(repoRoot, "apps/api/.env.example");

const env = parseEnvFile(apiEnvPath);

export const apiPort = Number(env.PORT) || BASE.api;
export const offset = apiPort - BASE.api;
export const appPort = BASE.app + offset;
export const webPort = BASE.web + offset;
// The app's public base URL. Normally localhost on this checkout's port, but in
// a codespace it is the forwarded host, and links printed for a human (or baked
// into a sign-in email) have to match what the browser is actually pointed at.
export const appUrl =
  process.env.APP_URL || env.APP_URL || `http://localhost:${appPort}`;
// The database address comes from the real environment first, then the env
// file. Both dotenv and the Prisma CLI resolve it the same way, so this stays
// in step with what the API actually connects to — which matters in the dev
// container, where docker-compose.yml points these at the `mysql` service.
export const dbHost =
  process.env.DATABASE_HOST || env.DATABASE_HOST || "127.0.0.1";
export const dbPort =
  Number(process.env.DATABASE_PORT) || Number(env.DATABASE_PORT) || 3306;
export { BASE };
