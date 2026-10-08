// Generated from the API contract by
// `npm run contract:generate --workspace @doenet-tools/api`. Do not edit.

export const operationRoutes = {
  createAssignment: {
    method: "post",
    path: "/assign/createAssignment",
  },
  getAllAssignmentScores: {
    method: "get",
    path: "/assign/getAllAssignmentScores/{parentId}",
  },
  getAssigned: {
    method: "get",
    path: "/assign/getAssigned",
  },
  getAssignedScores: {
    method: "get",
    path: "/assign/getAssignedScores",
  },
  getAssignmentData: {
    method: "get",
    path: "/assign/getAssignmentData/{assignmentId}",
  },
  getAssignmentResponseOverview: {
    method: "get",
    path: "/assign/getAssignmentResponseOverview/{contentId}",
  },
  getAssignmentResponseStudent: {
    method: "get",
    path: "/assign/getAssignmentResponseStudent/{contentId}/{studentUserId}",
  },
  getOwnAssignmentResponse: {
    method: "get",
    path: "/assign/getAssignmentResponseStudent/{contentId}",
  },
  getStudentAssignmentScores: {
    method: "get",
    path: "/assign/getStudentAssignmentScores/{studentUserId}",
  },
  getStudentAssignmentScoresInFolder: {
    method: "get",
    path: "/assign/getStudentAssignmentScores/{studentUserId}/{parentId}",
  },
  getStudentSubmittedResponses: {
    method: "get",
    path: "/assign/getStudentSubmittedResponses/{contentId}/{studentUserId}",
  },
  recordSubmittedEvent: {
    method: "post",
    path: "/assign/recordSubmittedEvent",
  },
  updateAssignmentClosedOn: {
    method: "post",
    path: "/assign/updateAssignmentClosedOn",
  },
  updateAssignmentMaxAttempts: {
    method: "post",
    path: "/assign/updateAssignmentMaxAttempts",
  },
  updateAssignmentSettings: {
    method: "post",
    path: "/assign/updateAssignmentSettings",
  },
} as const;
