import { z } from "zod";
import { uuidSchema } from "../schemas/uuid";

// Accepts either ":contentId" or ":contentId.ext" — the optional extension is
// only for nicer URLs; we ignore it and serve based on stored mimeType.
const idAndExt = /^([0-9A-Za-z_-]{22,})(?:\.[A-Za-z0-9]+)?$/;

export const serveImageParamSchema = z.object({
  contentId: z
    .string()
    .transform((val) => val.match(idAndExt)?.[1] ?? val)
    .pipe(uuidSchema),
});
