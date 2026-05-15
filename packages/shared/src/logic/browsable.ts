import type { Category, CategoryGroup } from "../types/categories.js";

type BrowsableData = {
  allCategories: CategoryGroup[];
  categories: Category[];
};

/**
 * Determine whether this activity should be discoverable.
 * Currently this checks category completeness; additional browsable criteria may be added here later.
 * TODO: check for no errors
 * TODO: check for no accessibility violations
 */
export function isBrowsable(data: BrowsableData) {
  return isActivityFullyCategorized(data);
}

/**
 * Detect whether or not this activity has the required categories filled out.
 * For each group that is required, make sure this activity has at least 1 category in that group.
 */
function isActivityFullyCategorized({
  allCategories,
  categories,
}: BrowsableData) {
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
