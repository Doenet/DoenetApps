/**
 * Transport-independent helpers for calling the API by operation name.
 *
 * The types come from `generated/schema.ts`, which is generated from the API
 * contract.
 *
 * Each app wraps `buildOperationRequest` with its own transport (axios in
 * `apps/app`, `cy.request` in the e2e tests).
 */
import type { components, operations } from "./generated/schema.js";
import { operationRoutes } from "./generated/operations.js";

/** Named schemas of the API contract, e.g. `ApiSchemas["Content"]`. */
export type ApiSchemas = components["schemas"];

export type OperationName = keyof operations & keyof typeof operationRoutes;

type Present<T> = [T] extends [undefined] ? object : NonNullable<T>;

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type PathParams<K extends OperationName> = operations[K]["parameters"] extends {
  path?: infer P;
}
  ? Present<P>
  : object;

type QueryParams<K extends OperationName> =
  operations[K]["parameters"] extends { query?: infer Q } ? Present<Q> : object;

type BodyParams<K extends OperationName> = operations[K] extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : object;

/**
 * Everything an operation accepts, as one object: path parameters, query
 * parameters and body fields together, as the server reads them.
 */
export type OperationParams<K extends OperationName> = Simplify<
  PathParams<K> & QueryParams<K> & BodyParams<K>
>;

/** The JSON body of an operation's successful response (`void` if none). */
export type OperationResponse<K extends OperationName> =
  operations[K]["responses"][200] extends {
    content: { "application/json": infer R };
  }
    ? R
    : void;

/** Arguments after the operation name: `params` may be omitted if empty. */
export type OperationArgs<K extends OperationName> =
  object extends OperationParams<K>
    ? [params?: OperationParams<K>]
    : [params: OperationParams<K>];

/** The error body every failed operation returns. */
export type ApiErrorBody = ApiSchemas["ErrorResponse"];

export type OperationRequest = {
  method: "get" | "post";
  /** Absolute path, including `/api` and path parameters. */
  url: string;
  /** Query parameters (`get` only); `undefined` values are dropped. */
  query?: Record<string, unknown>;
  /** JSON body (`post` only). */
  body?: Record<string, unknown>;
};

/** Turn an operation name and its params into an HTTP request. */
export function buildOperationRequest<K extends OperationName>(
  name: K,
  ...[params]: OperationArgs<K>
): OperationRequest {
  const route = operationRoutes[name];
  const rest: Record<string, unknown> = { ...params };
  const url =
    "/api" +
    route.path.replace(/\{(\w+)\}/g, (_match, key: string) => {
      const value = rest[key];
      delete rest[key];
      return encodeURIComponent(String(value));
    });

  if (route.method === "get") {
    return {
      method: "get",
      url,
      query: Object.fromEntries(
        Object.entries(rest).filter(([, value]) => value !== undefined),
      ),
    };
  }
  return { method: "post", url, body: rest };
}

/** Whether `name` is an operation of the contract this build was made with. */
export function isOperationName(name: string): name is OperationName {
  return Object.prototype.hasOwnProperty.call(operationRoutes, name);
}
