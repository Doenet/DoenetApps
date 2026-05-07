import express from "express";
import {
  createNewAttemptSchema,
  getScoreSchema,
  loadItemStateSchema,
  loadStateSchema,
  scoreAndStateSchema,
} from "../schemas/scoreSchema";
import {
  createNewAttempt,
  getScore,
  loadState,
  saveScoreAndState,
} from "../query/scores";
import { queryLoggedIn } from "../middleware/queryMiddleware";

export const scoreRouter = express.Router();

scoreRouter.post(
  "/saveScoreAndState",
  queryLoggedIn(saveScoreAndState, scoreAndStateSchema),
);

scoreRouter.post(
  "/createNewAttempt",
  queryLoggedIn(createNewAttempt, createNewAttemptSchema),
);

scoreRouter.get("/loadState", queryLoggedIn(loadState, loadStateSchema));
scoreRouter.get(
  "/loadItemState",
  queryLoggedIn(loadState, loadItemStateSchema),
);

scoreRouter.get("/getScore", queryLoggedIn(getScore, getScoreSchema));
