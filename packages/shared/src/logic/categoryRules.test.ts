import { describe, expect, test } from "vitest";
import { getCategoryIssues, hasRequiredCategories } from "./categoryRules.js";
import type { Category, CategoryGroup } from "../types/categories.js";

function createCategory(code: string): Category {
  return {
    code,
    term: `term-${code}`,
    description: `description-${code}`,
  };
}

function createGroup({
  name,
  isRequired,
  codes,
}: {
  name: string;
  isRequired: boolean;
  codes: string[];
}): CategoryGroup {
  return {
    name,
    isRequired,
    isExclusive: false,
    categories: codes.map(createCategory),
  };
}

describe("category rules", () => {
  test("passes when each required group has a selected category", () => {
    const allCategories = [
      createGroup({
        name: "Scope",
        isRequired: true,
        codes: ["isWidget", "isProblemSet"],
      }),
      createGroup({
        name: "Mode",
        isRequired: true,
        codes: ["isPractice", "isAssessment"],
      }),
      createGroup({
        name: "Audience",
        isRequired: false,
        codes: ["middleSchool"],
      }),
    ];

    const categories = [
      createCategory("isProblemSet"),
      createCategory("isAssessment"),
    ];

    expect(getCategoryIssues({ allCategories, categories })).toEqual([]);
    expect(hasRequiredCategories({ allCategories, categories })).toBe(true);
  });

  test("reports an issue when any required category group is missing", () => {
    const allCategories = [
      createGroup({
        name: "Scope",
        isRequired: true,
        codes: ["isWidget", "isProblemSet"],
      }),
      createGroup({
        name: "Mode",
        isRequired: true,
        codes: ["isPractice", "isAssessment"],
      }),
    ];

    const categories = [createCategory("isProblemSet")];

    expect(getCategoryIssues({ allCategories, categories })).toEqual([
      "missingRequiredCategories",
    ]);
    expect(hasRequiredCategories({ allCategories, categories })).toBe(false);
  });

  test("matches selected categories by code and ignores optional groups", () => {
    const allCategories = [
      createGroup({
        name: "Scope",
        isRequired: true,
        codes: ["isWidget"],
      }),
      createGroup({
        name: "Audience",
        isRequired: false,
        codes: ["middleSchool"],
      }),
    ];

    const categories: Category[] = [
      {
        code: "isWidget",
        term: "Different term",
        description: "Different description",
      },
    ];

    expect(getCategoryIssues({ allCategories, categories })).toEqual([]);
    expect(hasRequiredCategories({ allCategories, categories })).toBe(true);
  });
});
