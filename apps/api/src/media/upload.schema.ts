import { z } from "zod";
import { uuidOrNullSchema } from "../schemas/uuid";

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

export const completeUploadImageBodySchema = z.object({
  uploadKey: z.string().min(1).max(255),
  parentId: uuidOrNullSchema,
  name: z.string().trim().min(1).max(191).optional(),
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

export type CompleteUploadImageBody = z.infer<
  typeof completeUploadImageBodySchema
>;
