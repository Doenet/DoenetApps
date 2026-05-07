import { z } from "zod";

export const stringAsBoolSchema = z
  .string()
  .transform((val) => val.toLowerCase() === "true" || val === "");
