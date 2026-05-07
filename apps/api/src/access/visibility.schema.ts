import { z } from "zod";
import { uuidSchema } from "../schemas/uuid";

export const updateVisibilitySchema = z.object({
  contentId: uuidSchema,
  visibility: z.enum(["public", "private", "unlisted"]),
});
