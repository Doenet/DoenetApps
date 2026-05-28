import express from "express";
import { queryLoggedIn } from "../middleware/queryMiddleware";
import { updateContentAudit, updateContentAuditSchema } from "../content-audit";
import { updateVisibility, updateVisibilitySchema } from "../access";

export const contentRouter = express.Router();

contentRouter.patch(
  "/:contentId/access",
  queryLoggedIn(updateVisibility, updateVisibilitySchema),
);

contentRouter.put(
  "/:contentId/audit",
  queryLoggedIn(updateContentAudit, updateContentAuditSchema),
);
