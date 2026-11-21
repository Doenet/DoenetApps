import { z } from "zod";
import { defineOperation } from "../contract";
import { uuidSchema } from "./uuid";

/** Maximum length (in characters) of a content description. */
export const MAX_DESCRIPTION_LENGTH = 5000;

export const getContentDetailsOperation = defineOperation({
  name: "getContentDetails",
  method: "get",
  path: "/info/getContentDetails/:contentId",
  auth: "optional",
  summary:
    "Get the author-written details (such as the description) of content viewable by the user",
  request: z.object({
    contentId: uuidSchema,
  }),
  response: z.object({
    description: z.string().nullable(),
  }),
});

export const updateDescriptionOperation = defineOperation({
  name: "updateDescription",
  method: "post",
  path: "/updateContent/updateDescription",
  auth: "required",
  summary:
    "Set the public description of content editable by the user; an empty description clears it",
  request: z.object({
    contentId: uuidSchema,
    description: z.string().max(MAX_DESCRIPTION_LENGTH),
  }),
});
