import { z } from "zod";
import {
  isCreativeCommonsVersion,
  isMediaLicenseCode,
  licenseRequiresAttribution,
  licenseVersionApplies,
} from "@doenet-tools/shared";
import { uuidOrNullSchema, uuidSchema } from "../schemas/uuid";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// S3 objects live under this prefix: the stored `storageKey` is
// `${UPLOAD_KEY_PREFIX}<short-uuid>`. The prefix is a storage-layout detail and
// is deliberately NOT part of the embedded reference — `imageSourceFromStorageKey`
// strips it. The DoenetML viewer's `doenetMediaUrl` points at this same images
// root (see `apps/app/src/utils/media.ts`), re-supplying it at render time.
export const UPLOAD_KEY_PREFIX = "images/";

// Domain-independent reference embedded in documents: `doenet:<short-uuid>`.
export function imageSourceFromStorageKey(storageKey: string): string {
  return `doenet:${storageKey.slice(UPLOAD_KEY_PREFIX.length)}`;
}

// Presigned PUT URLs are short-lived — the client uploads immediately after
// receiving the URL, so a small window is plenty and limits blast radius if a
// URL leaks.
export const PRESIGN_EXPIRES_SECONDS = 60;

// Init only needs enough info to sign the S3 PUT — MIME + size. Everything
// else (parent, name, dimensions) is provided on complete once the client
// actually has the bytes it's about to send.
export const initUploadImageBodySchema = z.object({
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

export type InitUploadImageBody = z.infer<typeof initUploadImageBodySchema>;

// A free-text attribution field: trims, caps length, and normalizes
// blank/omitted to `null` so absent fields never emit empty tag attributes.
function optionalAttributionText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t.length === 0 ? null : t;
    });
}

// An attribution URL: same normalization as `optionalAttributionText`, but
// additionally restricted to `http`/`https`. The credit that DoenetML renders
// links these URLs, so a stored `javascript:`/`data:` URL would be a stored-XSS
// vector; rejecting non-web schemes here keeps that out. Blank/omitted → null.
function optionalAttributionUrl(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v, ctx) => {
      const t = (v ?? "").trim();
      if (t.length === 0) return null;
      let parsed: URL;
      try {
        parsed = new URL(t);
      } catch {
        ctx.addIssue({ code: "custom", message: "Must be a valid URL" });
        return z.NEVER;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        ctx.addIssue({
          code: "custom",
          message: "URL must start with http:// or https://",
        });
        return z.NEVER;
      }
      return t;
    });
}

// Validates a non-empty raw license string into one or two upper-cased,
// space-separated recognized codes, or reports an issue and returns z.NEVER.
function parseLicenseCodes(
  raw: string,
  ctx: z.RefinementCtx,
): string | typeof z.NEVER {
  const codes = raw.split(/\s+/).map((c) => c.toUpperCase());
  if (codes.length > 2) {
    ctx.addIssue({
      code: "custom",
      message: "At most two license codes may be specified",
    });
    return z.NEVER;
  }
  for (const code of codes) {
    if (!isMediaLicenseCode(code)) {
      ctx.addIssue({
        code: "custom",
        message: `Unrecognized license code: ${code}`,
      });
      return z.NEVER;
    }
  }
  return codes.join(" ");
}

// Required license: one or two space-separated DoenetML media-license codes
// (e.g. `CC-BY-SA` or `CC-BY-SA GFDL`). Rejects a blank/omitted value — every
// image must be licensed.
const requiredImageLicenseCodesSchema = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    const raw = (v ?? "").trim();
    if (raw.length === 0) {
      ctx.addIssue({ code: "custom", message: "A license is required" });
      return z.NEVER;
    }
    return parseLicenseCodes(raw, ctx);
  });

// A Creative Commons version (e.g. `4.0`); blank/omitted normalizes to `null`.
const imageLicenseVersionSchema = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    const raw = (v ?? "").trim();
    if (raw.length === 0) return null;
    if (!isCreativeCommonsVersion(raw)) {
      ctx.addIssue({
        code: "custom",
        message: `Unrecognized license version: ${raw}`,
      });
      return z.NEVER;
    }
    return raw;
  });

// The editable DoenetML `<image>` attribution fields. The license is required;
// the rest are optional free text.
const imageAttributionShape = {
  imageAuthorName: optionalAttributionText(255),
  imageAuthorUrl: optionalAttributionUrl(2048),
  imageTitle: optionalAttributionText(255),
  imageOriginalUrl: optionalAttributionUrl(2048),
  imageLicenseCodes: requiredImageLicenseCodesSchema,
  imageLicenseVersion: imageLicenseVersionSchema,
};

// Require an author name whenever the license requires attribution (i.e. is not
// purely public-domain). Public-domain images (`CC0`/`PDM`) legitimately have
// no author, so this stays conditional rather than an unconditional field.
function requireAuthorForAttribution(
  data: { imageLicenseCodes: string; imageAuthorName: string | null },
  ctx: z.RefinementCtx,
) {
  if (
    licenseRequiresAttribution(data.imageLicenseCodes) &&
    !data.imageAuthorName
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["imageAuthorName"],
      message: "An author name is required for this license",
    });
  }
}

// A `licenseVersion` is only meaningful for a (versioned) Creative Commons
// license. Drop one supplied alongside a non-CC license (e.g. GFDL) so it can't
// ride onto the emitted `<image>` tag — the UI already blanks it, but the API is
// the real enforcement boundary for direct callers.
function clearInapplicableVersion<
  T extends { imageLicenseCodes: string; imageLicenseVersion: string | null },
>(data: T): T {
  if (
    data.imageLicenseVersion &&
    !licenseVersionApplies(data.imageLicenseCodes)
  ) {
    return { ...data, imageLicenseVersion: null };
  }
  return data;
}

export const completeUploadImageBodySchema = z
  .object({
    uploadKey: z.string().min(1).max(255),
    parentId: uuidOrNullSchema,
    name: z.string().trim().min(1).max(191).optional(),
    mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES),
    sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
    ...imageAttributionShape,
  })
  .superRefine(requireAuthorForAttribution)
  .transform(clearInapplicableVersion);

export type CompleteUploadImageBody = z.infer<
  typeof completeUploadImageBodySchema
>;

// Body for setting the DoenetML `<image>` attribution on an image content item.
export const setImageAttributionSchema = z
  .object({
    contentId: uuidSchema,
    ...imageAttributionShape,
  })
  .superRefine(requireAuthorForAttribution)
  .transform(clearInapplicableVersion);

export type SetImageAttributionBody = z.infer<typeof setImageAttributionSchema>;
