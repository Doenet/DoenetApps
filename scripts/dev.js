/*
 * This wrapper exists so the root `npm run dev` command can orchestrate the app,
 * api, and web dev servers with a bit of custom behavior. It starts each workspace
 * through the npm CLI, keeps the usual prefixed output from `concurrently`, and
 * makes Ctrl+C shutdown less noisy without hiding real failures.
 */
/* global process */
import concurrently, { Logger } from "concurrently";
import path from "path";

const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  throw new Error(
    "npm_execpath is not set. Run this script through `npm run dev`.",
  );
}

function quoteCliArgument(argument) {
  return JSON.stringify(argument);
}

let interrupted = false;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interrupted = true;
  });
}

class DevLogger extends Logger {
  logCommandEvent(text, command) {
    if (
      interrupted &&
      / exited with code (1|null|SIGINT|SIGTERM)$/.test(text)
    ) {
      return;
    }

    super.logCommandEvent(text, command);
  }
}

const npmRunDevCommand = `${quoteCliArgument(process.execPath)} ${quoteCliArgument(npmExecPath)} run dev`;
const root = path.join(import.meta.dirname, "..");

const { result } = concurrently(
  [
    {
      command: npmRunDevCommand,
      cwd: path.join(root, "apps", "api"),
      name: "API",
    },
    {
      command: npmRunDevCommand,
      cwd: path.join(root, "apps", "app"),
      name: "APP",
    },
    {
      command: npmRunDevCommand,
      cwd: path.join(root, "apps", "web"),
      name: "WEB",
    },
  ],
  {
    logger: new DevLogger({ prefixFormat: "name" }),
    prefix: "name",
    prefixColors: "auto",
  },
);

try {
  await result;
} catch {
  process.exitCode = interrupted ? 0 : 1;
}
