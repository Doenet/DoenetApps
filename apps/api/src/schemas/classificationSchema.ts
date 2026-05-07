import { z } from "zod";
import { uuidSchema } from "./uuid";

export const searchPossibleClassificationsSchema = z.object({
  query: z.string().optional(),
  systemId: z.coerce.number().int().optional(),
  categoryId: z.coerce.number().int().optional(),
  subCategoryId: z.coerce.number().int().optional(),
});

export const classificationSchema = z.object({
  contentId: uuidSchema,
  classificationId: z.int(),
});
