import { z } from "zod";
import { optionalUuidSchema, uuidSchema } from "./uuid";

export const getContentSchema = z.object({
  ownerId: uuidSchema,
  parentId: optionalUuidSchema,
});

export const searchMyContentSchema = z.object({
  ownerId: uuidSchema,
  parentId: optionalUuidSchema,
  isLibrary: z.boolean().optional(),
  query: z.string(),
});
