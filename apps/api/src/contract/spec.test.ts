import { describe, expect, test } from "vitest";
import { z } from "zod";
import { defineOperation, OperationContract } from "./defineOperation";
import { buildOpenApiSpec } from "./spec";

const op = (overrides: Partial<OperationContract>): OperationContract =>
  defineOperation({
    name: "op",
    method: "post",
    path: "/things/op",
    auth: "required",
    ...overrides,
  });

function bodySchema(contracts: OperationContract[], path = "/things/op") {
  return buildOpenApiSpec(contracts).paths[path].post.requestBody!.content[
    "application/json"
  ].schema;
}

describe("buildOpenApiSpec", () => {
  test("splits a get request into path and query parameters", () => {
    const spec = buildOpenApiSpec([
      op({
        method: "get",
        path: "/things/:thingId",
        request: z.object({
          thingId: z.string(),
          page: z.coerce.number().optional(),
        }),
      }),
    ]);
    expect(spec.paths["/things/{thingId}"].get.parameters).toEqual([
      {
        name: "thingId",
        in: "path",
        required: true,
        schema: { type: "string" },
      },
      {
        name: "page",
        in: "query",
        required: false,
        schema: { type: "number" },
      },
    ]);
  });

  test("puts a post request in the JSON body", () => {
    expect(
      bodySchema([
        op({ request: z.object({ a: z.string(), b: z.number().optional() }) }),
      ]),
    ).toEqual({
      type: "object",
      properties: { a: { type: "string" }, b: { type: "number" } },
      required: ["a"],
    });
  });

  test("hoists named schemas into components", () => {
    const named = z.object({ x: z.string() }).meta({ id: "Named" });
    const spec = buildOpenApiSpec([
      op({ response: z.object({ one: named, many: z.array(named) }) }),
    ]);
    expect(spec.components.schemas.Named).toEqual({
      type: "object",
      properties: { x: { type: "string" } },
      required: ["x"],
    });
    expect(
      spec.paths["/things/op"].post.responses["200"].content![
        "application/json"
      ].schema,
    ).toMatchObject({
      properties: {
        one: { $ref: "#/components/schemas/Named" },
        many: { items: { $ref: "#/components/schemas/Named" } },
      },
    });
  });

  test("rejects contracts that can't be represented faithfully", () => {
    expect(() =>
      buildOpenApiSpec([op({ path: "/things/:id", request: z.object({}) })]),
    ).toThrow(/path parameter "id"/);
    expect(() =>
      buildOpenApiSpec([op({}), op({ path: "/things/other" })]),
    ).toThrow(/Duplicate operation name/);
  });
});
