import { buildOpenApiSpec, ImplementedOperation } from "./contract";
import { assignOperations } from "./routes/assignRoutes";
import { bookOperations } from "./routes/bookRoutes";

/**
 * Every operation in the API contract. Add new endpoints here (via
 * `defineOperation` + `implement`), not as plain Express routes: the
 * coverage test fails on any `/api` route that isn't in the contract
 * or in `contract-uncovered.json`.
 */
export const apiOperations: readonly ImplementedOperation[] = [
  ...assignOperations,
  ...bookOperations,
];

export const apiSpec = buildOpenApiSpec(apiOperations.map((op) => op.contract));
