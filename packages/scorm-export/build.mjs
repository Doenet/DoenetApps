#!/usr/bin/env node
// Build an LMS-ready SCORM zip for a single DoenetML activity.
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

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// ── argument parsing ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const positional = [];
const opts = { "doenet-version": "latest", out: join(here, "dist") };
const booleanFlags = new Set(["debug"]);
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    const key = args[i].slice(2);
    opts[key] = booleanFlags.has(key) ? true : args[++i];
  } else {
    positional.push(args[i]);
  }
}
if (positional.length !== 1) {
  console.error(
    "Usage: node build.mjs <activity.doenet> [--title t] [--id slug] [--doenet-version v] [--out dir]",
  );
  process.exit(1);
}

const sourceFile = positional[0];
const doenetml = readFileSync(sourceFile, "utf8");

// The DoenetML is embedded inside a <script type="text/doenetml"> element,
// whose content is raw text terminated only by "</script".  Rather than
// escape (the viewer would see the escaped form), refuse such sources.
if (/<\/script/i.test(doenetml)) {
  console.error(
    "Error: DoenetML source contains '</script>', which cannot be embedded in an HTML script element.",
  );
  process.exit(1);
}

const slug = (opts.id || basename(sourceFile).replace(/\.[^.]*$/, ""))
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/^-+|-+$/g, "");
const title = opts.title || slug;

const escapeMarkup = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// The size probe lives in debug/size-probe.html and is inlined into
// index.html only under --debug; a normal package substitutes it away.
const debugProbe = opts.debug
  ? readFileSync(join(here, "debug", "size-probe.html"), "utf8").trimEnd()
  : "";

const substitutions = {
  TITLE: escapeMarkup(title),
  ACTIVITY_ID: slug,
  IDENTIFIER: "doenet-scorm-" + slug,
  DOENET_VERSION: opts["doenet-version"],
  DOENETML: doenetml,
  DEBUG_PROBE: debugProbe,
};

const fill = (template) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in substitutions)) throw new Error("Unknown placeholder: " + key);
    return substitutions[key];
  });

// ── assemble the package in a staging directory ─────────────────────────────
const staging = join(opts.out, "staging-" + slug);
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

for (const name of ["imsmanifest.xml", "index.html", "activity.html"]) {
  writeFileSync(
    join(staging, name),
    fill(readFileSync(join(here, "templates", name), "utf8")),
  );
}
// PreTeXt's SCORM bridge and SPLICE resize handler are vendored (locally
// modified; see vendor/VENDORED.md), so they're copied from vendor/.
for (const name of ["ptx_scorm_events.js", "lti_iframe_resizer.js"]) {
  copyFileSync(join(here, "vendor", name), join(staging, name));
}
// lz-string is an unmodified npm dependency (pinned in package.json), not
// vendored: resolve its minified build from node_modules and copy it in under
// the filename index.html references.
const lzStringSrc = fileURLToPath(
  import.meta.resolve("lz-string/libs/lz-string.min.js"),
);
copyFileSync(lzStringSrc, join(staging, "lz-string.min.js"));

// ── zip it (flat: imsmanifest.xml at the zip root, as LMSes require) ────────
const zipName = slug + "-scorm.zip";
rmSync(join(staging, zipName), { force: true });
execFileSync("zip", ["-X", "-q", "-r", zipName, "."], { cwd: staging });

const zipPath = join(opts.out, zipName);
copyFileSync(join(staging, zipName), zipPath);
rmSync(staging, { recursive: true, force: true });

console.log("SCORM package written to " + zipPath);
console.log(
  'Upload it to your LMS as a SCORM package (title: "' + title + '").',
);
