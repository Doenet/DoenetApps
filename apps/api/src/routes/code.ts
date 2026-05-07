import express from "express";
import { getContentFromCode } from "../query/assign";

import { queryOptionalLoggedIn } from "../middleware/queryMiddleware";
import z from "zod";

// Schemas
const codeSchema = z.object({ code: z.coerce.number().int() });

// Endpoints
export const codeRouter = express.Router();

codeRouter.get("/:code", queryOptionalLoggedIn(getContentFromCode, codeSchema));
