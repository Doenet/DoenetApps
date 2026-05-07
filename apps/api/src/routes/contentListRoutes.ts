import express from "express";
import {
  queryLoggedIn,
  queryOptionalLoggedIn,
} from "../middleware/queryMiddleware";
import {
  getMyContent,
  getMyTrash,
  getSharedContent,
  getSharedWithMe,
  searchMyContent,
} from "../query/content_list";
import {
  getContentSchema,
  searchMyContentSchema,
} from "../schemas/contentListSchema";
import { z } from "zod";

export const contentListRouter = express.Router();

contentListRouter.get(
  "/getMyContent/:ownerId/:parentId?",
  queryOptionalLoggedIn(getMyContent, getContentSchema),
);

contentListRouter.get(
  "/searchMyContent/:ownerId/:parentId?",
  queryOptionalLoggedIn(searchMyContent, searchMyContentSchema),
);

contentListRouter.get(
  "/getSharedContent/:ownerId/:parentId?",
  queryOptionalLoggedIn(getSharedContent, getContentSchema),
);

contentListRouter.get("/getMyTrash", queryLoggedIn(getMyTrash, z.object({})));

contentListRouter.get(
  "/getSharedWithMe",
  queryLoggedIn(getSharedWithMe, z.object({})),
);
