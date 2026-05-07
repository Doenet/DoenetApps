import { Request, Response } from "express";
import { z } from "zod";
import { handleErrors } from "../errors/routeErrorHandler";
import { convertUUID } from "../utils/uuid";
import { StatusCodes } from "http-status-codes";

type LoggedInUser = {
  loggedInUserId: Uint8Array;
};

type OptionalLoggedInUser = {
  loggedInUserId?: Uint8Array;
};

export function queryLoggedIn<T extends z.ZodTypeAny>(
  query: (params: z.infer<T> & LoggedInUser) => unknown,
  schema: T,
) {
  return async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.FORBIDDEN).json({ error: "Must be logged in" });
    } else {
      try {
        const loggedInUserId = req.user.userId;
        const params = schema.parse({
          ...req.body,
          ...req.query,
          ...req.params,
        });
        // TODO: determine how to type this correctly with zod 4
        //@ts-expect-error type z.core.output<T> is not considered object so spread not allowed
        const results = convertUUID(await query({ loggedInUserId, ...params }));
        res.send(results);
      } catch (e) {
        handleErrors(res, e);
      }
    }
  };
}

export function queryOptionalLoggedIn<T extends z.ZodTypeAny>(
  query: (params: z.infer<T> & OptionalLoggedInUser) => unknown,
  schema: T,
) {
  return async (req: Request, res: Response) => {
    try {
      const loggedInUserId = req.user?.userId;
      const params = schema.parse({
        ...req.body,
        ...req.query,
        ...req.params,
      });
      // TODO: determine how to type this correctly with zod 4
      //@ts-expect-error type z.core.output<T> is not considered object so spread not allowed
      const results = convertUUID(await query({ loggedInUserId, ...params }));
      res.send(results);
    } catch (e) {
      handleErrors(res, e);
    }
  };
}

export function queryLoggedInNoArguments(
  query: (params: LoggedInUser) => unknown,
) {
  return async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.FORBIDDEN).json({ error: "Must be logged in" });
    } else {
      try {
        const loggedInUserId = req.user.userId;
        const results = convertUUID(await query({ loggedInUserId }));
        res.send(results);
      } catch (e) {
        handleErrors(res, e);
      }
    }
  };
}

export function queryOptionalLoggedInNoArguments(
  query: (params: OptionalLoggedInUser) => unknown,
) {
  return async (req: Request, res: Response) => {
    try {
      const loggedInUserId = req.user?.userId;
      const results = convertUUID(await query({ loggedInUserId }));
      res.send(results);
    } catch (e) {
      handleErrors(res, e);
    }
  };
}
