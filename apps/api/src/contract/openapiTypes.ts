/**
 * Minimal types for the parts of an OpenAPI 3.1 document we generate and
 * transform. Schemas are plain JSON Schema (2020-12) objects.
 */

export type JsonSchema = Record<string, unknown>;

export type OpenApiParameter = {
  name: string;
  in: "path" | "query";
  required: boolean;
  deprecated?: boolean;
  schema: JsonSchema;
};

export type OpenApiResponse = {
  description: string;
  content?: Record<string, { schema: JsonSchema }>;
};

export type OpenApiOperation = {
  operationId: string;
  summary?: string;
  tags?: string[];
  deprecated?: boolean;
  security?: Record<string, string[]>[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    required: boolean;
    content: Record<string, { schema: JsonSchema }>;
  };
  responses: Record<string, OpenApiResponse>;
  [extension: `x-${string}`]: unknown;
};

export type OpenApiDocument = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    [extension: `x-${string}`]: unknown;
  };
  servers?: { url: string }[];
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: {
    schemas: Record<string, JsonSchema>;
    securitySchemes?: Record<string, unknown>;
  };
};

export function forEachOperation(
  spec: OpenApiDocument,
  fn: (op: OpenApiOperation, path: string, method: string) => void,
) {
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(item)) {
      fn(op, path, method);
    }
  }
}

type WalkContext = {
  /** The node is the value of an object's `properties` entry. */
  isProperty: boolean;
  /** Nesting depth below the schema the walk started at. */
  depth: number;
};

const subschemaLists = ["anyOf", "oneOf", "allOf", "prefixItems"] as const;
const subschemaSingles = ["items", "not", "additionalProperties"] as const;

/**
 * Visit `schema` and every subschema in it, parents before children. The
 * visitor may mutate a node, including replacing its `properties` entries;
 * children are read after the visitor returns.
 */
export function walkSchema(
  schema: JsonSchema,
  visit: (node: JsonSchema, ctx: WalkContext) => void,
  ctx: WalkContext = { isProperty: false, depth: 0 },
) {
  visit(schema, ctx);
  const child = { isProperty: false, depth: ctx.depth + 1 };

  const properties = schema.properties as
    | Record<string, JsonSchema>
    | undefined;
  if (properties) {
    for (const prop of Object.values(properties)) {
      walkSchema(prop, visit, { isProperty: true, depth: ctx.depth + 1 });
    }
  }
  for (const key of subschemaLists) {
    const list = schema[key];
    if (Array.isArray(list)) {
      for (const item of list as JsonSchema[]) {
        walkSchema(item, visit, child);
      }
    }
  }
  for (const key of subschemaSingles) {
    const sub = schema[key];
    if (sub && typeof sub === "object") {
      walkSchema(sub as JsonSchema, visit, child);
    }
  }
  const defs = schema.$defs as Record<string, JsonSchema> | undefined;
  if (defs) {
    for (const def of Object.values(defs)) {
      walkSchema(def, visit, child);
    }
  }
}
