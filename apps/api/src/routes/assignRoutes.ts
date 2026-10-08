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
import { implement } from "../contract";
import {
  createAssignmentOperation,
  getAllAssignmentScoresOperation,
  getAssignedOperation,
  getAssignedScoresOperation,
  getAssignmentDataOperation,
  getAssignmentResponseOverviewOperation,
  getAssignmentResponseStudentOperation,
  getOwnAssignmentResponseOperation,
  getStudentAssignmentScoresInFolderOperation,
  getStudentAssignmentScoresOperation,
  getStudentSubmittedResponsesOperation,
  recordSubmittedEventOperation,
  updateAssignmentClosedOnOperation,
  updateAssignmentMaxAttemptsOperation,
  updateAssignmentSettingsOperation,
} from "../schemas/assignContract";

export const assignOperations = [
  implement(createAssignmentOperation, createAssignment),
  implement(updateAssignmentClosedOnOperation, updateAssignmentClosedOn),
  implement(updateAssignmentMaxAttemptsOperation, updateAssignmentMaxAttempts),
  implement(updateAssignmentSettingsOperation, updateAssignmentSettings),
  implement(getAssignedOperation, listUserAssigned),
  implement(getAssignmentDataOperation, getAssignmentData),
  implement(getAssignedScoresOperation, getAssignedScores),
  implement(getAllAssignmentScoresOperation, getAllAssignmentScores),
  implement(getStudentAssignmentScoresOperation, (params) =>
    getStudentAssignmentScores({ ...params, parentId: null }),
  ),
  implement(
    getStudentAssignmentScoresInFolderOperation,
    getStudentAssignmentScores,
  ),
  implement(recordSubmittedEventOperation, recordSubmittedEvent),
  implement(
    getAssignmentResponseOverviewOperation,
    getAssignmentResponseOverview,
  ),
  implement(
    getAssignmentResponseStudentOperation,
    getAssignmentResponseStudent,
  ),
  implement(getOwnAssignmentResponseOperation, getAssignmentResponseStudent),
  implement(
    getStudentSubmittedResponsesOperation,
    getStudentSubmittedResponses,
  ),
];
