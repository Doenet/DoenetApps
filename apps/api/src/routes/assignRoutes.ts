import express from "express";
import {
  getAllAssignmentScores,
  getAssignedScores,
  getAssignmentResponseOverview,
  getAssignmentResponseStudent,
  getStudentAssignmentScores,
  getStudentSubmittedResponses,
  listUserAssigned,
  createAssignment,
  recordSubmittedEvent,
  updateAssignmentClosedOn,
  updateAssignmentMaxAttempts,
  updateAssignmentSettings,
  getAssignmentData,
} from "../query/assign";
import { contentIdSchema } from "../schemas/contentSchema";
import {
  assignmentParentSchema,
  assignmentClosedOnSchema,
  getStudentAssignmentScoresSchema,
  recordSubmittedEventSchema,
  assignmentMaxAttemptsSchema,
  assignmentSettingsSchema,
  getAssignmentResponseStudentSchema,
  getStudentSubmittedResponsesSchema,
  createAssignmentSchema,
  assignmentIdSchema,
} from "../schemas/assignSchema";
import {
  queryLoggedIn,
  queryLoggedInNoArguments,
} from "../middleware/queryMiddleware";

export const assignRouter = express.Router();

assignRouter.post(
  "/createAssignment",
  queryLoggedIn(createAssignment, createAssignmentSchema),
);

assignRouter.post(
  "/updateAssignmentClosedOn",
  queryLoggedIn(updateAssignmentClosedOn, assignmentClosedOnSchema),
);

assignRouter.post(
  "/updateAssignmentMaxAttempts",
  queryLoggedIn(updateAssignmentMaxAttempts, assignmentMaxAttemptsSchema),
);

assignRouter.post(
  "/updateAssignmentSettings",
  queryLoggedIn(updateAssignmentSettings, assignmentSettingsSchema),
);

assignRouter.get("/getAssigned", queryLoggedInNoArguments(listUserAssigned));

assignRouter.get(
  "/getAssignmentData/:assignmentId",
  queryLoggedIn(getAssignmentData, assignmentIdSchema),
);

assignRouter.get(
  "/getAssignedScores",
  queryLoggedInNoArguments(getAssignedScores),
);

assignRouter.get(
  "/getAllAssignmentScores/:parentId",
  queryLoggedIn(getAllAssignmentScores, assignmentParentSchema),
);

assignRouter.get(
  "/getStudentAssignmentScores/:studentUserId",
  queryLoggedIn(getStudentAssignmentScores, getStudentAssignmentScoresSchema),
);

assignRouter.get(
  "/getStudentAssignmentScores/:studentUserId/:parentId",
  queryLoggedIn(getStudentAssignmentScores, getStudentAssignmentScoresSchema),
);

assignRouter.post(
  "/recordSubmittedEvent",
  queryLoggedIn(recordSubmittedEvent, recordSubmittedEventSchema),
);

assignRouter.get(
  "/getAssignmentResponseOverview/:contentId",
  queryLoggedIn(getAssignmentResponseOverview, contentIdSchema),
);

assignRouter.get(
  "/getAssignmentResponseStudent/:contentId/:studentUserId",
  queryLoggedIn(
    getAssignmentResponseStudent,
    getAssignmentResponseStudentSchema,
  ),
);

assignRouter.get(
  "/getAssignmentResponseStudent/:contentId",
  queryLoggedIn(
    getAssignmentResponseStudent,
    getAssignmentResponseStudentSchema,
  ),
);

assignRouter.get(
  "/getStudentSubmittedResponses/:contentId/:studentUserId",
  queryLoggedIn(
    getStudentSubmittedResponses,
    getStudentSubmittedResponsesSchema,
  ),
);
