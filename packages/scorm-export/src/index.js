// Assemble an LMS-ready SCORM 2004 package for a single DoenetML activity.
//
// This module is deliberately environment-free: no fs, no child_process, no
// DOM.  It runs unchanged in Node (see ../build.mjs) and in the browser (the
// doenet.org "Download SCORM" button), which is the whole point of the split —
// building a package is pure string substitution plus a zip.
//
// Callers supply the package's constant files as strings via `assets`, because
// the two environments load them differently: Node reads them off disk, Vite
// pulls them in with `?raw`.  Keeping them out of here also keeps the vendored
// GPL files in vendor/pretext/ as the single verbatim copy (vendor/VENDORED.md)
// rather than duplicating them into a generated module that could drift.

import { zipSync } from "fflate";

/** Files built by substituting {{PLACEHOLDER}}s in a template. */
export const TEMPLATE_FILES = [
  "imsmanifest.xml",
  "index.html",
  "activity.html",
];

/** Files copied into the package verbatim. */
export const STATIC_FILES = [
  "ptx_scorm_events.js",
  "lti_iframe_resizer.js",
  "lz-string.min.js",
];

/**
 * The SCORM 2004 4th Edition control documents, copied in verbatim.
 *
 * imsmanifest.xml names the first five in its xsi:schemaLocation, and a content
 * package traditionally carries its control documents at the root so a strict
 * validator can resolve them without network access.  The rest are reached
 * through those five's imports, so all of them have to be present or none are
 * useful.  See ../vendor/scorm/VENDORED.md.
 */
export const SCHEMA_FILES = [
  "imscp_v1p1.xsd",
  "adlcp_v1p3.xsd",
  "adlseq_v1p3.xsd",
  "adlnav_v1p3.xsd",
  "imsss_v1p0.xsd",
  "imsss_v1p0auxresource.xsd",
  "imsss_v1p0control.xsd",
  "imsss_v1p0delivery.xsd",
  "imsss_v1p0limit.xsd",
  "imsss_v1p0objective.xsd",
  "imsss_v1p0random.xsd",
  "imsss_v1p0rollup.xsd",
  "imsss_v1p0seqrule.xsd",
  "imsss_v1p0util.xsd",
  "xml.xsd",
];

/** Every asset a caller must supply (`debugProbe` is optional). */
export const REQUIRED_ASSETS = [
  ...TEMPLATE_FILES,
  ...STATIC_FILES,
  ...SCHEMA_FILES,
];

/**
 * Normalize an activity id into something safe for a filename and for the
 * SCORM manifest identifier.
 */
export function scormSlug(id) {
  return String(id)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const escapeMarkup = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// The DoenetML source is embedded in activity.html as a JS string literal and
// injected into a <script type="text/doenetml"> at runtime.  Rewriting every
// "<" as a unicode escape means a source containing "</script>" cannot
// terminate the enclosing script element, so no DoenetML has to be rejected.
// U+2028/U+2029 are escaped for the same reason: JSON.stringify emits them
// raw, but JavaScript counts them as line terminators, so a source containing
// one would break the literal across lines in any parser older than ES2019.
const escapeScriptString = (s) =>
  JSON.stringify(s)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

/**
 * Build the package's files as a map of `filename -> contents`.
 *
 * @param {Record<string, string>} assets  Constant package files, keyed by
 *   output filename (see REQUIRED_ASSETS), plus an optional `debugProbe`.
 * @param {object} options
 * @param {string} options.doenetML       The activity source.
 * @param {string} options.title          Title shown in the LMS.
 * @param {string} options.id             Stable activity id.  Keys the
 *   student's score and saved state in the LMS and in localStorage, so it must
 *   not change across re-exports of the same activity.
 * @param {string} [options.doenetVersion] @doenet/standalone version to pin.
 * @param {boolean} [options.debug]       Inline the size probe into index.html.
 */
export function buildScormFiles(assets, options) {
  const missing = REQUIRED_ASSETS.filter((name) => !assets?.[name]);
  if (missing.length) {
    throw new Error("Missing SCORM assets: " + missing.join(", "));
  }

  const {
    doenetML,
    title,
    id,
    doenetVersion = "latest",
    debug = false,
  } = options;
  if (!doenetML) throw new Error("buildScormFiles: doenetML is required");
  if (!id) throw new Error("buildScormFiles: id is required");

  const slug = scormSlug(id);
  if (!slug)
    throw new Error("buildScormFiles: id has no usable characters: " + id);
  const activityTitle = title || slug;

  if (debug && !assets.debugProbe) {
    throw new Error("buildScormFiles: debug requested but no debugProbe asset");
  }

  const substitutions = {
    TITLE: escapeMarkup(activityTitle),
    ACTIVITY_ID: slug,
    IDENTIFIER: "doenet-scorm-" + slug,
    DOENET_VERSION: doenetVersion,
    DOENETML_JSON: escapeScriptString(doenetML),
    DEBUG_PROBE: debug ? assets.debugProbe.trimEnd() : "",
  };

  const fill = (template) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (!(key in substitutions))
        throw new Error("Unknown placeholder: " + key);
      return substitutions[key];
    });

  const files = {};
  for (const name of TEMPLATE_FILES) files[name] = fill(assets[name]);
  for (const name of [...STATIC_FILES, ...SCHEMA_FILES]) {
    files[name] = assets[name];
  }
  return files;
}

// Fixed timestamp so the same activity always zips to the same bytes rather
// than embedding the build time.  Zip stores DOS timestamps, which fflate
// derives in local time and which cannot predate 1980 — noon on the earliest
// representable day stays in range at every UTC offset.
const FIXED_MTIME = new Date("1980-01-01T12:00:00Z");

/**
 * Build the package and zip it.  The zip is flat — imsmanifest.xml sits at the
 * root, as LMSes require.
 *
 * @returns {{ name: string, zip: Uint8Array }} suggested filename and bytes.
 */
export function buildScormPackage(assets, options) {
  const files = buildScormFiles(assets, options);
  const encoder = new TextEncoder();

  const entries = {};
  for (const [name, contents] of Object.entries(files)) {
    entries[name] = [encoder.encode(contents), { mtime: FIXED_MTIME }];
  }

  return {
    name: scormSlug(options.id) + "-scorm.zip",
    zip: zipSync(entries),
  };
}
