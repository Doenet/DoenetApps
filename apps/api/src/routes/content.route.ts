import express from "express";
import { queryLoggedIn } from "../middleware/queryMiddleware";
import { updateVisibilitySchema } from "../access/visibility.schema";
import { updateVisibility } from "../access/visibility";

export const contentRouter = express.Router();

contentRouter.patch(
  "/:contentId/access",
  queryLoggedIn(updateVisibility, updateVisibilitySchema),
);
