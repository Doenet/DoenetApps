import { z } from "zod";
import { optionalUuidSchema, uuidOrNullSchema, uuidSchema } from "./uuid";
import { stringAsBoolSchema } from "./boolean";

export const curationParentIdSchema = z.object({
  parentId: optionalUuidSchema,
});

export const searchCurationFolderContentSchema = z.object({
  parentId: optionalUuidSchema,
  query: z.string(),
});

export const sourceIdSchema = z.object({
  sourceId: uuidSchema,
});

export const addCommentSchema = z.object({
  contentId: uuidSchema,
  comment: z.string(),
  asEditor: z.boolean().optional(),
});

export const getCommentsSchema = z.object({
  contentId: uuidSchema,
  asEditor: stringAsBoolSchema,
});

export const createCurationFolderSchema = z.object({
  name: z.string(),
  parentId: uuidOrNullSchema,
});
