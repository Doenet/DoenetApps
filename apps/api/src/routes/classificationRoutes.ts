import express from "express";
import {
  addClassification,
  getClassificationCategories,
  getClassifications,
  removeClassification,
  searchPossibleClassifications,
} from "../query/classification";
import {
  classificationSchema,
  searchPossibleClassificationsSchema,
} from "../schemas/classificationSchema";
import {
  queryLoggedIn,
  queryOptionalLoggedInNoArguments,
  queryOptionalLoggedIn,
} from "../middleware/queryMiddleware";
import { contentIdSchema } from "../schemas/contentSchema";

export const classificationRouter = express.Router();

classificationRouter.get(
  "/getClassificationCategories",
  queryOptionalLoggedInNoArguments(getClassificationCategories),
);

classificationRouter.get(
  "/searchPossibleClassifications",
  queryOptionalLoggedIn(
    searchPossibleClassifications,
    searchPossibleClassificationsSchema,
  ),
);

classificationRouter.post(
  "/addClassification",
  queryLoggedIn(addClassification, classificationSchema),
);

classificationRouter.post(
  "/removeClassification",
  queryLoggedIn(removeClassification, classificationSchema),
);

classificationRouter.post(
  "/getClassifications",
  queryLoggedIn(getClassifications, contentIdSchema),
);
