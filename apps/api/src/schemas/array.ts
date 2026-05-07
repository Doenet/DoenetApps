import { z } from "zod";
import { contentTypeSchema } from "./contentSchema";

export const stringAsContentTypes = z
  .string()
  .transform((val) => val.split(","))
  .pipe(z.array(contentTypeSchema));
