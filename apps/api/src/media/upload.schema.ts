import { z } from "zod";
import { uuidOrNullSchema } from "../schemas/uuid";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// Canonical MIME → file extension. The server puts the ext into the S3 key so
// CDN URLs end with a sensible extension for browser sniffing.
export const MIME_TO_EXT: Record<
  (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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
