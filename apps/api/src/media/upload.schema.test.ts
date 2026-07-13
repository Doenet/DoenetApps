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
});
