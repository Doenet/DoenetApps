import { Prisma } from "@prisma/client";
import { prisma } from "../model";
import {
  ClassificationCategoryTree,
  ContentClassification,
  PartialContentClassification,
} from "../types";
import { sanitizeQuery } from "../utils/search";
import {
  returnClassificationFilterWhereClauses,
  returnClassificationJoins,
  returnClassificationMatchClauses,
  sortClassifications,
} from "../utils/classificationsCategories";
import { returnClassificationListSelect } from "../utils/contentStructure";
import {
  filterEditableActivity,
  filterViewableActivity,
  getIsEditor,
} from "../utils/permissions";
import { InvalidRequestError } from "../utils/error";
import { CategoryGroup } from "@doenet-tools/shared";

export async function getClassificationCategories() {
  const results = await prisma.classificationSystems.findMany({
    orderBy: {
      sortIndex: "asc",
    },
    select: {
      id: true,
      name: true,
      categoryLabel: true,
      subCategoryLabel: true,
      type: true,
      categories: {
        orderBy: {
          sortIndex: "asc",
        },
        select: {
          id: true,
          category: true,
          subCategories: {
            orderBy: {
              sortIndex: "asc",
            },
            select: {
              id: true,
              subCategory: true,
            },
          },
        },
      },
    },
  });

  const formattedResults: ClassificationCategoryTree[] = results.map(
    (system) => {
      return {
        id: system.id,
        name: system.name,
        type: system.type,
        categoryLabel: system.categoryLabel,
        subCategoryLabel: system.subCategoryLabel,
        categories: system.categories.map((category) => {
          return {
            id: category.id,
            category: category.category,
            subCategories: category.subCategories.map((subCategory) => {
              return {
                id: subCategory.id,
                subCategory: subCategory.subCategory,
              };
            }),
          };
        }),
      };
    },
  );
  return formattedResults;
}

export async function searchPossibleClassifications({
  query = "",
  systemId,
  categoryId,
  subCategoryId,
}: {
  query?: string;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
}) {
  const query_as_prefixes = sanitizeQuery(query);

  if (query_as_prefixes.length > 0) {
    const matchClassification = true;
    const matchSubCategory = subCategoryId === undefined;
    const matchCategory = matchSubCategory && categoryId === undefined;
    const matchSystem = matchCategory && systemId === undefined;

    const includeClassification = true;
    const includeSubCategory = matchSubCategory;
    const includeCategory = matchCategory;
    const includeSystem = matchSystem;

    const matches = await prisma.$queryRaw<
      {
        id: number;
        relevance: number;
      }[]
    >(Prisma.sql`
  SELECT
    classifications.id,
    AVG(
    ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification, matchSubCategory, matchCategory, matchSystem, operator: "+" })} 
    ) as relevance
  FROM
    classifications
    ${returnClassificationJoins({ includeClassification, includeSubCategory, includeCategory, includeSystem })}
  WHERE
    (
      ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification, matchSubCategory, matchCategory, matchSystem, operator: "OR" })} 
    )
    ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId })}
    
  GROUP BY
    classifications.id
  ORDER BY
    relevance DESC
  LIMIT 100
  `);

    // since full text search doesn't match code well, separately match for those
    // and put matches at the top of the list
    const query_words = query.split(" ");

    const code_matches = await prisma.classifications.findMany({
      where: {
        OR: query_words.map((query_word) => ({
          code: { contains: query_word },
        })),
        descriptions: {
          some: {
            subCategoryId,
            subCategory: {
              categoryId,
              category: { systemId },
            },
          },
        },
      },
      select: { id: true },
    });

    const results: ContentClassification[] =
      await prisma.classifications.findMany({
        where: {
          id: { in: [...matches, ...code_matches].map((m) => m.id) },
        },
        select: returnClassificationListSelect(),
      });

    // TODO: a more efficient way to get desired sort order?
    const sort_order: Record<string, number> = {};
    matches.forEach((match) => {
      sort_order[match.id] = match.relevance;
    });
    code_matches.forEach((match) => {
      sort_order[match.id] = 100 + (sort_order[match.id] || 0); // code matches go at the top
    });
    results.sort((a, b) => sort_order[b.id] - sort_order[a.id]);

    return results;
  }

  const results: ContentClassification[] =
    await prisma.classifications.findMany({
      where: {
        descriptions: {
          some: {
            subCategoryId,
            subCategory: {
              categoryId,
              category: { systemId },
            },
          },
        },
      },
      take: 100,
      select: returnClassificationListSelect(),
    });
  return results;
}

/**
 * Add a classification to an activity. The activity must be owned by the logged in user.
 * Activity id must be an activity, not a folder.
 */
