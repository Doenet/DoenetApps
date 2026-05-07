import { z } from "zod";
import { contentTypeSchema } from "./contentSchema";
import { optionalUuidSchema, uuidOrNullSchema, uuidSchema } from "./uuid";
import { stringAsBoolSchema } from "./boolean";
import { stringAsContentTypes } from "./array";

export const moveContentSchema = z.object({
  contentId: uuidSchema,
  changeParentIdTo: uuidOrNullSchema.optional(),
  desiredPosition: z.int(),
});

export const copyContentSchema = z.object({
  contentIds: z.array(uuidSchema),
  parentId: uuidOrNullSchema,
  prependCopy: z.boolean().default(false),
});

export const createContentCopyInChildrenSchema = z.object({
  contentType: contentTypeSchema,
  childSourceContentIds: z.array(uuidSchema),
  parentId: uuidOrNullSchema,
});

export const getMoveCopyContentDataSchema = z.object({
  parentId: optionalUuidSchema,
  allowedParentTypes: stringAsContentTypes,
  inCurationLibrary: stringAsBoolSchema.optional(),
});

export const checkIfContentContainsSchema = z.object({
  contentId: optionalUuidSchema,
  contentType: contentTypeSchema,
});
