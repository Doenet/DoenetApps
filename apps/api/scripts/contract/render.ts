/**
 * Renders every file generated from the API contract. Used by
 * `contract:generate` (writes them) and by the contract drift test (checks
 * the committed copies are current).
 */
import * as path from "path";
import openapiTS, { astToString, type OpenAPI3 } from "openapi-typescript";
import * as prettier from "prettier";
import { apiSpec } from "../../src/apiOperations";
import { forEachOperation, OpenApiDocument } from "../../src/contract";
import {
  CLIENT_OPERATIONS_PATH,
  CLIENT_SCHEMA_PATH,
  repoRoot,
  SPEC_PATH,
} from "./paths";

export { repoRoot };

const HEADER =
  "// Generated from the API contract by\n" +
  "// `npm run contract:generate --workspace @doenet-tools/api`. Do not edit.\n";

async function format(source: string, filePath: string) {
  const absolute = path.join(repoRoot, filePath);
  const options = (await prettier.resolveConfig(absolute)) ?? {};
  return prettier.format(source, { ...options, filepath: absolute });
}

function renderOperations(spec: OpenApiDocument) {
  const routes: Record<string, { method: string; path: string }> = {};
  forEachOperation(spec, (op, opPath, method) => {
    routes[op.operationId] = { method, path: opPath };
  });
  const sorted = Object.fromEntries(
    Object.entries(routes).sort(([a], [b]) => a.localeCompare(b)),
  );
  return (
    HEADER +
    `\nexport const operationRoutes = ${JSON.stringify(sorted, null, 2)} as const;\n`
  );
}

/** Map from repo-relative path to file contents. */
export async function renderContractFiles(
  spec: OpenApiDocument = apiSpec,
): Promise<Record<string, string>> {
  // openapi-typescript's types don't accept our narrower document type.
  const ast = await openapiTS(spec as unknown as OpenAPI3, {
    alphabetize: true,
  });
  const schemaTs = HEADER + "\n" + astToString(ast);

  return {
    [SPEC_PATH]: await format(JSON.stringify(spec), SPEC_PATH),
    [CLIENT_SCHEMA_PATH]: await format(schemaTs, CLIENT_SCHEMA_PATH),
    [CLIENT_OPERATIONS_PATH]: await format(
      renderOperations(spec),
      CLIENT_OPERATIONS_PATH,
    ),
  };
}
