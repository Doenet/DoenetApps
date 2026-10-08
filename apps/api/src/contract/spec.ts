import { z } from "zod";
import type { OperationContract } from "./defineOperation";
import {
  JsonSchema,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiParameter,
  walkSchema,
} from "./openapiTypes";

/** Error body returned by `handleErrors` for every failure status. */
export const errorResponseSchema = z
  .object({
    error: z.string(),
    details: z.string().optional(),
  })
  .meta({ id: "ErrorResponse" });

const errorStatuses: Record<string, string> = {
  "400": "Invalid request",
  "403": "Not signed in, or not permitted",
  "404": "Not found",
  "500": "Internal server error",
};

const DEFS_REF = "#/$defs/";
const COMPONENTS_REF = "#/components/schemas/";

/**
 * Convert a Zod schema to JSON Schema. Schemas with a `.meta({ id })` are
 * hoisted into `components` and referenced by `$ref`.
 */
function toJsonSchema(
  schema: z.ZodType,
  io: "input" | "output",
  components: Record<string, JsonSchema>,
  where: string,
): JsonSchema {
  const json = z.toJSONSchema(schema, {
    io,
    target: "draft-2020-12",
    unrepresentable: "throw",
    cycles: "ref",
    reused: "inline",
  }) as JsonSchema;
  delete json.$schema;

  const defs = (json.$defs ?? {}) as Record<string, JsonSchema>;
  delete json.$defs;

  const tidy = (node: JsonSchema) =>
    walkSchema(node, (n) => {
      if (typeof n.$ref === "string" && n.$ref.startsWith(DEFS_REF)) {
        n.$ref = COMPONENTS_REF + n.$ref.slice(DEFS_REF.length);
      }
      // `id` is Zod metadata, already used as the component name.
      delete n.id;
      // Responses are validated without stripping, so a response may carry
      // fields the contract doesn't promise.
      if (io === "output" && n.additionalProperties === false) {
        delete n.additionalProperties;
      }
    });
  tidy(json);

  for (const [id, def] of Object.entries(defs)) {
    if (id.startsWith("__schema")) {
      throw new Error(
        `${where}: recursive schemas must be given a component name with .meta({ id })`,
      );
    }
    if (io === "input") {
      throw new Error(
        `${where}: named components (.meta({ id: "${id}" })) are only supported in responses`,
      );
    }
    tidy(def);
    const existing = components[id];
    if (existing && JSON.stringify(existing) !== JSON.stringify(def)) {
      throw new Error(
        `${where}: two different schemas share the component name "${id}"`,
      );
    }
    components[id] = def;
  }

  return json;
}

function buildOperation(
  contract: OperationContract,
  components: Record<string, JsonSchema>,
): OpenApiOperation {
  const where = `operation ${contract.name}`;

  const request = contract.request
    ? toJsonSchema(contract.request, "input", components, where)
    : { type: "object", properties: {} };

  const properties = (request.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((request.required ?? []) as string[]);
  const pathParamNames = [...contract.path.matchAll(/:(\w+)/g)].map(
    (m) => m[1],
  );

  const parameters: OpenApiParameter[] = [];
  for (const name of pathParamNames) {
    if (!properties[name] || !required.has(name)) {
      throw new Error(
        `${where}: path parameter "${name}" must be a required property of the request schema`,
      );
    }
    parameters.push({
      name,
      in: "path",
      required: true,
      schema: properties[name],
    });
  }

  const rest = Object.entries(properties).filter(
    ([name]) => !pathParamNames.includes(name),
  );

  const op: OpenApiOperation = {
    operationId: contract.name,
    ...(contract.summary ? { summary: contract.summary } : {}),
    tags: [contract.path.split("/")[1]],
    security:
      contract.auth === "required" ? [{ session: [] }] : [{}, { session: [] }],
    responses: {},
  };

  if (contract.method === "get") {
    for (const [name, schema] of rest) {
      const param: OpenApiParameter = {
        name,
        in: "query",
        required: required.has(name),
        schema,
      };
      parameters.push(param);
    }
  } else {
    const bodyRequired = rest
      .map(([name]) => name)
      .filter((name) => required.has(name));
    const body: JsonSchema = {
      type: "object",
      properties: Object.fromEntries(rest),
      ...(bodyRequired.length > 0 ? { required: bodyRequired } : {}),
    };
    op.requestBody = {
      required: true,
      content: { "application/json": { schema: body } },
    };
  }
  if (parameters.length > 0) {
    op.parameters = parameters;
  }

  if (contract.response) {
    const response = toJsonSchema(
      contract.response,
      "output",
      components,
      where,
    );
    op.responses["200"] = {
      description: "OK",
      content: { "application/json": { schema: response } },
    };
  } else {
    op.responses["200"] = { description: "OK (no content)" };
  }
  for (const [status, description] of Object.entries(errorStatuses)) {
    op.responses[status] = {
      description,
      content: {
        "application/json": {
          schema: { $ref: `${COMPONENTS_REF}ErrorResponse` },
        },
      },
    };
  }

  if (contract.external) {
    op["x-doenet-external"] = true;
  }
  return op;
}

/**
 * Build the OpenAPI document for the given operation contracts. The output is
 * deterministic (sorted), so the committed `openapi.json` diffs cleanly.
 */
export function buildOpenApiSpec(
  contracts: readonly OperationContract[],
): OpenApiDocument {
  const names = new Set<string>();
  const components: Record<string, JsonSchema> = {};
  const paths: OpenApiDocument["paths"] = {};

  const sorted = [...contracts].sort(
    (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );
  for (const contract of sorted) {
    if (names.has(contract.name)) {
      throw new Error(`Duplicate operation name "${contract.name}"`);
    }
    names.add(contract.name);

    const oaPath = contract.path.replace(/:(\w+)/g, "{$1}");
    paths[oaPath] ??= {};
    if (paths[oaPath][contract.method]) {
      throw new Error(
        `Two operations share ${contract.method.toUpperCase()} ${contract.path}`,
      );
    }
    paths[oaPath][contract.method] = buildOperation(contract, components);
  }

  components.ErrorResponse = toJsonSchema(
    errorResponseSchema,
    "output",
    components,
    "ErrorResponse",
  );

  return {
    openapi: "3.1.0",
    info: {
      title: "Doenet API",
      version: "1",
      description:
        "Generated from the Zod contracts in apps/api. Do not edit by hand; " +
        "run `npm run contract:generate --workspace @doenet-tools/api`.",
    },
    servers: [{ url: "/api" }],
    paths,
    components: {
      schemas: Object.fromEntries(
        Object.entries(components).sort(([a], [b]) => a.localeCompare(b)),
      ),
      securitySchemes: {
        session: { type: "apiKey", in: "cookie", name: "connect.sid" },
      },
    },
  };
}
