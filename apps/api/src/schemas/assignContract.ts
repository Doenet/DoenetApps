import { z } from "zod";
import { defineOperation } from "../contract";
import { contentIdSchema } from "./contentSchema";
import {
  assignmentClosedOnSchema,
  assignmentIdSchema,
  assignmentMaxAttemptsSchema,
  assignmentParentSchema,
  assignmentSettingsSchema,
  createAssignmentSchema,
  getAssignmentResponseStudentSchema,
  getStudentSubmittedResponsesSchema,
  recordSubmittedEventSchema,
} from "./assignSchema";
import {
  assignmentModeSchema,
  calculatedScoreDataSchema,
  contentSchema,
  contentTypeSchema,
  dateTimeWire,
  itemScoresSchema,
  latestAttemptSchema,
  scoreDataSchema,
  userInfoSchema,
  uuidWire,
} from "./sharedResponseSchemas";
import { uuidSchema } from "./uuid";

const contentNameSchema = z.object({ contentId: uuidWire, name: z.string() });

const orderedActivityScoreSchema = z.object({
  contentId: uuidWire,
  activityName: z.string(),
  score: z.number().nullable(),
});

export const createAssignmentOperation = defineOperation({
  name: "createAssignment",
  method: "post",
  path: "/assign/createAssignment",
  auth: "required",
  summary: "Create an assignment by remixing an activity into a folder",
  request: createAssignmentSchema,
  response: z.object({
    assignmentId: uuidWire,
    classCode: z.number().nullable(),
    assignmentClosedOn: dateTimeWire,
  }),
});

export const updateAssignmentClosedOnOperation = defineOperation({
  name: "updateAssignmentClosedOn",
  method: "post",
  path: "/assign/updateAssignmentClosedOn",
  auth: "required",
  request: assignmentClosedOnSchema,
});

export const updateAssignmentMaxAttemptsOperation = defineOperation({
  name: "updateAssignmentMaxAttempts",
  method: "post",
  path: "/assign/updateAssignmentMaxAttempts",
  auth: "required",
  request: assignmentMaxAttemptsSchema,
  response: z.object({ success: z.boolean(), maxAttempts: z.number() }),
});

export const updateAssignmentSettingsOperation = defineOperation({
  name: "updateAssignmentSettings",
  method: "post",
  path: "/assign/updateAssignmentSettings",
  auth: "required",
  request: assignmentSettingsSchema,
  response: z.object({
    success: z.boolean(),
    mode: assignmentModeSchema.optional(),
    individualizeByStudent: z.boolean().optional(),
  }),
});

export const getAssignedOperation = defineOperation({
  name: "getAssigned",
  method: "get",
  path: "/assign/getAssigned",
  auth: "required",
  summary: "List the assignments the signed-in user has been assigned",
  response: z.object({
    assignments: z.array(contentSchema),
    user: userInfoSchema,
  }),
});

export const getAssignmentDataOperation = defineOperation({
  name: "getAssignmentData",
  method: "get",
  path: "/assign/getAssignmentData/:assignmentId",
  auth: "required",
  summary: "Get what the signed-in user needs to take an assignment",
  request: assignmentIdSchema,
  response: z.discriminatedUnion("assignmentOpen", [
    z.object({ assignmentOpen: z.literal(false), assignment: contentSchema }),
    z.object({
      assignmentOpen: z.literal(true),
      assignment: contentSchema,
      scoreData: scoreDataSchema,
    }),
  ]),
});

export const getAssignedScoresOperation = defineOperation({
  name: "getAssignedScores",
  method: "get",
  path: "/assign/getAssignedScores",
  auth: "required",
  response: z.object({
    userData: userInfoSchema,
    orderedActivityScores: z.array(orderedActivityScoreSchema),
  }),
});

export const getAllAssignmentScoresOperation = defineOperation({
  name: "getAllAssignmentScores",
  method: "get",
  path: "/assign/getAllAssignmentScores/:parentId",
  auth: "required",
  request: assignmentParentSchema,
  response: z.object({
    orderedStudents: z.array(userInfoSchema),
    orderedAssignments: z.array(contentNameSchema),
    scores: z.array(z.array(z.number().nullable())),
    folder: contentNameSchema,
  }),
});

const studentAssignmentScoresResponse = z.object({
  studentData: userInfoSchema,
  orderedActivityScores: z.array(orderedActivityScoreSchema),
  folder: contentNameSchema.nullable(),
});

export const getStudentAssignmentScoresOperation = defineOperation({
  name: "getStudentAssignmentScores",
  method: "get",
  path: "/assign/getStudentAssignmentScores/:studentUserId",
  auth: "required",
  summary: "Scores of a student on all assignments of the signed-in user",
  request: z.object({ studentUserId: uuidSchema }),
  response: studentAssignmentScoresResponse,
});

