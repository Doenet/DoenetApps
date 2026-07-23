/* global process, console, setTimeout */
import net from "net";
import { apiPort, appPort } from "./worktree-env.js";

// Printed by `npm run dev` once the API is accepting connections, so the
// one-click dev auto-login link is ready the moment it appears. Dev-only; not
// part of any build. Waits on the API port specifically because that is what
// the auto-login request hits (the app/Vite port being up is implied by the
// page loading at all).

const POLL_MS = 500;
const GIVE_UP_MS = 90_000;
const url = `http://localhost:${appPort}/?autologin=true`;

function apiIsUp() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: apiPort });
    socket.setTimeout(1000);
    const finish = (up) => {
      socket.destroy();
      resolve(up);
    };
    socket.on("connect", () => finish(true));
    socket.on("timeout", () => finish(false));
    socket.on("error", () => finish(false));
  });
}

function box(lines) {
  const width = Math.max(...lines.map((l) => l.length));
  const bar = "─".repeat(width + 2);
  const body = lines
    .map((l) => `│ ${l}${" ".repeat(width - l.length)} │`)
    .join("\n");
  return `┌${bar}┐\n${body}\n└${bar}┘`;
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const deadline = Date.now() + GIVE_UP_MS;
  while (Date.now() < deadline) {
    if (await apiIsUp()) {
      console.log(
        "\n" +
          box([
            "Dev auto-login ready - open this to sign in as dev@doenet.org:",
            "",
            url,
          ]) +
          "\n",
      );
      return;
    }
    await delay(POLL_MS);
  }
  // Do not fail the dev process just because the banner timed out.
  console.log(`\n[dev] auto-login link (once the API is up): ${url}\n`);
}

main();
