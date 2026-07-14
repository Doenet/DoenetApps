import { describe, expect, test } from "vitest";
import short from "short-uuid";
import { setImageAttributionSchema } from "./upload.schema.js";

const contentId = short.generate();

// A valid baseline: a license is always required, and an attribution license
// (CC-BY-SA) requires an author. Tests override individual fields.
function parse(overrides: Record<string, unknown> = {}) {
  return setImageAttributionSchema.parse({
    contentId,
    imageLicenseCodes: "CC-BY-SA",
    imageAuthorName: "Jane Doe",
    ...overrides,
  });
}

describe("setImageAttributionSchema", () => {
  test("normalizes blank / omitted optional text fields to null", () => {
    const result = parse({
      imageAuthorUrl: "   ",
      imageTitle: undefined,
      imageOriginalUrl: "",
    });
    expect(result.imageAuthorUrl).toBeNull();
    expect(result.imageTitle).toBeNull();
    expect(result.imageOriginalUrl).toBeNull();
    expect(result.imageLicenseVersion).toBeNull();
  });

  test("trims text fields", () => {
    expect(parse({ imageAuthorName: "  Jane Doe  " }).imageAuthorName).toBe(
      "Jane Doe",
    );
  });

  test("upper-cases and accepts dual licensing", () => {
    expect(
      parse({ imageLicenseCodes: "cc-by-sa gfdl" }).imageLicenseCodes,
    ).toBe("CC-BY-SA GFDL");
  });

  test("rejects an unrecognized license code", () => {
    expect(() => parse({ imageLicenseCodes: "NOT-A-LICENSE" })).toThrow();
  });

  test("rejects more than two license codes", () => {
    expect(() => parse({ imageLicenseCodes: "CC-BY CC-BY-SA GFDL" })).toThrow();
  });

  test("requires a license", () => {
    expect(() => parse({ imageLicenseCodes: "" })).toThrow();
    expect(() => parse({ imageLicenseCodes: undefined })).toThrow();
  });

  test("requires an author for an attribution license", () => {
    expect(() =>
      parse({ imageLicenseCodes: "CC-BY", imageAuthorName: "" }),
    ).toThrow();
  });

  test("does not require an author for a public-domain license", () => {
    const result = parse({ imageLicenseCodes: "CC0", imageAuthorName: "" });
    expect(result.imageLicenseCodes).toBe("CC0");
    expect(result.imageAuthorName).toBeNull();
  });

  test("accepts a recognized Creative Commons version", () => {
    expect(parse({ imageLicenseVersion: "3.0" }).imageLicenseVersion).toBe(
      "3.0",
    );
  });

  test("rejects an unrecognized license version", () => {
    expect(() => parse({ imageLicenseVersion: "9.9" })).toThrow();
  });

  test("drops a license version that doesn't apply to a non-CC license", () => {
    // GFDL is unversioned, so a supplied CC version must not ride onto the tag.
    const result = parse({
      imageLicenseCodes: "GFDL",
      imageLicenseVersion: "4.0",
    });
    expect(result.imageLicenseVersion).toBeNull();
  });

  test("keeps the version when dual-licensing includes a CC license", () => {
    const result = parse({
      imageLicenseCodes: "CC-BY-SA GFDL",
      imageLicenseVersion: "3.0",
    });
    expect(result.imageLicenseVersion).toBe("3.0");
  });

  test("accepts http(s) attribution URLs", () => {
    const result = parse({
      imageAuthorUrl: "https://example.com/jane",
      imageOriginalUrl: "http://example.com/img",
    });
    expect(result.imageAuthorUrl).toBe("https://example.com/jane");
    expect(result.imageOriginalUrl).toBe("http://example.com/img");
  });

  test("rejects a non-web URL scheme (javascript:)", () => {
    expect(() => parse({ imageAuthorUrl: "javascript:alert(1)" })).toThrow();
    expect(() =>
      parse({ imageOriginalUrl: "data:text/html,<script>" }),
    ).toThrow();
  });

  test("rejects a malformed URL", () => {
    expect(() => parse({ imageAuthorUrl: "not a url" })).toThrow();
  });
});
