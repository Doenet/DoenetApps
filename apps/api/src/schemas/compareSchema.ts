import { z } from "zod";
import { uuidSchema } from "./uuid";

export const getDoenetMLComparisonSchema = z.object({
  contentId: uuidSchema,
  compareId: uuidSchema,
});
