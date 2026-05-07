// This script should be run when this package is built.
// It copies the assets folder to the dist folder so that it can be served by the server.

import { cp } from "fs/promises";

async function copy() {
  await cp("src/assets", "dist/src/assets", { recursive: true });
}

copy().catch((err) => {
  console.error("Failed to copy assets:", err);
  process.exitCode = 1;
});