export const getStudentAssignmentScoresInFolderOperation = defineOperation({
  name: "getStudentAssignmentScoresInFolder",
  method: "get",
  path: "/assign/getStudentAssignmentScores/:studentUserId/:parentId",
  auth: "required",
  summary: "Scores of a student on the assignments in a folder",
  request: z.object({ studentUserId: uuidSchema, parentId: uuidSchema }),
  response: studentAssignmentScoresResponse,
});

export const recordSubmittedEventOperation = defineOperation({
  name: "recordSubmittedEvent",
  method: "post",
  path: "/assign/recordSubmittedEvent",
  auth: "required",
  request: recordSubmittedEventSchema,
});

export const getAssignmentResponseOverviewOperation = defineOperation({
  name: "getAssignmentResponseOverview",
  method: "get",
  path: "/assign/getAssignmentResponseOverview/:contentId",
  auth: "required",
  request: contentIdSchema,
  response: z.object({
    scoreSummary: z.object({
      mode: assignmentModeSchema,
      scores: z.array(
        z.object({
          score: z.number(),
          bestAttemptNumber: z.number(),
          itemScores: itemScoresSchema.nullable(),
          latestAttempt: latestAttemptSchema.nullable(),
          user: userInfoSchema,
        }),
      ),
    }),
    content: contentSchema,
    itemNames: z.array(z.string()),
  }),
});

const attemptScoreSchema = z.object({
  attemptNumber: z.number(),
  score: z.number(),
});

const assignmentResponseStudentBase = {
  mode: assignmentModeSchema,
  user: userInfoSchema,
  assignment: z.object({
    name: z.string(),
    type: contentTypeSchema,
    contentId: uuidWire,
    shuffledOrder: z.boolean(),
    isOpen: z.boolean(),
  }),
  overallScores: calculatedScoreDataSchema,
  itemNames: z.array(z.string()),
  allStudents: z.array(
    z.object({
      userId: uuidWire,
      lastNames: z.string(),
      firstNames: z.string().nullable(),
    }),
  ),
};

const assignmentResponseStudentResponse = z.discriminatedUnion(
  "singleItemAttempt",
  [
    z.object({
      ...assignmentResponseStudentBase,
      singleItemAttempt: z.literal(true),
      attemptNumber: z.number(),
      itemAttemptState: z.object({
        state: z.string().nullable(),
        score: z.number(),
        variant: z.number(),
        docId: uuidWire,
        itemNumber: z.number().optional(),
        shuffledItemNumber: z.number().optional(),
      }),
      attemptScores: z.array(attemptScoreSchema),
      itemScores: itemScoresSchema,
      content: contentSchema,
      responseCounts: z.array(z.array(z.union([z.string(), z.number()]))),
    }),
    z.object({
      ...assignmentResponseStudentBase,
      singleItemAttempt: z.literal(false),
      allAttemptScores: z.discriminatedUnion("byItem", [
        z.object({
          byItem: z.literal(true),
          itemAttemptScores: z.array(
            z.object({
              itemNumber: z.number(),
              shuffledItemNumber: z.number(),
              attempts: z.array(
                z.object({ itemAttemptNumber: z.number(), score: z.number() }),
              ),
            }),
          ),
        }),
        z.object({
          byItem: z.literal(false),
          attemptScores: z.array(
            attemptScoreSchema.extend({
              items: z.array(
                z.object({
                  score: z.number(),
                  itemNumber: z.number(),
                  shuffledItemNumber: z.number(),
                }),
              ),
            }),
          ),
        }),
      ]),
    }),
  ],
);

export const getAssignmentResponseStudentOperation = defineOperation({
  name: "getAssignmentResponseStudent",
  method: "get",
  path: "/assign/getAssignmentResponseStudent/:contentId/:studentUserId",
  auth: "required",
  summary: "A student's responses to an assignment owned by the signed-in user",
  request: getAssignmentResponseStudentSchema.extend({
    studentUserId: uuidSchema,
  }),
  response: assignmentResponseStudentResponse,
});

export const getOwnAssignmentResponseOperation = defineOperation({
  name: "getOwnAssignmentResponse",
  method: "get",
  path: "/assign/getAssignmentResponseStudent/:contentId",
  auth: "required",
  summary: "The signed-in user's own responses to an assignment",
  request: getAssignmentResponseStudentSchema.omit({ studentUserId: true }),
  response: assignmentResponseStudentResponse,
});

export const getStudentSubmittedResponsesOperation = defineOperation({
  name: "getStudentSubmittedResponses",
  method: "get",
  path: "/assign/getStudentSubmittedResponses/:contentId/:studentUserId",
  auth: "required",
  request: getStudentSubmittedResponsesSchema.extend({
    studentUserId: uuidSchema,
  }),
  response: z.object({
    responses: z.array(
      z.object({
        response: z.string(),
        answerCreditAchieved: z.number(),
        submittedAt: dateTimeWire,
      }),
    ),
  }),
});
