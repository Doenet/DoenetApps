import { buildOpenApiSpec, ImplementedOperation } from "./contract";
import { assignOperations } from "./routes/assignRoutes";

/**
 * Every operation in the API contract. Add new endpoints here (via
 * `defineOperation` + `implement`), not as plain Express routes: the
 * coverage test fails on any `/api` route that isn't in the contract
 * or in `contract-uncovered.json`.
 */
export const apiOperations: readonly ImplementedOperation[] = [
  ...assignOperations,
];

export const apiSpec = buildOpenApiSpec(apiOperations.map((op) => op.contract));
