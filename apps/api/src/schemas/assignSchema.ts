import { z } from "zod";
import { optionalUuidSchema, uuidOrNullSchema, uuidSchema } from "./uuid";
import { DateTime } from "luxon";
import { stringAsBoolSchema } from "./boolean";
import {
  rangedNumber,
  stringAsRangedNumber,
  stringAsRangedNumberIncludingZero,
} from "./rangedNumber";

/**
 * Schema for validating assignment closed-on data.
 * Validates that the assignment has a unique content identifier and a closed-on timestamp.
 *
 * @property {string} contentId - A UUID that uniquely identifies the assignment content
 * @property {DateTime} closedOn - An ISO 8601 datetime string with timezone information
 *                                 (e.g., "2024-01-15T10:30:00+05:00" or "2024-01-15T10:30:00Z" for UTC).
 *                                 The `{offset: true}` requirement ensures the datetime includes a timezone
 *                                 indicator (a numeric offset or "Z" for UTC), rejecting values with no timezone.
 *                                 The string is transformed into a Luxon DateTime object for server-side processing.
 *
 * @example
 * // Valid input
 * { contentId: "550e8400-e29b-41d4-a716-446655440000", closedOn: "2024-01-15T10:30:00+05:00" }
 *
 * // Invalid - no timezone indicator
 * { contentId: "550e8400-e29b-41d4-a716-446655440000", closedOn: "2024-01-15T10:30:00" }
 */
export const assignmentClosedOnSchema = z.object({
  contentId: uuidSchema,
  closedOn: z.iso
    .datetime({ offset: true })
    .transform((val) => DateTime.fromISO(val)),
});

export const createAssignmentSchema = assignmentClosedOnSchema.extend({
  destinationParentId: uuidOrNullSchema,
});

export const assignmentMaxAttemptsSchema = z.object({
  contentId: uuidSchema,
  maxAttempts: stringAsRangedNumberIncludingZero,
});

export const assignmentSettingsSchema = z.object({
  contentId: uuidSchema,
  mode: z.enum(["formative", "summative"]).optional(),
  individualizeByStudent: z.boolean().optional(),
});

export const assignmentParentSchema = z.object({
  parentId: uuidSchema,
});

export const getStudentAssignmentScoresSchema = z.object({
  studentUserId: uuidSchema,
  parentId: optionalUuidSchema,
});

export const recordSubmittedEventSchema = z.object({
  contentId: uuidSchema,
  contentAttemptNumber: rangedNumber,
  itemAttemptNumber: rangedNumber.nullable(),
  answerId: z.string(),
  response: z.string(),
  answerNumber: rangedNumber.optional(),
  componentNumber: rangedNumber,
  itemNumber: rangedNumber,
  shuffledItemNumber: rangedNumber,
  answerCreditAchieved: z.number(),
  componentCreditAchieved: z.number(),
  itemCreditAchieved: z.number(),
});

export const assignmentIdSchema = z.object({ assignmentId: uuidSchema });

export const getAssignmentResponseStudentSchema = z.object({
  contentId: uuidSchema,
  studentUserId: uuidSchema.optional(),
  shuffledOrder: stringAsBoolSchema,
  itemNumber: stringAsRangedNumber.optional(),
  attemptNumber: stringAsRangedNumber.optional(),
});

export const getStudentSubmittedResponsesSchema = z.object({
  contentId: uuidSchema,
  studentUserId: uuidSchema.optional(),
  answerId: z.string(),
  shuffledOrder: stringAsBoolSchema,
  requestedItemNumber: stringAsRangedNumber.optional(),
  contentAttemptNumber: stringAsRangedNumber,
  itemAttemptNumber: stringAsRangedNumber.optional(),
});
