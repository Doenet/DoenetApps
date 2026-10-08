import { describe, expect, test } from "vitest";
import { buildOperationRequest, isOperationName } from "./client.js";

describe("buildOperationRequest", () => {
  test("params may be omitted when the operation takes none", () => {
    expect(buildOperationRequest("getAssigned")).toEqual({
      method: "get",
      url: "/api/assign/getAssigned",
      query: {},
    });
  });
});

test("isOperationName", () => {
  expect(isOperationName("getAssigned")).toBe(true);
  expect(isOperationName("toString")).toBe(false);
  expect(isOperationName("nope")).toBe(false);
});
