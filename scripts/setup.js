/* global process, console */
// `npm run setup`: everything the host toolchain needs before `npm run dev`.
// Idempotent, so it is also the way to restart the database container.
import { execFileSync } from "child_process";
import fs from "fs";

const envFile = "apps/api/.env";
if (fs.existsSync(envFile)) {
  console.log(`✅ ${envFile} exists — leaving it as is`);
} else {
  fs.copyFileSync(`${envFile}.example`, envFile);
  console.log(`✅ Created ${envFile} from .env.example`);
}

// The port MySQL is published on comes from the env file, so a worktree that
// points DATABASE_PORT elsewhere gets the container published there.
const dbPort = fs
  .readFileSync(envFile, "utf8")
  .match(/^DATABASE_PORT="?(\d+)"?/m)?.[1];

const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

console.log("🐳 Starting MySQL and s3mock...");
try {
  run(
    "docker",
    ["compose", "up", "-d", "--wait"],
    dbPort ? { DATABASE_PORT: dbPort } : {},
  );
} catch {
  console.error("\n❌ Could not start the containers. Is Docker running?\n");
  process.exit(1);
}

console.log("🗄️  Migrating and seeding the database...");
run("npm", ["run", "db:setup"]);

console.log(
  "\n✅ Setup complete. Run `npm run dev` to start the dev servers.\n",
);
