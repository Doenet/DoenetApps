// Validate the generated imsmanifest.xml against the official SCORM 2004 4th
// Edition schemas (../vendor/scorm, see the VENDORED.md there).
//
// The other tests assert things we thought to check — that the edition string
// is right, that referenced files exist.  This checks the manifest against the
// spec's own definition, which is the only way to catch structural mistakes
// nobody here thought of: element order, missing required attributes,
// identifiers that do not match their type.
//
// It also covers XML escaping end to end, since an activity title is
// interpolated into the document: a title containing "&" or "<" produces a
// document that is not even well-formed if the escaping is wrong.

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

import { buildScormFiles, SCHEMA_FILES } from "../src/index.js";
import { loadAssets } from "./helpers/assets.js";

const { validateXML } = createRequire(import.meta.url)("xmllint-wasm");

const ENTRY = "imscp_v1p1.xsd";
const assets = loadAssets();

// Validate against the schemas as the package ships them, not as they sit in
// schemas/ — that way this proves the copies a strict validator would actually
// find inside the zip are the ones that work.
const shipped = buildScormFiles(assets, {
  doenetML: "<p>hi</p>",
  title: "My Activity",
  id: "abc123",
});
const schemaFile = (name) => ({ fileName: name, contents: shipped[name] });
// Everything else has to be preloaded: imscp imports xml.xsd, and the ADL and
// IMS Simple Sequencing extensions are reached through their own namespaces.
const imports = SCHEMA_FILES.filter((f) => f !== ENTRY).map(schemaFile);

async function validateManifest(xml) {
  return validateXML({
    xml: [{ fileName: "imsmanifest.xml", contents: xml }],
    schema: [schemaFile(ENTRY)],
    preload: imports,
  });
}

const manifestFor = (options) =>
  buildScormFiles(assets, {
    doenetML: "<p>hi</p>",
    title: "My Activity",
    id: "abc123",
    ...options,
  })["imsmanifest.xml"];

const describeErrors = (result) =>
  (result.errors ?? []).map((e) => e.message ?? e.rawMessage).join("\n");

describe("imsmanifest.xml against the official schemas", () => {
  it("validates", async () => {
    const result = await validateManifest(manifestFor({}));
    expect(describeErrors(result)).toBe("");
    expect(result.valid).toBe(true);
  });

  it.each([
    ['Fun & "Games" <b>hi</b>', "markup and an ampersand"],
    ["Ünïcodé — em dash & ellipsis…", "non-ASCII"],
    ["]]> and <![CDATA[", "a CDATA close sequence"],
    ["<?xml version='1.0'?>", "an XML declaration"],
  ])("stays valid with a title containing %s", async (title) => {
    const result = await validateManifest(manifestFor({ title }));
    expect(describeErrors(result)).toBe("");
    expect(result.valid).toBe(true);
  });

  it("stays valid for an id that slugs to something unusual", async () => {
    const result = await validateManifest(manifestFor({ id: "9---A_b/c" }));
    expect(describeErrors(result)).toBe("");
    expect(result.valid).toBe(true);
  });

  // Without this, a misconfigured validator that cannot resolve its schemas
  // would report every manifest as fine and the tests above would be worthless.
  it.each([
    [
      "a missing required section",
      (m) => m.replace(/<organizations[\s\S]*?<\/organizations>/, ""),
    ],
    [
      "a misspelled element",
      (m) =>
        m
          .replace("<resources>", "<resourcez>")
          .replace("</resources>", "</resourcez>"),
    ],
    [
      "sections out of order",
      (m) =>
        m
          .replace(/<metadata>[\s\S]*?<\/metadata>/, "")
          .replace(
            "</manifest>",
            "<metadata><schema>ADL SCORM</schema></metadata></manifest>",
          ),
    ],
  ])("rejects %s", async (_label, breakIt) => {
    const result = await validateManifest(breakIt(manifestFor({})));
    expect(result.valid).toBe(false);
  });
});
