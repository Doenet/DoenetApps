import { CategoryGroup } from "@doenet-tools/shared";
import { contentSelect } from "../utils/prismaSelect";
import { prisma } from "../model";

/**
 * Prisma selection for the minimal set of database fields (from
 * the `content` table) needed to manage categories
 */
export const selectCategoryFields = contentSelect({
  categories: {
    select: {
      code: true,
      description: true,
      term: true,
    },
  },
});

/**
 * Get full list of categories and category groups defined in the system.
 */
export async function getAllCategories(): Promise<{
  allCategories: CategoryGroup[];
}> {
  const allCategories: CategoryGroup[] = await prisma.categoryGroups.findMany({
    select: {
      name: true,
      isRequired: true,
      isExclusive: true,
      categories: {
        select: {
          code: true,
          term: true,
          description: true,
        },
        orderBy: { sortIndex: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });
  return { allCategories };
}
