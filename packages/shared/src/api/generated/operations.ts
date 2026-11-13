// Generated from the API contract by
// `npm run contract:generate --workspace @doenet-tools/api`. Do not edit.

export const operationRoutes = {
  getAssigned: {
    method: "get",
    path: "/assign/getAssigned",
  },
  getBookToc: {
    method: "get",
    path: "/book/getBookToc/{bookId}",
  },
  setIsBook: {
    method: "post",
    path: "/book/setIsBook",
  },
} as const;
