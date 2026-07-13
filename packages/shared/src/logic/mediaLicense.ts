// The set of media licenses that DoenetML's `<image>` tag understands via its
// `licenseCodes` attribute. Uploaded image content items are attributed with
// these codes (rather than the activity-level `licenseCode`), and the codes are
// emitted verbatim onto the generated `<image ... licenseCodes="...">` tag,
// where the DoenetML worker derives the license name, URL, and credit sentence.
//
// This list mirrors `mediaLicenses` in `@doenet/utils` (the DoenetML worker
// package). That package is not a dependency here, so the small, stable list is
// duplicated. Keep the codes in sync with DoenetML; unrecognized codes are
// silently ignored by the worker.

/** A Creative Commons license version whose URL embeds the version number. */
export type CreativeCommonsVersion = "1.0" | "2.0" | "2.5" | "3.0" | "4.0";

/** The Creative Commons license versions DoenetML recognizes, oldest first. */
export const creativeCommonsVersions: CreativeCommonsVersion[] = [
  "1.0",
  "2.0",
  "2.5",
  "3.0",
  "4.0",
];

/** The default Creative Commons version used when an author omits it. */
export const defaultCreativeCommonsVersion: CreativeCommonsVersion = "4.0";

/**
 * How a license is phrased in the credit sentence:
 * - `creative-commons` — versioned; the version selects the name and URL.
 * - `public-domain` — the work is described as being in the public domain.
 * - `license` — a fixed, unversioned license.
 */
export type MediaLicenseKind = "creative-commons" | "public-domain" | "license";

export type MediaLicenseCode =
  | "CC-BY"
  | "CC-BY-SA"
  | "CC-BY-ND"
  | "CC-BY-NC"
  | "CC-BY-NC-SA"
  | "CC-BY-NC-ND"
  | "CC0"
  | "PDM"
  | "GFDL"
  | "FAL"
  | "OGL"
  | "MIT"
  | "APACHE-2.0";

export type MediaLicenseInfo = {
  code: MediaLicenseCode;
  /** Short label (Creative Commons entries omit the version). */
  name: string;
  /** One-line explanation shown next to the choice in the editor. */
  description: string;
  kind: MediaLicenseKind;
};

export const mediaLicenses: MediaLicenseInfo[] = [
  {
    code: "CC-BY",
    name: "Attribution",
    description:
      "Creative Commons Attribution: reuse with credit, including commercially.",
    kind: "creative-commons",
  },
  {
    code: "CC-BY-SA",
    name: "Attribution-ShareAlike",
    description:
      "Creative Commons Attribution-ShareAlike: reuse with credit; adaptations keep the same license.",
    kind: "creative-commons",
  },
  {
    code: "CC-BY-ND",
    name: "Attribution-NoDerivatives",
    description:
      "Creative Commons Attribution-NoDerivatives: reuse unchanged, with credit.",
    kind: "creative-commons",
  },
  {
    code: "CC-BY-NC",
    name: "Attribution-NonCommercial",
    description:
      "Creative Commons Attribution-NonCommercial: reuse with credit for noncommercial purposes.",
    kind: "creative-commons",
  },
  {
    code: "CC-BY-NC-SA",
    name: "Attribution-NonCommercial-ShareAlike",
    description:
      "Creative Commons Attribution-NonCommercial-ShareAlike: noncommercial reuse with credit; adaptations keep the same license.",
    kind: "creative-commons",
  },
  {
    code: "CC-BY-NC-ND",
    name: "Attribution-NonCommercial-NoDerivatives",
    description:
      "Creative Commons Attribution-NonCommercial-NoDerivatives: reuse unchanged for noncommercial purposes, with credit.",
    kind: "creative-commons",
  },
  {
    code: "CC0",
    name: "CC0 1.0 Public Domain Dedication",
    description:
      "Creative Commons Zero: the creator has dedicated the work to the public domain.",
    kind: "public-domain",
  },
  {
    code: "PDM",
    name: "Public Domain Mark 1.0",
    description:
      "Public Domain Mark: the work is free of known copyright restrictions.",
    kind: "public-domain",
  },
  {
    code: "GFDL",
    name: "GNU Free Documentation License",
    description:
      "GNU Free Documentation License: copyleft license common on Wikimedia.",
    kind: "license",
  },
  {
    code: "FAL",
    name: "Free Art License 1.3",
    description: "Free Art License: copyleft license for artistic works.",
    kind: "license",
  },
  {
    code: "OGL",
    name: "Open Government Licence v3.0 (UK)",
    description:
      "UK Open Government Licence: reuse government material with attribution.",
    kind: "license",
  },
  {
    code: "MIT",
    name: "MIT License",
    description:
      "MIT License: permissive license common for icon and illustration sets.",
    kind: "license",
  },
  {
    code: "APACHE-2.0",
    name: "Apache License 2.0",
    description:
      "Apache License 2.0: permissive license common for icon and illustration sets.",
    kind: "license",
  },
];

const mediaLicensesByCode: Record<string, MediaLicenseInfo> =
  Object.fromEntries(mediaLicenses.map((info) => [info.code, info]));

/** The recognized codes as a plain string array (for zod enums, etc.). */
export const mediaLicenseCodes: MediaLicenseCode[] = mediaLicenses.map(
  (info) => info.code,
);

/** True when `code` is a media-license code DoenetML recognizes. */
export function isMediaLicenseCode(code: unknown): code is MediaLicenseCode {
  return typeof code === "string" && code in mediaLicensesByCode;
}

/** True when `version` is a Creative Commons version DoenetML recognizes. */
export function isCreativeCommonsVersion(
  version: unknown,
): version is CreativeCommonsVersion {
  return (
    typeof version === "string" &&
    (creativeCommonsVersions as string[]).includes(version)
  );
}

/**
 * Whether a set of license codes (the space-separated `imageLicenseCodes`
 * string) requires the work to be credited to an author. True unless *every*
 * code is a public-domain marker (`CC0`/`PDM`), which waive attribution. Used
 * to require an author name for attribution licenses while leaving it optional
 * for public-domain images.
 */
export function licenseRequiresAttribution(codes: string): boolean {
  const list = codes.trim().split(/\s+/).filter(Boolean);
  if (list.length === 0) return false;
  return list.some((code) => {
    const info = mediaLicensesByCode[code.toUpperCase()];
    // An unrecognized code is treated as attribution-requiring (conservative).
    return !info || info.kind !== "public-domain";
  });
}

/**
 * Editable DoenetML `<image>` attribution/licensing for an uploaded image
 * content item. `imageLicenseCodes` is one or two space-separated
 * {@link MediaLicenseCode} values; the fields map onto the `<image>`
 * attributes `authorName`, `authorUrl`, `imageName`, `originalUrl`,
 * `licenseCodes`, and `licenseVersion` respectively.
 */
export type ImageAttribution = {
  imageAuthorName: string | null;
  imageAuthorUrl: string | null;
  imageTitle: string | null;
  imageOriginalUrl: string | null;
  imageLicenseCodes: string | null;
  imageLicenseVersion: string | null;
};
