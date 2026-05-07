import { z } from "zod";
import { uuidSchema } from "./uuid";
import { rangedNumber } from "./rangedNumber";

const variantSchema = z.int().gte(0).lte(16777215);

export const scoreAndStateSchema = z.object({
  contentId: uuidSchema,
  attemptNumber: rangedNumber,
  score: z.number().nullable(),
  state: z.string(),
  item: z
    .object({
      itemNumber: rangedNumber.optional(),
      shuffledItemNumber: rangedNumber.optional(),
      itemAttemptNumber: rangedNumber,
      score: z.number(),
      state: z.string(),
    })
    .optional(),
  shuffledItemOrder: z
    .array(
      z.object({
        shuffledItemNumber: rangedNumber,
        docId: uuidSchema,
        variant: variantSchema,
      }),
    )
    .optional(),
  variant: variantSchema,
});

export const createNewAttemptSchema = z.object({
  contentId: uuidSchema,
  variant: variantSchema,
  state: z.string().nullable(),
  itemNumber: rangedNumber.optional(),
  shuffledItemNumber: rangedNumber.optional(),
  shuffledItemOrder: z
    .array(
      z.object({
        shuffledItemNumber: rangedNumber,
        docId: uuidSchema,
        variant: variantSchema,
      }),
    )
    .optional(),
  initialAttemptInfo: z
    .object({
      variant: variantSchema,
      shuffledItemOrder: z
        .array(
          z.object({
            shuffledItemNumber: rangedNumber,
            docId: uuidSchema,
            variant: variantSchema,
          }),
        )
        .optional(),
    })
    .optional(),
});

export const loadStateSchema = z.object({
  contentId: uuidSchema,
  requestedUserId: uuidSchema.optional(),
  attemptNumber: rangedNumber.optional(),
});

export const loadItemStateSchema = z.object({
  contentId: uuidSchema,
  requestedUserId: uuidSchema.optional(),
  contentAttemptNumber: rangedNumber.optional(),
  itemNumber: rangedNumber.optional(),
  shuffledItemNumber: rangedNumber.optional(),
  itemAttemptNumber: rangedNumber.optional(),
});

export const getScoreSchema = z.object({
  contentId: uuidSchema,
  requestedUserId: uuidSchema.optional(),
});
