// Tests for the package builder: the parts that can be checked without a
// browser at all — what ends up in the zip, and whether it is a coherent SCORM
// package.

import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";

import {
  buildScormFiles,
  buildScormPackage,
  scormSlug,
  REQUIRED_ASSETS,
} from "../src/index.js";
import { loadAssets } from "./helpers/assets.js";

const assets = loadAssets();
const base = { doenetML: "<p>hello</p>", title: "My Activity", id: "abc123" };

const unzip = (bytes) => {
  const out = {};
  for (const [name, data] of Object.entries(unzipSync(bytes))) {
    out[name] = strFromU8(data);
  }
  return out;
};

describe("input validation", () => {
  it("names the assets it is missing", () => {
    expect(() => buildScormFiles({}, base)).toThrow(/Missing SCORM assets/);
    const partial = { ...assets };
    delete partial["imsmanifest.xml"];
    expect(() => buildScormFiles(partial, base)).toThrow(/imsmanifest\.xml/);
  });

  it("requires the source and a usable id", () => {
    expect(() => buildScormFiles(assets, { ...base, doenetML: "" })).toThrow(
      /doenetML is required/,
    );
    expect(() => buildScormFiles(assets, { ...base, id: "" })).toThrow(
      /id is required/,
    );
    // An id of only punctuation slugs to nothing, which would collide with
    // every other such id in the LMS.
    expect(() => buildScormFiles(assets, { ...base, id: "!!!" })).toThrow(
      /no usable characters/,
    );
  });

  it("rejects unknown placeholders rather than shipping them", () => {
    const bad = { ...assets, "index.html": "<p>{{NOPE}}</p>" };
    expect(() => buildScormFiles(bad, base)).toThrow(/Unknown placeholder/);
  });
});

describe("scormSlug", () => {
  it("keeps ids safe for filenames and manifest identifiers", () => {
    expect(scormSlug("Abc 123")).toBe("abc-123");
    expect(scormSlug("--a/b--")).toBe("a-b");
    expect(scormSlug("héllo!")).toBe("h-llo");
  });
});

describe("the built files", () => {
  it("substitutes the title and id, escaping markup in the title", () => {
    const files = buildScormFiles(assets, {
      ...base,
      title: 'Fun & "Games" <b>',
    });
    expect(files["index.html"]).toContain('id="abc123"');
    expect(files["imsmanifest.xml"]).toContain("doenet-scorm-abc123");
    for (const name of ["index.html", "activity.html", "imsmanifest.xml"]) {
      expect(files[name]).toContain("Fun &amp; &quot;Games&quot; &lt;b&gt;");
      expect(files[name]).not.toContain("<b>");
    }
  });

  it("leaves no unsubstituted placeholders", () => {
    const files = buildScormFiles(assets, base);
    for (const [name, contents] of Object.entries(files)) {
      expect(contents, name).not.toMatch(/\{\{\w+\}\}/);
    }
  });

  it("pins the requested viewer version", () => {
    const files = buildScormFiles(assets, { ...base, doenetVersion: "0.7.24" });
    expect(files["activity.html"]).toContain("@doenet/standalone@0.7.24");
  });

  it("omits the debug probe unless asked, and rejects asking without one", () => {
    expect(buildScormFiles(assets, base)["index.html"]).not.toContain(
      "DOENET-SIZE-PROBE",
    );
    expect(() => buildScormFiles(assets, { ...base, debug: true })).toThrow(
      /no debugProbe asset/,
    );
  });

  // The source is embedded as a JS string literal, so the one input that could
  // break out of it is a literal </script>.  Every "<" is escaped instead of
  // rejecting such a source, which matters most for the website button: a user
  // whose activity contains one cannot be told to go edit it.
  it.each([
    "<p>plain</p>",
    "a </script> b",
    "</SCRIPT >< script>",
    "unicode \u2713 and \u2028\u2029 line separators",
    "quotes \" ' ` and \\ backslash",
  ])("round-trips the source %j byte-exactly", (doenetML) => {
    const files = buildScormFiles(assets, { ...base, doenetML });
    const literal = /const doenetMLSource = ([\s\S]*?);\n/.exec(
      files["activity.html"],
    )?.[1];
    expect(literal).toBeTruthy();
    expect(literal).not.toContain("</script");
    expect(JSON.parse(literal)).toBe(doenetML);
  });
});

describe("the zip", () => {
  const { name, zip } = buildScormPackage(assets, base);
  const entries = unzip(zip);

  it("is named after the id", () => {
    expect(name).toBe("abc123-scorm.zip");
  });

  it("is flat, with the manifest at the root", () => {
    expect(Object.keys(entries).sort()).toEqual(
      [
        "imsmanifest.xml",
        ...REQUIRED_ASSETS.filter((f) => f !== "imsmanifest.xml"),
      ].sort(),
    );
    for (const key of Object.keys(entries)) {
      expect(key).not.toContain("/");
    }
  });

  it("declares SCORM 2004 4th Edition", () => {
    // The 64,000-char suspend_data budget the bridge relies on is a 4th Edition
    // figure; declaring anything older would licence a player to cap at 4,096.
    expect(entries["imsmanifest.xml"]).toMatch(/2004 4th Edition/);
  });

  it("ships every file it references", () => {
    const referenced = new Set();
    for (const [name, contents] of Object.entries(entries)) {
      if (!/\.(html|xml)$/.test(name)) continue;
      for (const m of contents.matchAll(/(?:href|src)="([^"]+)"/g)) {
        const target = m[1];
        if (!/^(https?:|data:|#)/.test(target)) referenced.add(target);
      }
    }
    expect(referenced.size).toBeGreaterThan(0);
    for (const target of referenced) {
      expect(Object.keys(entries), `referenced: ${target}`).toContain(target);
    }
  });

  it("ships every schema the manifest's schemaLocation names", () => {
    // xsi:schemaLocation is a list of alternating namespace/location pairs, and
    // the locations are relative — they only resolve if the files are in the
    // package.  A validator that cannot fetch them offline would otherwise be
    // reading a promise the zip does not keep.
    const location = /xsi:schemaLocation="([^"]+)"/.exec(
      entries["imsmanifest.xml"],
    )?.[1];
    expect(location).toBeTruthy();

    const locations = location.split(/\s+/).filter((_, i) => i % 2 === 1);
    expect(locations.length).toBeGreaterThan(0);
    for (const target of locations) {
      expect(Object.keys(entries), `schemaLocation: ${target}`).toContain(
        target,
      );
    }
  });

  it("is byte-identical when built twice", () => {
    // Re-exporting an unchanged activity should not produce a different file;
    // the zip carries a fixed timestamp rather than the build time.
    const again = buildScormPackage(assets, base);
    expect(Buffer.from(again.zip).equals(Buffer.from(zip))).toBe(true);
  });
});
