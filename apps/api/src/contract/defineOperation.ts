import { z } from "zod";

export type HttpMethod = "get" | "post";

/**
 * - `"required"`: responds 403 unless a user is signed in.
 * - `"optional"`: runs with or without a signed-in user.
 */
export type AuthLevel = "required" | "optional";

/**
 * The contract for one operation: everything a client needs to call it.
 * Server-only concerns (the handler) are attached separately with
 * `implement`, so contracts can be imported without pulling in the database.
 */
export type OperationContract<
  Name extends string = string,
  Request extends z.ZodObject | undefined = z.ZodObject | undefined,
  Response extends z.ZodType | undefined = z.ZodType | undefined,
  Auth extends AuthLevel = AuthLevel,
> = {
  /** Stable, unique operation name; the client calls the operation by it. */
  name: Name;
  method: HttpMethod;
  /**
   * Express-style path relative to `/api`, e.g. `/assign/getAssignmentData/:assignmentId`.
   * Each `:param` must be a required property of `request`.
   */
  path: string;
  auth: Auth;
  summary?: string;
  /**
   * Every input, as one object. Path parameters come from `path`; the rest
   * are query parameters for `get` and the JSON body for `post`.
   */
  request?: Request;
  /** The JSON response body. Omit when the operation returns no content. */
  response?: Response;
  /**
   * Called by something outside our own deployments (OAuth, Discourse), so
   * no amount of migrating our own callers makes removing it safe.
   */
  external?: boolean;
};

export function defineOperation<
  const Name extends string,
  Auth extends AuthLevel,
  Request extends z.ZodObject | undefined = undefined,
  Response extends z.ZodType | undefined = undefined,
>(
  contract: OperationContract<Name, Request, Response, Auth>,
): OperationContract<Name, Request, Response, Auth> {
  return contract;
}
