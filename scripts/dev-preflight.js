/* global process, console */
import fs from "fs";
import net from "net";
import { apiEnvPath, dbPort } from "./worktree-env.js";

// Runs as `predev`. This is a read-only gate: it never starts containers or
// touches the database, so it is safe to run from any sandboxed session.

if (!fs.existsSync(apiEnvPath)) {
  console.error(
    "\n❌ This worktree is not set up yet.\n" +
      "   Run `npm run setup` (or `npm run worktree:init` for an extra worktree).\n",
  );
  process.exit(1);
}

function notReachable() {
  console.error(
    `\n❌ MySQL is not reachable on port ${dbPort}.\n` +
      "   Start it with `npm run db:start`.\n",
  );
  process.exit(1);
}

const socket = net.connect({ host: "127.0.0.1", port: dbPort });
socket.setTimeout(1500);
socket.on("connect", () => {
  socket.destroy();
  process.exit(0);
});
socket.on("timeout", () => {
  socket.destroy();
  notReachable();
});
socket.on("error", notReachable);
