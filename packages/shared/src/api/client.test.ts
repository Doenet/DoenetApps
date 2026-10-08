import { describe, expect, test } from "vitest";
import { buildOperationRequest, isOperationName } from "./client.js";

describe("buildOperationRequest", () => {
  test("fills path parameters and sends the rest as query parameters", () => {
    expect(
      buildOperationRequest("getOwnAssignmentResponse", {
        contentId: "abc",
        shuffledOrder: "1,2",
        itemNumber: 2,
        attemptNumber: undefined,
      }),
    ).toEqual({
      method: "get",
      url: "/api/assign/getAssignmentResponseStudent/abc",
      query: { shuffledOrder: "1,2", itemNumber: 2 },
    });
  });

  test("fills several path parameters, URL-encoding each", () => {
    expect(
      buildOperationRequest("getStudentAssignmentScoresInFolder", {
        studentUserId: "a/b",
        parentId: "c d",
      }),
    ).toEqual({
      method: "get",
      url: "/api/assign/getStudentAssignmentScores/a%2Fb/c%20d",
      query: {},
    });
  });

  test("sends post params as the JSON body", () => {
    expect(
      buildOperationRequest("updateAssignmentClosedOn", {
        contentId: "abc",
        closedOn: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      method: "post",
      url: "/api/assign/updateAssignmentClosedOn",
      body: { contentId: "abc", closedOn: "2026-01-01T00:00:00.000Z" },
    });
  });

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
