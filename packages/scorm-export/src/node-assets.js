// Load the package's constant files from disk, for callers running in Node.
//
// Kept out of index.js on purpose: that module is bundled into the browser app
// and must stay free of `fs`.  The browser supplies the same assets through
// Vite's `?raw` imports instead (see apps/app/src/utils/scorm.ts).
//
// Both Node callers — the CLI and the test suite — use this, so there is one
// definition of where each file comes from.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { TEMPLATE_FILES, STATIC_FILES, SCHEMA_FILES } from "./index.js";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// createRequire rather than import.meta.resolve: the tests run these files
// through Vite's SSR pipeline, which does not provide resolve().
const resolve = createRequire(import.meta.url).resolve;

/**
 * @param {object} [options]
 * @param {boolean} [options.debug]  Also load debug/size-probe.html as
 *   `debugProbe`, which buildScormFiles inlines into index.html.
 * @returns {Record<string, string>} assets keyed by output filename.
 */
export function loadNodeAssets({ debug = false } = {}) {
  const assets = {};

  for (const name of TEMPLATE_FILES) {
    assets[name] = readFileSync(join(pkgRoot, "templates", name), "utf8");
  }

  // PreTeXt's SCORM bridge and SPLICE resize handler are vendored (locally
  // modified; see vendor/VENDORED.md), so they come from vendor/pretext/.
  // lz-string is
  // an unmodified npm dependency (pinned in package.json), resolved out of
  // node_modules under the filename index.html references.
  assets["ptx_scorm_events.js"] = readFileSync(
    join(pkgRoot, "vendor", "pretext", "ptx_scorm_events.js"),
    "utf8",
  );
  assets["lti_iframe_resizer.js"] = readFileSync(
    join(pkgRoot, "vendor", "pretext", "lti_iframe_resizer.js"),
    "utf8",
  );
  assets["lz-string.min.js"] = readFileSync(
    resolve("lz-string/libs/lz-string.min.js"),
    "utf8",
  );

  // The SCORM control documents the manifest points at (vendor/VENDORED.md).
  for (const name of SCHEMA_FILES) {
    assets[name] = readFileSync(join(pkgRoot, "vendor", "scorm", name), "utf8");
  }

  if (debug) {
    assets.debugProbe = readFileSync(
      join(pkgRoot, "debug", "size-probe.html"),
      "utf8",
    );
  }

  const missing = [...STATIC_FILES, ...SCHEMA_FILES].filter(
    (name) => !assets[name],
  );
  if (missing.length) {
    throw new Error("loadNodeAssets: could not load " + missing.join(", "));
  }
  return assets;
}
