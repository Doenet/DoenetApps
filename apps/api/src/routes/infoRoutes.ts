import express from "express";
import { getAllCategories } from "../query/classification";
import {
  getAllDoenetmlVersions,
  getContentDescription,
  getDefaultDoenetmlVersion,
} from "../query/activity";
import {
  queryLoggedIn,
  queryOptionalLoggedIn,
  queryOptionalLoggedInNoArguments,
} from "../middleware/queryMiddleware";
import { contentIdSchema } from "../schemas/contentSchema";
import { getRecentContentSchema } from "../schemas/infoSchemas";
import { getAllLicenses } from "../query/license";
import { getRecentContent } from "../query/recent";

export const infoRouter = express.Router();

infoRouter.get(
  "/getAllCategories",
  queryOptionalLoggedInNoArguments(getAllCategories),
);

infoRouter.get(
  "/getAllDoenetmlVersions",
  queryOptionalLoggedInNoArguments(getAllDoenetmlVersions),
);

infoRouter.get(
  "/getDefaultDoenetmlVersion",
  queryOptionalLoggedInNoArguments(getDefaultDoenetmlVersion),
);

infoRouter.get(
  "/getAllLicenses",
  queryOptionalLoggedInNoArguments(getAllLicenses),
);

infoRouter.get(
  "/getContentDescription/:contentId",
  queryOptionalLoggedIn(getContentDescription, contentIdSchema),
);

infoRouter.get(
  "/getRecentContent",
  queryLoggedIn(getRecentContent, getRecentContentSchema),
);
