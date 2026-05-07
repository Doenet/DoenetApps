import { z } from "zod";
import { uuidSchema } from "./uuid";

export const browseExploreSchema = z.object({
  systemId: z.int().optional(),
  categoryId: z.int().optional(),
  subCategoryId: z.int().optional(),
  classificationId: z.int().optional(),
  isUnclassified: z.boolean().optional(),
  categories: z.array(z.string()).transform((val) => new Set(val)),
  ownerId: uuidSchema.optional(),
});

export const searchExploreSchema = browseExploreSchema.extend({
  query: z.string(),
});
