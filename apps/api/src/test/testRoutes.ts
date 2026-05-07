import express from "express";
import { z } from "zod";
import { uuidSchema } from "../schemas/uuid";
import { queryOptionalLoggedIn } from "../middleware/queryMiddleware";
import { addClassificationsByNames } from "./testQueries";

export const testRouter = express.Router();

const classificationByNamesSchema = z.object({
  systemShortName: z.string(),
  category: z.string(),
  subCategory: z.string(),
  code: z.string(),
});

const addClassificationsByNamesSchema = z.object({
  contentId: uuidSchema,
  classifications: z.array(classificationByNamesSchema),
});

testRouter.post(
  "/addClassificationsByNames",
  queryOptionalLoggedIn(
    addClassificationsByNames,
    addClassificationsByNamesSchema,
  ),
);
