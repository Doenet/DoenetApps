import { describe, expect, test } from "vitest";
import { isAssignment, type AssignmentFields } from "./assignments";

function buildAssignmentFields(
  overrides: Partial<AssignmentFields> = {},
): AssignmentFields {
  return {
    isAssignmentRoot: false,
    parent: null,
    ...overrides,
  };
}

describe("isAssignment", () => {
  test("returns true for assignment roots", () => {
    expect(
      isAssignment(buildAssignmentFields({ isAssignmentRoot: true })),
    ).toBe(true);
  });

  test("returns true for direct children of assignment roots", () => {
    expect(
      isAssignment(
        buildAssignmentFields({
          parent: { isAssignmentRoot: true },
        }),
      ),
    ).toBe(true);
  });

  test("returns false when neither the content nor its parent is an assignment root", () => {
    expect(
      isAssignment(
        buildAssignmentFields({
          parent: { isAssignmentRoot: false },
        }),
      ),
    ).toBe(false);
  });
});
