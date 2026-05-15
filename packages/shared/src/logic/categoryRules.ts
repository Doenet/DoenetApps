import type { Category, CategoryGroup } from "../types/categories.js";

// __________________________________________________________________________
//
//
//                     Exported types and functions
//
// __________________________________________________________________________
//

/**
 * Issues related to category selection
 */
export type CategoryIssue = "missingRequiredCategories";

export function hasRequiredCategories({
  allCategories,
  categories,
}: CategoryRulesData) {
  const existingCodes = new Set(categories.map((c) => c.code));

  for (const group of allCategories.filter((g) => g.isRequired)) {
    const hasMatch = group.categories.some((category) =>
      existingCodes.has(category.code),
    );
    if (!hasMatch) {
      return false;
    }
  }

  return true;
}

export function getCategoryIssues({
  allCategories,
  categories,
}: CategoryRulesData): CategoryIssue[] {
  const issues: CategoryIssue[] = [];

  if (!hasRequiredCategories({ allCategories, categories })) {
    issues.push("missingRequiredCategories");
  }

  return issues;
}

// __________________________________________________________________________
//
//
//                 Internal types and helper functions
//
//___________________________________________________________________________
//

type CategoryRulesData = {
  allCategories: CategoryGroup[];
  categories: Category[];
};
