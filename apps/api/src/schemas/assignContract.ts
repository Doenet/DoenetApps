import { z } from "zod";
import { defineOperation } from "../contract";
import { contentSchema, userInfoSchema } from "./sharedResponseSchemas";

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
