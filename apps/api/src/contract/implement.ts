import express, { Request, Response, Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { handleErrors } from "../errors/routeErrorHandler";
import { convertUUID } from "../utils/uuid";
import type { AuthLevel, OperationContract } from "./defineOperation";

/**
 * What a handler may return where the contract promises `T` on the wire.
 * `convertUUID` turns `Uint8Array`s into UUID strings and JSON serialization
 * turns `Date`s into ISO strings, so either is accepted wherever the contract
 * has a string.
 */
export type Accepting<T> = T extends string
  ? string extends T
    ? string | Uint8Array | Date
    : T
  : T extends readonly (infer U)[]
    ? Accepting<U>[]
    : T extends object
      ? { [K in keyof T]: Accepting<T[K]> }
      : T;

type RequestOf<C> =
  C extends OperationContract<string, infer R, z.ZodType | undefined>
    ? R
    : never;

type ResponseOf<C> =
  C extends OperationContract<string, z.ZodObject | undefined, infer R>
    ? R
    : never;

type HandlerParams<C extends OperationContract> = ([RequestOf<C>] extends [
  z.ZodObject,
]
  ? z.output<RequestOf<C>>
  : unknown) &
  (C["auth"] extends "required"
    ? { loggedInUserId: Uint8Array }
    : { loggedInUserId?: Uint8Array });

type HandlerResult<C extends OperationContract> = [ResponseOf<C>] extends [
  z.ZodType,
]
  ? Accepting<z.input<ResponseOf<C>>>
  : void;

export type OperationHandler<C extends OperationContract> = (
  params: HandlerParams<C>,
) => Promise<HandlerResult<C>>;

export type ImplementedOperation = {
  contract: OperationContract;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Attach the server-side handler to an operation contract. The handler's
 * return type is checked against the contract's response schema.
 */
export function implement<C extends OperationContract>(
  contract: C,
  handler: OperationHandler<C>,
): ImplementedOperation {
  return {
    contract,
    handler: handler as ImplementedOperation["handler"],
  };
}

/** How a response that doesn't match its contract is reported. */
type ResponseCheckMode = "throw" | "log";

function responseCheckMode(): ResponseCheckMode {
  return process.env.NODE_ENV === "production" ? "log" : "throw";
}

/** Thrown (outside production) when a handler's response breaks its contract. */
export class ContractResponseError extends Error {}

function checkResponse(contract: OperationContract, body: unknown) {
  if (!contract.response) {
    return;
  }
  const result = contract.response.safeParse(body);
  if (result.success) {
    return;
  }
  const message =
    `Response of operation ${contract.name} does not match its contract:\n` +
    z.prettifyError(result.error);
  if (responseCheckMode() === "throw") {
    throw new ContractResponseError(message);
  }
  console.error(`[Contract] ${message}`);
}

function expressHandler(
  { contract, handler }: ImplementedOperation,
  auth: AuthLevel,
) {
  return async (req: Request, res: Response) => {
    if (auth === "required" && !req.user) {
      res.status(StatusCodes.FORBIDDEN).json({ error: "Must be logged in" });
      return;
    }
    try {
      const params = contract.request
        ? contract.request.parse({ ...req.body, ...req.query, ...req.params })
        : {};
      const result = convertUUID(
        await handler({ ...params, loggedInUserId: req.user?.userId }),
      );
      if (!contract.response) {
        res.send();
        return;
      }
      // Serialize once; validate what actually goes over the wire.
      const body = JSON.stringify(result);
      checkResponse(contract, JSON.parse(body));
      res.type("application/json").send(body);
    } catch (e) {
      if (e instanceof ContractResponseError) {
        console.error(e.message);
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: "Internal Server Error", details: e.message });
        return;
      }
      handleErrors(res, e);
    }
  };
}

/**
 * Build a router (to be mounted at `/api`) serving the given operations.
 */
export function operationsRouter(
  operations: readonly ImplementedOperation[],
): Router {
  const router = express.Router();
  for (const operation of operations) {
    const { method, path, auth } = operation.contract;
    router[method](path, expressHandler(operation, auth));
  }
  return router;
}