export async function addClassification({
  contentId,
  classificationId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  classificationId: number;
  loggedInUserId: Uint8Array;
}) {
  const isEditor = await getIsEditor(loggedInUserId);
  const activity = await prisma.content.findUnique({
    where: {
      id: contentId,
      ...filterEditableActivity(loggedInUserId, isEditor),
    },
    select: {
      // not using this, we just need to select one field
      id: true,
    },
  });

  if (!activity) {
    throw new InvalidRequestError(
      "This activity does not exist or is not owned by this user.",
    );
  }
  await prisma.contentClassifications.create({
    data: { contentId, classificationId },
  });
}

/**
 * Remove a classification to an activity. The activity must be owned by the logged in user.
 * Activity id must be an activity, not a folder.
 * @param contentId
 * @param classificationId
 * @param loggedInUserId
 */
export async function removeClassification({
  contentId,
  classificationId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  classificationId: number;
  loggedInUserId: Uint8Array;
}) {
  const isEditor = await getIsEditor(loggedInUserId);
  const activity = await prisma.content.findUnique({
    where: {
      id: contentId,
      ...filterEditableActivity(loggedInUserId, isEditor),
    },
    select: {
      // not using this, we just need to select one field
      id: true,
    },
  });
  if (!activity) {
    throw new InvalidRequestError(
      "This activity does not exist or is not owned by this user.",
    );
  }
  await prisma.contentClassifications.delete({
    where: {
      contentId_classificationId: { contentId: contentId, classificationId },
    },
  });
}

// TODO: The getClassifications API is not being used (Jan 2, 2025). Remove?

/**
 * Get all classifications for an activity. The activity must be either public or owned by
 * loggedInUser.
 * @param contentId
 * @param loggedInUserId
 */
export async function getClassifications({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  const isEditor = await getIsEditor(loggedInUserId);
  const activity = await prisma.content.findUnique({
    where: {
      id: contentId,
      ...filterViewableActivity(loggedInUserId, isEditor),
    },
    select: {
      // not using this, we just need to select one field
      id: true,
    },
  });
  if (!activity) {
    throw new InvalidRequestError(
      "This activity does not exist or cannot be accessed.",
    );
  }

  const classifications = await prisma.contentClassifications.findMany({
    where: {
      contentId: contentId,
    },
    select: {
      classification: {
        select: returnClassificationListSelect(),
      },
    },
  });
  const formatted: ContentClassification[] = sortClassifications(
    classifications.map((c) => c.classification),
  );
  return formatted;
}

// TODO: create test
export async function getClassificationInfo({
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
}: {
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
}): Promise<PartialContentClassification | null> {
  if (classificationId !== undefined) {
    const classificationInfo = await prisma.classifications.findUniqueOrThrow({
      where: { id: classificationId },
      select: {
        id: true,
        code: true,
        descriptions: {
          where: { subCategoryId },
          select: {
            id: true,
            description: true,
            subCategory: {
              select: {
                id: true,
                subCategory: true,
                category: {
                  select: {
                    id: true,
                    category: true,
                    system: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const description = classificationInfo.descriptions[0];

    return {
      classification: {
        id: classificationInfo.id,
        code: classificationInfo.code,
        descriptionId: description.id,
        description: description.description,
      },
      subCategory: {
        id: description.subCategory.id,
        subCategory: description.subCategory.subCategory,
      },
      category: {
        id: description.subCategory.category.id,
        category: description.subCategory.category.category,
      },
      system: description.subCategory.category.system,
    };
  } else if (subCategoryId !== undefined) {
    const subCategoryInfo =
      await prisma.classificationSubCategories.findUniqueOrThrow({
        where: { id: subCategoryId },
        select: {
          id: true,
          subCategory: true,
          category: {
            select: {
              id: true,
              category: true,
              system: true,
            },
          },
        },
      });

    return {
      subCategory: {
        id: subCategoryInfo.id,
        subCategory: subCategoryInfo.subCategory,
      },
      category: {
        id: subCategoryInfo.category.id,
        category: subCategoryInfo.category.category,
      },
      system: subCategoryInfo.category.system,
    };
  } else if (categoryId !== undefined) {
    const categoryInfo =
      await prisma.classificationCategories.findUniqueOrThrow({
        where: { id: categoryId },
        select: {
          id: true,
          category: true,
          system: true,
        },
      });

    return {
      category: {
        id: categoryInfo.id,
        category: categoryInfo.category,
      },
      system: categoryInfo.system,
    };
  } else if (systemId !== undefined) {
    const systemInfo = await prisma.classificationSystems.findUniqueOrThrow({
      where: { id: systemId },
    });
    return { system: systemInfo };
  } else {
    return null;
  }
}

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
