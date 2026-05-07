import express from "express";
import { queryOptionalLoggedIn } from "../middleware/queryMiddleware";
import { browseExplore, searchExplore } from "../query/explore";
import {
  browseExploreSchema,
  searchExploreSchema,
} from "../schemas/exploreSchema";

export const exploreRouter = express.Router();

exploreRouter.post(
  "/searchExplore",
  queryOptionalLoggedIn(searchExplore, searchExploreSchema),
);

exploreRouter.post(
  "/browseExplore",
  queryOptionalLoggedIn(browseExplore, browseExploreSchema),
);
