// Generated from the API contract by
// `npm run contract:generate --workspace @doenet-tools/api`. Do not edit.

export const operationRoutes = {
  getAssigned: {
    method: "get",
    path: "/assign/getAssigned",
  },
  getContentDetails: {
    method: "get",
    path: "/info/getContentDetails/{contentId}",
  },
  updateDescription: {
    method: "post",
    path: "/updateContent/updateDescription",
  },
} as const;
