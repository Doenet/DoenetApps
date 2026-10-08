import * as path from "path";

export const repoRoot = path.resolve(__dirname, "../../../..");

/** Committed OpenAPI document. */
export const SPEC_PATH = "apps/api/openapi.json";
/** Client types generated from the contract. */
export const CLIENT_SCHEMA_PATH = "packages/shared/src/api/generated/schema.ts";
/** Runtime map from operation name to method and path. */
export const CLIENT_OPERATIONS_PATH =
  "packages/shared/src/api/generated/operations.ts";
