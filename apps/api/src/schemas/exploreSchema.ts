import { z } from "zod";
import { uuidSchema } from "./uuid";

export const browseExploreSchema = z.object({
  systemId: z.int().optional(),
  categoryId: z.int().optional(),
  subCategoryId: z.int().optional(),
  classificationId: z.int().optional(),
  isUnclassified: z.boolean().optional(),
  // Codes are resolved to category ids, and codes that name the same category
  // give one id, so the filter's size is bounded by the number of categories.
  // The cap only guards against oversized request bodies. Clients only send
  // codes of existing categories. Each code is also capped: `categories.code`
  // is VARCHAR(191), and 400 UTF-16 units is more than any value it can hold.
  categories: z
    .array(z.string().max(400))
    .max(100)
    .transform((val) => new Set(val)),
  ownerId: uuidSchema.optional(),
});

export const searchExploreSchema = browseExploreSchema.extend({
  query: z.string(),
});
