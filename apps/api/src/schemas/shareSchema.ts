import { z } from "zod";
import { uuidSchema } from "./uuid";

export const setContentIsPublicSchema = z.object({
  contentId: uuidSchema,
  isPublic: z.boolean(),
});

export const licenseCodeSchema = z.enum(["CCDUAL", "CCBYSA", "CCBYNCSA"], {
  error: (issue) =>
    issue.input === undefined
      ? "License code is required"
      : "Invalid license code",
});

export const setLicenseCodeSchema = z.object({
  contentId: uuidSchema,
  licenseCode: licenseCodeSchema,
});

export const contentIdEmailSchema = z.object({
  contentId: uuidSchema,
  email: z.email(),
});

export const contentIdUserIdSchema = z.object({
  contentId: uuidSchema,
  userId: uuidSchema,
});
