#!/usr/bin/env node
// CLI adapter around src/index.js: read an activity off disk, write its SCORM
// zip.  All the actual package assembly lives in src/index.js so the doenet.org
// "Download SCORM" button can reuse it in the browser; this file only does the
// filesystem work that a browser cannot.
//
// Usage:
//   node build.mjs <activity.doenet> [options]
//
// Options:
//   --title "Human Title"      Title shown in the LMS (default: filename)
//   --id slug                  Activity id used to key scores/state in the
//                              LMS and localStorage (default: filename slug).
//                              Keep it stable across re-exports of the same
//                              activity, or saved student state is orphaned.
//   --doenet-version X.Y.Z     @doenet/standalone version (default: latest)
//   --out dir                  Output directory (default: ./dist)
//   --debug                    Inline debug/size-probe.html into index.html
//                              (state-blob / suspend_data console logging).
//                              Off by default; a normal package omits it.
//
// Output: <out>/<id>-scorm.zip with imsmanifest.xml at the zip root.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { buildScormPackage } from "./src/index.js";
import { loadNodeAssets } from "./src/node-assets.js";

const here = dirname(fileURLToPath(import.meta.url));

// ── argument parsing ────────────────────────────────────────────────────────
const USAGE =
  "Usage: node build.mjs <activity.doenet> [--title t] [--id slug] " +
  "[--doenet-version v] [--out dir] [--debug]";

let opts, positional;
try {
  ({ values: opts, positionals: positional } = parseArgs({
    options: {
      title: { type: "string" },
      id: { type: "string" },
      "doenet-version": { type: "string", default: "latest" },
      out: { type: "string", default: join(here, "dist") },
      debug: { type: "boolean", default: false },
    },
    allowPositionals: true,
  }));
} catch (error) {
  // parseArgs rejects unknown flags and flags missing their value, which the
  // hand-rolled loop this replaced accepted silently — `--title` in last
  // position used to set the title to undefined.
  console.error(error.message);
  console.error(USAGE);
  process.exit(1);
}
if (positional.length !== 1) {
  console.error(USAGE);
  process.exit(1);
}

const sourceFile = positional[0];
const doenetML = readFileSync(sourceFile, "utf8");

// ── load the constant package files ─────────────────────────────────────────
const assets = loadNodeAssets({ debug: opts.debug });

// ── build and write ─────────────────────────────────────────────────────────
const fallbackId = basename(sourceFile).replace(/\.[^.]*$/, "");
const { name, zip } = buildScormPackage(assets, {
  doenetML,
  title: opts.title,
  id: opts.id || fallbackId,
  doenetVersion: opts["doenet-version"],
  debug: Boolean(opts.debug),
});

mkdirSync(opts.out, { recursive: true });
const zipPath = join(opts.out, name);
writeFileSync(zipPath, zip);

console.log("SCORM package written to " + zipPath);
console.log(
  'Upload it to your LMS as a SCORM package (title: "' +
    (opts.title || name.replace(/-scorm\.zip$/, "")) +
    '").',
);
