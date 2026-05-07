import express from "express";
import { queryLoggedIn } from "../middleware/queryMiddleware";
import { getDoenetMLComparison } from "../query/compare";
import { getDoenetMLComparisonSchema } from "../schemas/compareSchema";

export const compareRouter = express.Router();

compareRouter.get(
  "/getDoenetMLComparison/:contentId/:compareId",
  queryLoggedIn(getDoenetMLComparison, getDoenetMLComparisonSchema),
);
