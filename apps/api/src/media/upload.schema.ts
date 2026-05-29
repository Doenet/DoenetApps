import { z } from "zod";
import { uuidSchema } from "../schemas/uuid";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2560;

// Multipart form fields arrive as strings. Treat empty / missing as "root".
const optionalParentId = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  z.union([uuidSchema, z.null()]),
);

export const uploadImageBodySchema = z.object({
  parentId: optionalParentId,
  name: z.string().optional(),
});

export type UploadImageBody = z.infer<typeof uploadImageBodySchema>;
