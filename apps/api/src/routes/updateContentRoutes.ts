import express from "express";
import {
  createContentSchema,
  contentIdSchema,
  createContentRevisionSchema,
  revertToRevisionSchema,
  updateContentDoenetMLSchema,
  updateCategoriesSchema,
  updateContentRevisionSchema,
  updateContentSettingsSchema,
  saveSyntaxUpdateSchema,
} from "../schemas/contentSchema";
import {
  createContent,
  createContentRevision,
  deleteContent,
  restoreDeletedContent,
  revertToRevision,
  saveSyntaxUpdate,
  updateCategories,
  updateContent,
  updateContentRevision,
} from "../query/activity";
import { queryLoggedIn } from "../middleware/queryMiddleware";

export const updateContentRouter = express.Router();

updateContentRouter.post(
  "/deleteContent",
  queryLoggedIn(deleteContent, contentIdSchema),
);

updateContentRouter.post(
  "/restoreDeletedContent",
  queryLoggedIn(restoreDeletedContent, contentIdSchema),
);

updateContentRouter.post(
  "/createContent/",
  queryLoggedIn(createContent, createContentSchema),
);

updateContentRouter.post(
  "/updateContentSettings",
  queryLoggedIn(updateContent, updateContentSettingsSchema),
);

updateContentRouter.post(
  "/updateCategories",
  queryLoggedIn(updateCategories, updateCategoriesSchema),
);

updateContentRouter.post(
  "/saveDoenetML",
  queryLoggedIn(updateContent, updateContentDoenetMLSchema),
);

updateContentRouter.post(
  "/createContentRevision",
  queryLoggedIn(createContentRevision, createContentRevisionSchema),
);

updateContentRouter.post(
  "/updateContentRevision",
  queryLoggedIn(updateContentRevision, updateContentRevisionSchema),
);

updateContentRouter.post(
  "/revertToRevision",
  queryLoggedIn(revertToRevision, revertToRevisionSchema),
);

updateContentRouter.post(
  "/saveSyntaxUpdate",
  queryLoggedIn(saveSyntaxUpdate, saveSyntaxUpdateSchema),
);
