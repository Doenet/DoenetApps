import { z } from "zod";
import { uuidSchema } from "../schemas/uuid";

export const updateContentAuditSchema = z.object({
  contentId: uuidSchema,
  source: z.string(),
  doenetmlVersionId: z.number().int().nullable(),
  errorsCheckPasses: z.boolean(),
  accessibilityCheckPasses: z.boolean(),
});
