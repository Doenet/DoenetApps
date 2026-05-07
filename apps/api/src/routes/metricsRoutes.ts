import express from "express";
import { queryOptionalLoggedIn } from "../middleware/queryMiddleware";
import {
  getWeeklyContentCreated,
  getWeeklyContentSharedPublicly,
  getWeeklyUsersJoined,
} from "../query/metrics";
import { z } from "zod";

export const metricsRouter = express.Router();

// These fields are currently optional.
// If returning the entire date range becomes too much data, we can require them.
const metricStartEnd = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
});

metricsRouter.get(
  "/users/joined/weekly",
  queryOptionalLoggedIn(getWeeklyUsersJoined, metricStartEnd),
);

metricsRouter.get(
  "/content/created/weekly",
  queryOptionalLoggedIn(getWeeklyContentCreated, metricStartEnd),
);

metricsRouter.get(
  "/content/sharedPublicly/weekly",
  queryOptionalLoggedIn(getWeeklyContentSharedPublicly, metricStartEnd),
);
