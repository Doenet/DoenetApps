import { z } from "zod";
import { contentTypeSchema } from "./contentSchema";

export const getRecentContentSchema = z.object({
  mode: z.enum(["edit", "view"]),
  restrictToTypes: z.array(contentTypeSchema).optional(),
});
