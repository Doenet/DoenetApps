import { z } from "zod";
import { uuidSchema } from "../schemas/uuid";

export const updateContentAuditSchema = z.object({
  contentId: uuidSchema,
  noErrorsConfirmed: z.boolean(),
  accessibilityConfirmed: z.boolean(),
});
