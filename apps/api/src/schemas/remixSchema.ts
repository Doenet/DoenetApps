import { z } from "zod";
import { uuidSchema } from "./uuid";
import { stringAsBoolSchema } from "./boolean";

export const remixSchema = z.object({
  contentId: uuidSchema,
  includeSource: stringAsBoolSchema.optional(),
});

export const updateRemixedContentToOriginSchema = z.object({
  originContentId: uuidSchema,
  originRevisionNum: z.int().optional(),
  remixContentId: uuidSchema,
  onlyMarkUnchanged: z.boolean().optional(),
});

export const updateOriginContentToRemixSchema = z.object({
  remixContentId: uuidSchema,
  remixRevisionNum: z.int().optional(),
  originContentId: uuidSchema,
  onlyMarkUnchanged: z.boolean().optional(),
});
