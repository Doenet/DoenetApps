import { Prisma } from "@prisma/client";
import { prisma } from "../model";
import { sanitizeQuery } from "../utils/search";
import {
  returnClassificationFilterWhereClauses,
  returnClassificationJoins,
  returnClassificationMatchClauses,
  returnCategoryJoins,
  returnCategoryWhereClauses,
} from "../utils/classificationsCategories";
import { processContent, returnContentSelect } from "../utils/contentStructure";
import { fromUUID } from "../utils/uuid";
import { getLibraryAccountId, maskLibraryUserInfo } from "./curate";
import { PartialContentClassification, UserInfo } from "../types";
import { getAllCategories, getClassificationInfo } from "./classification";
import { getAuthorInfo } from "./user";

export async function searchSharedContent({
  query,
  isCurated,
  loggedInUserId,
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
  isUnclassified,
  categories,
  ownerId,
  page = 1,
}: {
  query: string;
  isCurated: boolean;
  loggedInUserId: Uint8Array;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
  isUnclassified?: boolean;
  categories?: Set<string>;
  ownerId?: Uint8Array;
  page?: number;
}) {
  const pageSize = 100;

  const query_as_prefixes = sanitizeQuery(query);

  const matchClassification = !isUnclassified && classificationId === undefined;
  const matchSubCategory = matchClassification && subCategoryId === undefined;
  const matchCategory = matchSubCategory && categoryId === undefined;

  const includeClassification = true;
  const includeSubCategory = matchSubCategory;
  const includeCategory = matchCategory;

  const matches = await prisma.$queryRaw<
    {
      id: Uint8Array;
      relevance: number;
    }[]
  >(Prisma.sql`
  SELECT
    content.id,
    AVG((MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)*5)
    +(MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)*5)
    ${ownerId === undefined ? Prisma.sql`+ MATCH(users.firstNames, users.lastNames) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)` : Prisma.empty}
    ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification, matchSubCategory, matchCategory, prependOperator: true, operator: "+" })}
    ) as relevance
  FROM
    content
  LEFT JOIN
    users ON content.ownerId = users.userId
  ${returnClassificationJoins({ includeClassification, includeSubCategory, includeCategory, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND users.isLibrary = ${isCurated ? Prisma.sql`TRUE` : Prisma.sql`FALSE`}
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    AND
    (
      MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      OR MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      ${ownerId === undefined ? Prisma.sql`OR MATCH(users.firstNames, users.lastNames) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)` : Prisma.empty}
      ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification, matchSubCategory, matchCategory, prependOperator: true, operator: "OR" })}
    )
    ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId, classificationId, isUnclassified })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    content.id
  ORDER BY
    relevance DESC
  LIMIT ${pageSize}
  OFFSET ${(page - 1) * pageSize}
  `);

  // TODO: combine queries

  const preliminarySharedContent = await prisma.content.findMany({
    where: {
      id: { in: matches.map((m) => m.id) },
    },
    select: returnContentSelect({
      includeOwnerDetails: true,
      includeClassifications: true,
    }),
  });

  // TODO: better way to sort! (For free if combine queries)
  const relevance = Object.fromEntries(
    matches.map((m) => [fromUUID(m.id), m.relevance]),
  );

  const sharedContent = preliminarySharedContent
    .sort((a, b) => relevance[fromUUID(b.id)] - relevance[fromUUID(a.id)])
    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    .map((content) => processContent(content, loggedInUserId));

  return sharedContent;
}

// TODO: add tests of this api if we're sure we want to keep it
export async function browseSharedContent({
  isCurated,
  loggedInUserId,
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
  isUnclassified,
  categories,
  ownerId,
  page = 1,
}: {
  isCurated: boolean;
  loggedInUserId: Uint8Array;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
  isUnclassified?: boolean;
  categories?: Set<string>;
  ownerId?: Uint8Array;
  page?: number;
}) {
  const pageSize = 100;

  const classificationsFilter = isUnclassified
    ? {
        none: {},
      }
    : classificationId !== undefined
      ? { some: { classification: { id: classificationId } } }
      : subCategoryId !== undefined ||
          categoryId !== undefined ||
          systemId !== undefined
        ? {
            some: {
              classification: {
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
            },
          }
        : undefined;

  const categoriesToRequire =
    categories === undefined ? [] : [...categories.keys()];

  const preliminarySharedContent = await prisma.content.findMany({
    where: {
      isDeletedOn: null,
      owner: { isLibrary: isCurated },
      OR: [
        { isPublic: true },
        { sharedWith: { some: { userId: loggedInUserId } } },
      ],
      AND: categoriesToRequire.map((category) => ({
        categories: { some: { code: category } },
      })),
      ownerId,
      classifications: classificationsFilter,
    },
    select: returnContentSelect({
      includeOwnerDetails: true,
      includeClassifications: true,
    }),
    orderBy: { createdAt: "desc" },
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  const sharedContent = preliminarySharedContent.map((content) =>
    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    processContent(content, loggedInUserId),
  );

  return sharedContent;
}

// TODO: add tests of this api if we're sure we want to keep it
export async function browseTrendingContent({
  loggedInUserId,
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
  isUnclassified,
  categories,
  ownerId,
  page = 1,
  pageSize = 100,
}: {
  loggedInUserId: Uint8Array;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
  isUnclassified?: boolean;
  categories?: Set<string>;
  ownerId?: Uint8Array;
  page?: number;
  pageSize?: number;
}) {
  const matchClassification = !isUnclassified && classificationId === undefined;
  const matchSubCategory = matchClassification && subCategoryId === undefined;
  const matchCategory = matchSubCategory && categoryId === undefined;

  const includeClassification = true;
  const includeSubCategory = matchSubCategory;
  const includeCategory = matchCategory;

  const libraryId = await getLibraryAccountId();

  const matches = await prisma.$queryRaw<
    {
      id: Uint8Array;
      numViews: bigint;
    }[]
  >(Prisma.sql`
  SELECT
    content.id,
    COUNT(distinct contentViews.userId) AS numViews,
    content.createdAt
  FROM
    content
  LEFT JOIN
    users ON content.ownerId = users.userId
  ${returnClassificationJoins({ includeClassification, includeSubCategory, includeCategory, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  LEFT JOIN
    contentViews ON contentViews.contentId = content.id
  WHERE
    content.isDeletedOn IS NULL
    AND content.ownerId <> ${libraryId}
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId, classificationId, isUnclassified })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    content.id
  ORDER BY
    numViews DESC, content.createdAt DESC
  LIMIT ${pageSize}
  OFFSET ${(page - 1) * pageSize}
  `);

  // TODO: combine queries

  const preliminarySharedContent = await prisma.content.findMany({
    where: {
      id: { in: matches.map((m) => m.id) },
    },
    select: returnContentSelect({ includeOwnerDetails: true }),
    orderBy: { createdAt: "desc" },
  });

  // TODO: better way to sort! (For free if combine queries)
  const numViews = Object.fromEntries(
    matches.map((m) => [fromUUID(m.id), Number(m.numViews)]),
  );

  // relying on the fact that .sort() is stable so that numView ties
  // will still be sorted in descending createdAt order
  const sharedContent = preliminarySharedContent
    .sort((a, b) => numViews[fromUUID(b.id)] - numViews[fromUUID(a.id)])
    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    .map((content) => processContent(content, loggedInUserId));

  return sharedContent;
}

export async function searchUsersWithSharedContent({
  query,
  loggedInUserId,
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
  isUnclassified,
  categories,
  page = 1,
}: {
  query: string;
  loggedInUserId: Uint8Array;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
  isUnclassified?: boolean;
  categories?: Set<string>;
  page?: number;
}) {
  const pageSize = 100;

  const libraryId = await getLibraryAccountId();

  const query_as_prefixes = sanitizeQuery(query);

  const includeClassification =
    classificationId !== undefined ||
    isUnclassified ||
    subCategoryId !== undefined;
  const includeSubCategory = !includeClassification && categoryId !== undefined;
  const includeCategory = !includeSubCategory && systemId !== undefined;

  const usersWithShared = await prisma.$queryRaw<
    {
      userId: Uint8Array;
      firstNames: string | null;
      lastNames: string;
      relevance: number;
    }[]
  >(Prisma.sql`
  SELECT
    users.userId, users.firstNames, users.lastNames,
    MATCH(users.firstNames, users.lastNames) AGAINST(${query_as_prefixes} IN BOOLEAN MODE) as relevance
  FROM
    users
  WHERE
    users.isAnonymous = FALSE
    AND users.userId <> ${libraryId}
    AND users.userId IN (
      SELECT ownerId 
        FROM content 
        ${returnClassificationJoins({ includeClassification, includeSubCategory, includeCategory, joinFromContent: true })}
        ${returnCategoryJoins(categories)}
        WHERE
          isDeletedOn IS NULL AND (
            isPublic = TRUE
            OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
          )
          ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId, classificationId, isUnclassified })}
          ${returnCategoryWhereClauses(categories)}
      
    )
    AND
    MATCH(users.firstNames, users.lastNames) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
  ORDER BY
    relevance DESC
  LIMIT ${pageSize}
  OFFSET ${(page - 1) * pageSize}
  `);

  const usersWithShared2: UserInfo[] = usersWithShared.map((u) => ({
    userId: u.userId,
    firstNames: u.firstNames,
    lastNames: u.lastNames,
  }));
  return usersWithShared2;
}

export async function browseUsersWithSharedContent({
  query,
  loggedInUserId,
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
  isUnclassified,
  categories,
  take = 100,
  skip = 0,
}: {
  query?: string;
  loggedInUserId: Uint8Array;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
  isUnclassified?: boolean;
  categories?: Set<string>;
  take?: number;
  skip?: number;
}) {
  let usersWithShared;

  if (query) {
    const query_as_prefixes = sanitizeQuery(query);

    const matchClassification =
      !isUnclassified && classificationId === undefined;
    const matchSubCategory = matchClassification && subCategoryId === undefined;
    const matchCategory = matchSubCategory && categoryId === undefined;

    const includeClassification = true;
    const includeSubCategory = matchSubCategory;
    const includeCategory = matchCategory;

    usersWithShared = await prisma.$queryRaw<
      {
        userId: Uint8Array;
        firstNames: string | null;
        lastNames: string;
        numContent: bigint;
      }[]
    >(Prisma.sql`
      SELECT
        users.userId, users.firstNames, users.lastNames, COUNT(content.id) AS numContent
      FROM
        users
      INNER JOIN
        content on content.ownerId = users.userId
      WHERE
        users.isAnonymous = FALSE
        AND users.isLibrary = FALSE
        AND content.id IN (
          SELECT content.id
          FROM content
          ${returnClassificationJoins({ includeClassification, includeSubCategory, includeCategory, joinFromContent: true })}
          ${returnCategoryJoins(categories)}
          WHERE
            content.isDeletedOn IS NULL
            AND (
              content.isPublic = TRUE
              OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
            )
            AND (
              MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
              OR MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
              ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification, matchSubCategory, matchCategory, prependOperator: true, operator: "OR" })}
            )
            ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId, classificationId, isUnclassified })}
            ${returnCategoryWhereClauses(categories)}
        )
      GROUP BY
        users.userId
      ORDER BY
        numContent DESC
      LIMIT ${take}
      OFFSET ${skip}
  `);
  } else {
    const includeClassification =
      classificationId !== undefined ||
      isUnclassified ||
      subCategoryId !== undefined;
    const includeSubCategory =
      !includeClassification && categoryId !== undefined;
    const includeCategory = !includeSubCategory && systemId !== undefined;

    usersWithShared = await prisma.$queryRaw<
      {
        userId: Uint8Array;
        firstNames: string | null;
        lastNames: string;
        numContent: bigint;
      }[]
    >(Prisma.sql`
      SELECT
        users.userId, users.firstNames, users.lastNames, COUNT(content.id) AS numContent
      FROM
        users
      INNER JOIN
        content on content.ownerId = users.userId
      WHERE
        users.isAnonymous = FALSE
        AND users.isLibrary = FALSE
        AND content.id IN (
          SELECT content.id
          FROM content
          ${returnClassificationJoins({ includeClassification, includeSubCategory, includeCategory, joinFromContent: true })}
          ${returnCategoryJoins(categories)}
          WHERE
            content.isDeletedOn IS NULL
            AND (
              content.isPublic = TRUE
              OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
            )
            ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId, classificationId, isUnclassified })}
            ${returnCategoryWhereClauses(categories)}
        )
      GROUP BY
        users.userId
      ORDER BY
        numContent DESC
      LIMIT ${take}
      OFFSET ${skip}
  `);
  }

  const usersWithShared2: UserInfo[] = usersWithShared.map((u) => {
    const { numContent, ...u2 } = u;
    return {
      ...u2,
      numCommunity: Number(numContent),
    };
  });
  return usersWithShared2;
}

export async function searchClassificationsWithSharedContent({
  query,
  loggedInUserId,
  systemId,
  categoryId,
  subCategoryId,
  categories,
  ownerId,
}: {
  query: string;
  loggedInUserId: Uint8Array;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}): Promise<PartialContentClassification[]> {
  const query_as_prefixes = sanitizeQuery(query);
  const queryRegEx = query
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "|");

  const matches = await prisma.$queryRaw<
    {
      classificationId: number;
      code: string;
      descriptionId: number;
      description: string;
      subCategoryId: number;
      subCategory: string;
      categoryId: number;
      category: string;
      systemId: number;
      systemName: string;
      systemShortName: string;
      categoryLabel: string;
      subCategoryLabel: string;
      descriptionLabel: string;
      categoriesInDescription: boolean;
      codeMatch: bigint;
      relevance: number;
    }[]
  >(Prisma.sql`
  SELECT
    classifications.id as classificationId,
    classifications.code,
    classificationDescriptions.id AS descriptionId,
    classificationDescriptions.description,
    classificationSubCategories.id subCategoryId,
    classificationSubCategories.subCategory,
    classificationCategories.id categoryId,
    classificationCategories.category,
    classificationSystems.id systemId,
    classificationSystems.name systemName,
    classificationSystems.shortName systemShortName,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    REGEXP_LIKE(classifications.code, ${queryRegEx}) AS codeMatch,
    AVG(
    ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification: true, operator: "+" })}
    ) as relevance
  FROM
    content
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    AND
    (
      ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification: true, operator: "OR" })}
      OR classifications.code REGEXP ${queryRegEx}
    )
    ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    classificationId, descriptionId
  ORDER BY
    codeMatch DESC, relevance DESC
  LIMIT 100
  `);

  return matches.map((m) => ({
    classification: {
      id: m.classificationId,
      code: m.code,
      descriptionId: m.descriptionId,
      description: m.description,
    },
    subCategory: {
      id: m.subCategoryId,
      subCategory: m.subCategory,
    },
    category: {
      id: m.categoryId,
      category: m.category,
    },
    system: {
      id: m.systemId,
      name: m.systemName,
      shortName: m.systemShortName,
      descriptionLabel: m.descriptionLabel,
      subCategoryLabel: m.subCategoryLabel,
      categoryLabel: m.categoryLabel,
      categoriesInDescription: m.categoriesInDescription,
    },
  }));
}

export async function searchClassificationSubCategoriesWithSharedContent({
  query,
  loggedInUserId,
  systemId,
  categoryId,
  categories,
  ownerId,
}: {
  query: string;
  loggedInUserId: Uint8Array;
  systemId?: number;
  categoryId?: number;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}): Promise<PartialContentClassification[]> {
  const query_as_prefixes = sanitizeQuery(query);

  const matches = await prisma.$queryRaw<
    {
      subCategoryId: number;
      subCategory: string;
      categoryId: number;
      category: string;
      systemId: number;
      systemName: string;
      systemShortName: string;
      categoryLabel: string;
      subCategoryLabel: string;
      descriptionLabel: string;
      categoriesInDescription: boolean;
      relevance: number;
    }[]
  >(Prisma.sql`
  SELECT
    classificationSubCategories.id subCategoryId,
    classificationSubCategories.subCategory,
    classificationCategories.id categoryId,
    classificationCategories.category,
    classificationSystems.id systemId,
    classificationSystems.name systemName,
    classificationSystems.shortName systemShortName,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    ${returnClassificationMatchClauses({ query_as_prefixes, matchSubCategory: true })} as relevance
  FROM
    content
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    AND
    ${returnClassificationMatchClauses({ query_as_prefixes, matchSubCategory: true })}
    ${returnClassificationFilterWhereClauses({ systemId, categoryId })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}

  GROUP BY
    classificationSubCategories.id
  ORDER BY
    relevance DESC
  LIMIT 100
  `);

  return matches.map((m) => ({
    subCategory: {
      id: m.subCategoryId,
      subCategory: m.subCategory,
    },
    category: {
      id: m.categoryId,
      category: m.category,
    },
    system: {
      id: m.systemId,
      name: m.systemName,
      shortName: m.systemShortName,
      descriptionLabel: m.descriptionLabel,
      subCategoryLabel: m.subCategoryLabel,
      categoryLabel: m.categoryLabel,
      categoriesInDescription: m.categoriesInDescription,
    },
  }));
}

export async function searchClassificationCategoriesWithSharedContent({
  query,
  loggedInUserId,
  systemId,
  categories,
  ownerId,
}: {
  query: string;
  loggedInUserId: Uint8Array;
  systemId?: number;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}): Promise<PartialContentClassification[]> {
  const query_as_prefixes = sanitizeQuery(query);

  const matches = await prisma.$queryRaw<
    {
      categoryId: number;
      category: string;
      systemId: number;
      systemName: string;
      systemShortName: string;
      categoryLabel: string;
      subCategoryLabel: string;
      descriptionLabel: string;
      categoriesInDescription: boolean;
      relevance: number;
    }[]
  >(Prisma.sql`
  SELECT
    classificationCategories.id categoryId,
    classificationCategories.category,
    classificationCategories.sortIndex,
    classificationSystems.id systemId,
    classificationSystems.name systemName,
    classificationSystems.shortName systemShortName,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    ${returnClassificationMatchClauses({ query_as_prefixes, matchCategory: true })} as relevance
  FROM
    content
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    AND
    ${returnClassificationMatchClauses({ query_as_prefixes, matchCategory: true })}
    ${returnClassificationFilterWhereClauses({ systemId })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}

  GROUP BY
    classificationCategories.id
  ORDER BY
    relevance DESC, classificationCategories.sortIndex
  LIMIT 100
  `);

  return matches.map((m) => ({
    category: {
      id: m.categoryId,
      category: m.category,
    },
    system: {
      id: m.systemId,
      name: m.systemName,
      shortName: m.systemShortName,
      descriptionLabel: m.descriptionLabel,
      subCategoryLabel: m.subCategoryLabel,
      categoryLabel: m.categoryLabel,
      categoriesInDescription: m.categoriesInDescription,
    },
  }));
}

export async function browseClassificationSharedContent({
  loggedInUserId,
  classificationId,
  categories,
  ownerId,
  page = 1,
}: {
  loggedInUserId: Uint8Array;
  classificationId: number;
  categories?: Set<string>;
  ownerId?: Uint8Array;
  page?: number;
}) {
  const pageSize = 100;

  const categoriesToRequire =
    categories === undefined ? [] : [...categories.keys()];

  // TODO: how do we sort these?
  const results = await prisma.content.findMany({
    where: {
      isDeletedOn: null,
      OR: [
        { isPublic: true },
        { sharedWith: { some: { userId: loggedInUserId } } },
      ],
      AND: categoriesToRequire.map((category) => ({
        categories: { some: { code: category } },
      })),
      classifications: { some: { classificationId } },
      ownerId,
    },
    select: returnContentSelect({ includeOwnerDetails: true }),
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
  const content = results.map((c) => processContent(c));

  return { content };
}

export async function browseClassificationSubCategorySharedContent({
  loggedInUserId,
  subCategoryId,
  categories,
  ownerId,
}: {
  loggedInUserId: Uint8Array;
  subCategoryId: number;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}) {
  // TODO: how do we sort the content within each classification

  const categoriesToRequire =
    categories === undefined ? [] : [...categories.keys()];

  const preliminaryResults =
    await prisma.classificationSubCategories.findUniqueOrThrow({
      where: { id: subCategoryId },
      select: {
        subCategory: true,
        category: {
          select: {
            category: true,
            system: {
              select: {
                name: true,
                shortName: true,
                categoryLabel: true,
                subCategoryLabel: true,
                descriptionLabel: true,
                categoriesInDescription: true,
              },
            },
          },
        },
        descriptions: {
          where: {
            classification: {
              contentClassifications: {
                some: {
                  content: {
                    isDeletedOn: null,
                    OR: [
                      { isPublic: true },
                      { sharedWith: { some: { userId: loggedInUserId } } },
                    ],
                    AND: categoriesToRequire.map((category) => ({
                      categories: { some: { code: category } },
                    })),
                    ownerId,
                  },
                },
              },
            },
          },
          orderBy: { sortIndex: "asc" },
          select: {
            description: true,
            id: true,
            classification: {
              select: {
                code: true,
                id: true,
                contentClassifications: {
                  where: {
                    content: {
                      isDeletedOn: null,
                      OR: [
                        { isPublic: true },
                        { sharedWith: { some: { userId: loggedInUserId } } },
                      ],
                      AND: categoriesToRequire.map((category) => ({
                        categories: { some: { code: category } },
                      })),
                      ownerId,
                    },
                  },
                  select: {
                    content: {
                      select: returnContentSelect({
                        includeOwnerDetails: true,
                      }),
                    },
                  },
                  take: 100,
                },
              },
            },
          },
        },
      },
    });

  const results = {
    subCategory: preliminaryResults.subCategory,
    category: preliminaryResults.category,
    classifications: preliminaryResults.descriptions.map((description) => ({
      code: description.classification.code,
      classificationId: description.classification.id,
      description: description.description,
      descriptionId: description.id,
      content: description.classification.contentClassifications.map((cc) =>
        //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
        processContent(cc.content),
      ),
    })),
  };

  return results;
}

export async function browseClassificationCategorySharedContent({
  loggedInUserId,
  categoryId,
  categories,
  ownerId,
}: {
  loggedInUserId: Uint8Array;
  categoryId: number;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}) {
  const categoriesToRequire =
    categories === undefined ? [] : [...categories.keys()];

  // TODO: how do we sort the content within each classification

  const preliminaryResults =
    await prisma.classificationCategories.findUniqueOrThrow({
      where: { id: categoryId },
      select: {
        category: true,
        subCategories: {
          where: {
            descriptions: {
              some: {
                classification: {
                  contentClassifications: {
                    some: {
                      content: {
                        isDeletedOn: null,
                        OR: [
                          { isPublic: true },
                          { sharedWith: { some: { userId: loggedInUserId } } },
                        ],
                        AND: categoriesToRequire.map((category) => ({
                          categories: { some: { code: category } },
                        })),
                        ownerId,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { sortIndex: "asc" },
          select: {
            subCategory: true,
            id: true,
            category: {
              select: {
                category: true,
                system: {
                  select: {
                    name: true,
                    shortName: true,
                    categoryLabel: true,
                    subCategoryLabel: true,
                    descriptionLabel: true,
                    categoriesInDescription: true,
                  },
                },
              },
            },
            descriptions: {
              where: {
                classification: {
                  contentClassifications: {
                    some: {
                      content: {
                        isDeletedOn: null,
                        OR: [
                          { isPublic: true },
                          { sharedWith: { some: { userId: loggedInUserId } } },
                        ],
                        AND: categoriesToRequire.map((category) => ({
                          categories: { some: { code: category } },
                        })),
                        ownerId,
                      },
                    },
                  },
                },
              },
              orderBy: { sortIndex: "asc" },
              select: {
                description: true,
                id: true,
                classification: {
                  select: {
                    code: true,
                    id: true,
                    contentClassifications: {
                      where: {
                        content: {
                          isDeletedOn: null,
                          OR: [
                            { isPublic: true },
                            {
                              sharedWith: { some: { userId: loggedInUserId } },
                            },
                          ],
                          AND: categoriesToRequire.map((category) => ({
                            categories: { some: { code: category } },
                          })),
                          ownerId,
                        },
                      },
                      select: {
                        content: {
                          select: returnContentSelect({
                            includeOwnerDetails: true,
                          }),
                        },
                      },
                      take: 10,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

  const results = {
    category: preliminaryResults.category,
    subCategories: preliminaryResults.subCategories.map((subCategory) => ({
      subCategory: subCategory.subCategory,
      subCategoryId: subCategory.id,
      classifications: subCategory.descriptions.map((description) => ({
        code: description.classification.code,
        classificationId: description.classification.id,
        description: description.description,
        descriptionId: description.id,
        content: description.classification.contentClassifications.map((cc) =>
          //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
          processContent(cc.content),
        ),
      })),
    })),
  };

  return results;
}

export async function browseClassificationsWithSharedContent({
  query,
  loggedInUserId,
  subCategoryId,
  categories,
  ownerId,
}: {
  query?: string;
  loggedInUserId: Uint8Array;
  subCategoryId: number;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}): Promise<PartialContentClassification[]> {
  let matches;

  if (query) {
    const query_as_prefixes = sanitizeQuery(query);

    matches = await prisma.$queryRaw<
      {
        classificationId: number;
        code: string;
        descriptionId: number;
        description: string;
        subCategoryId: number;
        subCategory: string;
        categoryId: number;
        category: string;
        systemId: number;
        systemName: string;
        systemShortName: string;
        categoryLabel: string;
        subCategoryLabel: string;
        descriptionLabel: string;
        categoriesInDescription: boolean;
        numContent: bigint;
        numCurated: bigint;
      }[]
    >(Prisma.sql`
  SELECT
    classifications.id AS classificationId,
    classifications.code,
    classificationDescriptions.id AS descriptionId,
    classificationDescriptions.description,
    classificationSubCategories.id subCategoryId,
    classificationSubCategories.subCategory subCategory,
    classificationCategories.id categoryId,
    classificationCategories.category,
    classificationSystems.id systemId,
    classificationSystems.name systemName,
    classificationSystems.shortName systemShortName,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    COUNT(distinct content.id) AS numContent,
    COUNT(distinct libraryActivityInfos.contentId) AS numCurated
  FROM
    content
  LEFT JOIN
    libraryActivityInfos ON content.id = libraryActivityInfos.contentId
  ${ownerId === undefined ? Prisma.sql`LEFT JOIN users ON content.ownerId = users.userId` : Prisma.empty}
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    AND (
      MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      OR MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      ${ownerId === undefined ? Prisma.sql`OR MATCH(users.firstNames, users.lastNames) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)` : Prisma.empty}
    )
    ${returnClassificationFilterWhereClauses({ subCategoryId })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    classifications.id, classificationDescriptions.id
  ORDER BY
    classificationDescriptions.sortIndex
  `);
  } else {
    matches = await prisma.$queryRaw<
      {
        classificationId: number;
        code: string;
        descriptionId: number;
        description: string;
        subCategoryId: number;
        subCategory: string;
        categoryId: number;
        category: string;
        systemId: number;
        systemName: string;
        systemShortName: string;
        categoryLabel: string;
        subCategoryLabel: string;
        descriptionLabel: string;
        categoriesInDescription: boolean;
        numContent: bigint;
        numCurated: bigint;
      }[]
    >(Prisma.sql`
  SELECT
    classifications.id AS classificationId,
    classifications.code,
    classificationDescriptions.id AS descriptionId,
    classificationDescriptions.description,
    classificationSubCategories.id subCategoryId,
    classificationSubCategories.subCategory subCategory,
    classificationCategories.id categoryId,
    classificationCategories.category,
    classificationSystems.id systemId,
    classificationSystems.name systemName,
    classificationSystems.shortName systemShortName,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    COUNT(distinct content.id) AS numContent,
    COUNT(distinct libraryActivityInfos.contentId) AS numCurated
  FROM
    content
  LEFT JOIN
    libraryActivityInfos ON content.id = libraryActivityInfos.contentId
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    ${returnClassificationFilterWhereClauses({ subCategoryId })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    classifications.id, classificationDescriptions.id
  ORDER BY
    classificationDescriptions.sortIndex
  `);
  }

  return matches.map((m) => ({
    classification: {
      id: m.classificationId,
      code: m.code,
      descriptionId: m.descriptionId,
      description: m.description,
    },
    subCategory: {
      id: m.subCategoryId,
      subCategory: m.subCategory,
    },
    category: {
      id: m.categoryId,
      category: m.category,
    },
    system: {
      id: m.systemId,
      name: m.systemName,
      shortName: m.systemShortName,
      descriptionLabel: m.descriptionLabel,
      subCategoryLabel: m.subCategoryLabel,
      categoryLabel: m.categoryLabel,
      categoriesInDescription: m.categoriesInDescription,
    },
    numCommunity: Number(m.numContent) - Number(m.numCurated),
    numCurated: Number(m.numCurated),
  }));
}

export async function browseClassificationSubCategoriesWithSharedContent({
  query,
  loggedInUserId,
  categoryId,
  categories,
  ownerId,
}: {
  query?: string;
  loggedInUserId: Uint8Array;
  categoryId: number;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}): Promise<PartialContentClassification[]> {
  let matches;

  if (query) {
    const query_as_prefixes = sanitizeQuery(query);

    matches = await prisma.$queryRaw<
      {
        subCategoryId: number;
        subCategory: string;
        categoryId: number;
        category: string;
        systemId: number;
        systemName: string;
        systemShortName: string;
        categoryLabel: string;
        subCategoryLabel: string;
        descriptionLabel: string;
        categoriesInDescription: boolean;
        numContent: bigint;
        numCurated: bigint;
      }[]
    >(Prisma.sql`
  SELECT
    classificationSubCategories.id AS subCategoryId,
    classificationSubCategories.subCategory,
    classificationCategories.id categoryId,
    classificationCategories.category,
    classificationSystems.id systemId,
    classificationSystems.name systemName,
    classificationSystems.shortName systemShortName,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    COUNT(distinct content.id) AS numContent,
    COUNT(distinct libraryActivityInfos.contentId) AS numCurated
  FROM
    content
  LEFT JOIN
    libraryActivityInfos ON content.id = libraryActivityInfos.contentId        
  ${ownerId === undefined ? Prisma.sql`LEFT JOIN users ON content.ownerId = users.userId` : Prisma.empty}
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    AND (
      MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      OR MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification: true, prependOperator: true, operator: "OR" })}
      ${ownerId === undefined ? Prisma.sql`OR MATCH(users.firstNames, users.lastNames) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)` : Prisma.empty}
    )
    ${returnClassificationFilterWhereClauses({ categoryId })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    classificationSubCategories.id
  ORDER BY
    classificationSubCategories.sortIndex
  `);
  } else {
    matches = await prisma.$queryRaw<
      {
        subCategoryId: number;
        subCategory: string;
        categoryId: number;
        category: string;
        systemId: number;
        systemName: string;
        systemShortName: string;
        categoryLabel: string;
        subCategoryLabel: string;
        descriptionLabel: string;
        categoriesInDescription: boolean;
        numContent: bigint;
        numCurated: bigint;
      }[]
    >(Prisma.sql`
  SELECT
    classificationSubCategories.id AS subCategoryId,
    classificationSubCategories.subCategory,
    classificationCategories.id categoryId,
    classificationCategories.category,
    classificationSystems.id systemId,
    classificationSystems.name systemName,
    classificationSystems.shortName systemShortName,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    COUNT(distinct content.id) AS numContent,
    COUNT(distinct libraryActivityInfos.contentId) AS numCurated

  FROM
    content
  LEFT JOIN
    libraryActivityInfos ON content.id = libraryActivityInfos.contentId    
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    ${returnClassificationFilterWhereClauses({ categoryId })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    classificationSubCategories.id
  ORDER BY
    classificationSubCategories.sortIndex
  `);
  }

  return matches.map((m) => ({
    subCategory: {
      id: m.subCategoryId,
      subCategory: m.subCategory,
    },
    category: {
      id: m.categoryId,
      category: m.category,
    },
    system: {
      id: m.systemId,
      name: m.systemName,
      shortName: m.systemShortName,
      descriptionLabel: m.descriptionLabel,
      subCategoryLabel: m.subCategoryLabel,
      categoryLabel: m.categoryLabel,
      categoriesInDescription: m.categoriesInDescription,
    },
    numCommunity: Number(m.numContent) - Number(m.numCurated),
    numCurated: Number(m.numCurated),
  }));
}

export async function browseClassificationCategoriesWithSharedContent({
  query,
  loggedInUserId,
  systemId,
  categories,
  ownerId,
}: {
  query?: string;
  loggedInUserId: Uint8Array;
  systemId: number;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}): Promise<PartialContentClassification[]> {
  let matches;

  if (query) {
    const query_as_prefixes = sanitizeQuery(query);

    matches = await prisma.$queryRaw<
      {
        categoryId: number;
        category: string;
        systemId: number;
        systemName: string;
        systemShortName: string;
        categoryLabel: string;
        subCategoryLabel: string;
        descriptionLabel: string;
        categoriesInDescription: boolean;
        numContent: bigint;
        numCurated: bigint;
      }[]
    >(Prisma.sql`
  SELECT
    classificationCategories.id AS categoryId,
    classificationCategories.category,
    classificationSystems.id systemId,
    classificationSystems.name systemName,
    classificationSystems.shortName systemShortName,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    COUNT(distinct content.id) AS numContent,
    COUNT(distinct libraryActivityInfos.contentId) AS numCurated
  FROM
    content
  LEFT JOIN
      libraryActivityInfos ON content.id = libraryActivityInfos.contentId
  ${ownerId === undefined ? Prisma.sql`LEFT JOIN users ON content.ownerId = users.userId` : Prisma.empty}
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    AND (
      MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      OR MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification: true, matchSubCategory: true, prependOperator: true, operator: "OR" })}
      ${ownerId === undefined ? Prisma.sql`OR MATCH(users.firstNames, users.lastNames) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)` : Prisma.empty}
    )
    ${returnClassificationFilterWhereClauses({ systemId })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    classificationCategories.id
  ORDER BY
    classificationCategories.sortIndex
  `);
  } else {
    matches = await prisma.$queryRaw<
      {
        categoryId: number;
        category: string;
        systemId: number;
        systemName: string;
        systemShortName: string;
        categoryLabel: string;
        subCategoryLabel: string;
        descriptionLabel: string;
        categoriesInDescription: boolean;
        numContent: bigint;
        numCurated: bigint;
      }[]
    >(Prisma.sql`
  SELECT
    classificationCategories.id AS categoryId,
    classificationCategories.category,
    classificationSystems.id systemId,
    classificationSystems.name systemName,
    classificationSystems.shortName systemShortName,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    COUNT(distinct content.id) AS numContent,
    COUNT(distinct libraryActivityInfos.contentId) AS numCurated
  FROM
    content
  LEFT JOIN
    libraryActivityInfos ON content.id = libraryActivityInfos.contentId
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    ${returnClassificationFilterWhereClauses({ systemId })}
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    classificationCategories.id
  ORDER BY
    classificationCategories.sortIndex
  `);
  }

  return matches.map((m) => ({
    category: {
      id: m.categoryId,
      category: m.category,
    },
    system: {
      id: m.systemId,
      name: m.systemName,
      shortName: m.systemShortName,
      descriptionLabel: m.descriptionLabel,
      subCategoryLabel: m.subCategoryLabel,
      categoryLabel: m.categoryLabel,
      categoriesInDescription: m.categoriesInDescription,
    },
    numCurated: Number(m.numCurated),
    numCommunity: Number(m.numContent) - Number(m.numCurated),
  }));
}

export async function browseClassificationSystemsWithSharedContent({
  query,
  loggedInUserId,
  categories,
  ownerId,
}: {
  query?: string;
  loggedInUserId: Uint8Array;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}): Promise<PartialContentClassification[]> {
  let matches;

  if (query) {
    const query_as_prefixes = sanitizeQuery(query);

    matches = await prisma.$queryRaw<
      {
        systemId: number | null;
        systemName: string | null;
        systemShortName: string | null;
        systemType: string | null;
        categoryLabel: string | null;
        subCategoryLabel: string | null;
        descriptionLabel: string | null;
        categoriesInDescription: boolean | null;
        numContent: bigint;
        numCurated: bigint;
      }[]
    >(Prisma.sql`
  SELECT
    classificationSystems.id AS systemId,
    classificationSystems.name as systemName,
    classificationSystems.shortName as systemShortName,
    classificationSystems.type as systemType,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    COUNT(distinct content.id) AS numContent,
    COUNT(distinct libraryActivityInfos.contentId) AS numCurated
  FROM
    content
  LEFT JOIN
      libraryActivityInfos ON content.id = libraryActivityInfos.contentId
  ${ownerId === undefined ? Prisma.sql`LEFT JOIN users ON content.ownerId = users.userId` : Prisma.empty}
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    AND (
      MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      OR MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification: true, matchSubCategory: true, matchCategory: true, prependOperator: true, operator: "OR" })}
      ${ownerId === undefined ? Prisma.sql`OR MATCH(users.firstNames, users.lastNames) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)` : Prisma.empty}
    )
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    classificationSystems.id
  ORDER BY
    classificationSystems.sortIndex
  `);
  } else {
    matches = await prisma.$queryRaw<
      {
        systemId: number | null;
        systemName: string | null;
        systemShortName: string | null;
        systemType: string | null;
        categoryLabel: string | null;
        subCategoryLabel: string | null;
        descriptionLabel: string | null;
        categoriesInDescription: boolean | null;
        numContent: bigint;
        numCurated: bigint;
      }[]
    >(Prisma.sql`
  SELECT
    classificationSystems.id AS systemId,
    classificationSystems.name as systemName,
    classificationSystems.shortName as systemShortName,
    classificationSystems.type as systemType,
    classificationSystems.categoryLabel,
    classificationSystems.subCategoryLabel,
    classificationSystems.descriptionLabel,
    classificationSystems.categoriesInDescription,
    COUNT(distinct content.id) AS numContent,
    COUNT(distinct libraryActivityInfos.contentId) AS numCurated
  FROM
    content
  LEFT JOIN
    libraryActivityInfos ON content.id = libraryActivityInfos.contentId    
  ${returnClassificationJoins({ includeSystem: true, joinFromContent: true })}
  ${returnCategoryJoins(categories)}
  WHERE
    content.isDeletedOn IS NULL
    AND (
       content.isPublic = TRUE
       OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
    )
    ${returnCategoryWhereClauses(categories)}
    ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
  GROUP BY
    classificationSystems.id
  ORDER BY
    classificationSystems.sortIndex
  `);
  }

  return matches.map((m) => {
    const numCommunity = Number(m.numContent) - Number(m.numCurated);
    const numCurated = Number(m.numCurated);

    if (m.systemId === null) {
      return { numCommunity, numCurated };
    }
    const partialClass: PartialContentClassification = {
      system: {
        id: m.systemId,
        name: m.systemName!,
        shortName: m.systemShortName!,
        descriptionLabel: m.descriptionLabel!,
        subCategoryLabel: m.subCategoryLabel!,
        categoryLabel: m.categoryLabel!,
        categoriesInDescription: m.categoriesInDescription!,
      },
      numCommunity,
      numCurated,
    };

    return partialClass;
  });
}

// TODO: add test
export async function getSharedContentMatchCount({
  query,
  loggedInUserId,
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
  isUnclassified,
  categories,
  ownerId,
}: {
  query?: string;
  loggedInUserId: Uint8Array;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
  isUnclassified?: boolean;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}): Promise<{ numCommunity: number; numCurated: number }> {
  let matches;

  if (query) {
    const query_as_prefixes = sanitizeQuery(query);

    const matchClassification =
      !isUnclassified && classificationId === undefined;
    const matchSubCategory = matchClassification && subCategoryId === undefined;
    const matchCategory = matchSubCategory && categoryId === undefined;

    const includeClassification = true;
    const includeSubCategory = matchSubCategory;
    const includeCategory = matchCategory;

    matches = await prisma.$queryRaw<
      {
        numContent: bigint;
        curatedContent: bigint;
      }[]
    >(Prisma.sql`
      SELECT
        COUNT(distinct content.id) as numContent,
        COUNT(distinct libraryActivityInfos.contentId) as curatedContent
      FROM
        content
      LEFT JOIN
        users ON content.ownerId = users.userId
      LEFT JOIN
        libraryActivityInfos ON content.id = libraryActivityInfos.contentId
      ${returnClassificationJoins({ includeClassification, includeSubCategory, includeCategory, joinFromContent: true })}
      ${returnCategoryJoins(categories)}
      WHERE
        content.isDeletedOn IS NULL
        AND (
           content.isPublic = TRUE
           OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
        )
        AND
        (
          MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
          OR MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
          ${ownerId === undefined ? Prisma.sql`OR MATCH(users.firstNames, users.lastNames) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)` : Prisma.empty}
          ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification, matchSubCategory, matchCategory, prependOperator: true, operator: "OR" })}
        )
        ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId, classificationId, isUnclassified })}
        ${returnCategoryWhereClauses(categories)}
        ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
      `);
  } else {
    const includeClassification =
      isUnclassified ||
      classificationId !== undefined ||
      subCategoryId !== undefined;
    const includeSubCategory =
      !includeClassification && categoryId !== undefined;
    const includeCategory = !includeSubCategory && systemId !== undefined;

    matches = await prisma.$queryRaw<
      {
        numContent: bigint;
        curatedContent: bigint;
      }[]
    >(Prisma.sql`
      SELECT
        COUNT(distinct content.id) as numContent,
        COUNT(distinct libraryActivityInfos.contentId) as curatedContent
      FROM
        content
      LEFT JOIN
        users ON content.ownerId = users.userId
      LEFT JOIN
        libraryActivityInfos ON content.id = libraryActivityInfos.contentId
      ${returnClassificationJoins({ includeClassification, includeSubCategory, includeCategory, joinFromContent: true })}
      ${returnCategoryJoins(categories)}
      WHERE
        content.isDeletedOn IS NULL
        AND (
           content.isPublic = TRUE
           OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
        )
        ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId, classificationId, isUnclassified })}
        ${returnCategoryWhereClauses(categories)}
        ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
      `);
  }

  if (matches.length === 0) {
    return { numCommunity: 0, numCurated: 0 };
  } else {
    const numTotal = Number(matches[0].numContent);
    const numCurated = Number(matches[0].curatedContent);
    return { numCommunity: numTotal - numCurated, numCurated };
  }
}

/**
 * Calculates content match counts for each available category when added to the current filter set.
 *
 * The function respects the current filter context (classifications, existing categories, owner, etc.)
 * and only counts content that is either public or shared with the logged-in user.
 *
 * @param query - Optional search query to filter content by name, source, or author
 * @param loggedInUserId - The ID of the currently logged-in user for permission filtering
 * @param systemId - Optional classification system ID to filter by
 * @param categoryId - Optional classification category ID to filter by
 * @param subCategoryId - Optional classification sub-category ID to filter by
 * @param classificationId - Optional specific classification ID to filter by
 * @param isUnclassified - If true, filters to content without any classifications
 * @param categories - Set of category codes that are already applied as filters
 * @param ownerId - Optional owner ID to filter content by a specific author
 *
 * @returns A record mapping category codes to objects containing:
 *   - numCommunity: Count of non-curated content matching the filter with this category added
 *   - numCurated: Count of curated content matching the filter with this category added
 *
 * @example
 * // Get counts for each category when filtering by math classification
 * const counts = await countMatchingContentByCategory({
 *   loggedInUserId,
 *   classificationId: 42,
 *   categories: new Set(['difficulty-beginner'])
 * });
 * // Returns: { 'isInteractive': { numCommunity: 15, numCurated: 3 }, 'containsVideo': { numCommunity: 8, numCurated: 1 }, ... }
 */
export async function countMatchingContentByCategory({
  query,
  loggedInUserId,
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
  isUnclassified,
  categories,
  ownerId,
}: {
  query?: string;
  loggedInUserId: Uint8Array;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
  isUnclassified?: boolean;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}): Promise<Record<string, { numCommunity?: number; numCurated?: number }>> {
  const matchesPerCategory: Record<
    string,
    { numCommunity?: number; numCurated?: number }
  > = {};

  const { allCategories } = await getAllCategories();

  // Note: these queries iterate through all categories and, for each category, temporarily adds it
  // to the existing filter set to count how many content items would match. This is used to populate
  // category filter UI elements with counts showing users how many results they would get if they
  // selected each additional category.

  if (query) {
    const query_as_prefixes = sanitizeQuery(query);

    const matchClassification =
      !isUnclassified && classificationId === undefined;
    const matchSubCategory = matchClassification && subCategoryId === undefined;
    const matchCategory = matchSubCategory && categoryId === undefined;

    const includeClassification = true;
    const includeSubCategory = matchSubCategory;
    const includeCategory = matchCategory;

    for (const categoryGroup of allCategories) {
      for (const category of categoryGroup.categories) {
        const newCategories = new Set(categories);
        newCategories.add(category.code);

        const matches = await prisma.$queryRaw<
          {
            numContent: bigint;
            numCurated: bigint;
          }[]
        >(Prisma.sql`
      SELECT
        COUNT(distinct content.id) as numContent,
        COUNT(distinct libraryActivityInfos.contentId) as numCurated
      FROM
        content
      LEFT JOIN
        users ON content.ownerId = users.userId
      LEFT JOIN
        libraryActivityInfos ON content.id = libraryActivityInfos.contentId
      ${returnClassificationJoins({ includeClassification, includeSubCategory, includeCategory, joinFromContent: true })}
      ${returnCategoryJoins(newCategories)}
      WHERE
        content.isDeletedOn IS NULL
        AND (
           content.isPublic = TRUE
           OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
        )
        AND
        (
          MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
          OR MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
          ${ownerId === undefined ? Prisma.sql`OR MATCH(users.firstNames, users.lastNames) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)` : Prisma.empty}
          ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification, matchSubCategory, matchCategory, prependOperator: true, operator: "OR" })}
        )
        ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId, classificationId, isUnclassified })}
        ${returnCategoryWhereClauses(newCategories)}
        ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
      `);

        if (matches.length > 0) {
          const numTotal = Number(matches[0].numContent);
          const numCurated = Number(matches[0].numCurated);
          matchesPerCategory[category.code] = {
            numCommunity: numTotal - numCurated,
            numCurated: numCurated,
          };
        }
      }
    }
  } else {
    const includeClassification =
      isUnclassified ||
      classificationId !== undefined ||
      subCategoryId !== undefined;
    const includeSubCategory =
      !includeClassification && categoryId !== undefined;
    const includeCategory = !includeSubCategory && systemId !== undefined;

    for (const categoryGroup of allCategories) {
      for (const category of categoryGroup.categories) {
        const newCategories = new Set(categories);
        newCategories.add(category.code);

        const matches = await prisma.$queryRaw<
          {
            numContent: bigint;
            numCurated: bigint;
          }[]
        >(Prisma.sql`
      SELECT
        COUNT(distinct content.id) as numContent,
        COUNT(distinct libraryActivityInfos.contentId) as numCurated
      FROM
        content
      LEFT JOIN
        users ON content.ownerId = users.userId
      LEFT JOIN
        libraryActivityInfos ON content.id = libraryActivityInfos.contentId
      ${returnClassificationJoins({ includeClassification, includeSubCategory, includeCategory, joinFromContent: true })}
      ${returnCategoryJoins(newCategories)}
      WHERE
        content.isDeletedOn IS NULL
        AND (
           content.isPublic = TRUE
           OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
        )
        ${returnClassificationFilterWhereClauses({ systemId, categoryId, subCategoryId, classificationId, isUnclassified })}
        ${returnCategoryWhereClauses(newCategories)}
        ${ownerId === undefined ? Prisma.empty : Prisma.sql`AND content.ownerId=${ownerId}`}
      `);
        if (matches.length > 0) {
          const numTotal = Number(matches[0].numContent);
          const numCurated = Number(matches[0].numCurated);
          matchesPerCategory[category.code] = {
            numCommunity: numTotal - numCurated,
            numCurated: numCurated,
          };
        }
      }
    }
  }
  return matchesPerCategory;
}

export async function searchExplore({
  loggedInUserId = new Uint8Array(16),
  query,
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
  isUnclassified,
  categories,
  ownerId,
}: {
  loggedInUserId?: Uint8Array;
  query: string;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
  isUnclassified?: boolean;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}) {
  isUnclassified =
    isUnclassified &&
    classificationId === undefined &&
    subCategoryId === undefined &&
    categoryId === undefined &&
    systemId === undefined;

  const topAuthorsPromise = ownerId
    ? new Promise((resolve, _) => resolve(null))
    : browseUsersWithSharedContent({
        query,
        loggedInUserId,
        systemId,
        categoryId,
        subCategoryId,
        classificationId,
        isUnclassified,
        categories,
        take: 10,
      });

  const matchedAuthorsPromise = ownerId
    ? new Promise((resolve, _) => resolve(null))
    : searchUsersWithSharedContent({
        query,
        loggedInUserId,
        systemId,
        categoryId,
        subCategoryId,
        classificationId,
        isUnclassified,
        categories,
      });

  const authorInfoPromise = ownerId
    ? getAuthorInfo(ownerId)
    : new Promise((resolve, _) => resolve(null));

  const contentPromise = searchSharedContent({
    query,
    isCurated: false,
    loggedInUserId,
    systemId,
    categoryId,
    subCategoryId,
    classificationId,
    isUnclassified,
    categories,
    ownerId,
  });

  const curatedContentPromise = searchSharedContent({
    query,
    isCurated: true,
    loggedInUserId,
    systemId,
    categoryId,
    subCategoryId,
    classificationId,
    isUnclassified,
    categories,
    ownerId,
  });

  let matchedClassificationsPromise: Promise<
    PartialContentClassification[] | null
  > = new Promise((resolve, _) => resolve(null));
  let matchedSubCategoriesPromise: Promise<
    PartialContentClassification[] | null
  > = new Promise((resolve, _) => resolve(null));
  let matchedCategoriesPromise: Promise<PartialContentClassification[] | null> =
    new Promise((resolve, _) => resolve(null));

  let classificationBrowsePromise: Promise<
    PartialContentClassification[] | null
  > = new Promise((resolve, _) => resolve(null));
  let subCategoryBrowsePromise: Promise<PartialContentClassification[] | null> =
    new Promise((resolve, _) => resolve(null));
  let categoryBrowsePromise: Promise<PartialContentClassification[] | null> =
    new Promise((resolve, _) => resolve(null));
  let systemBrowsePromise: Promise<PartialContentClassification[] | null> =
    new Promise((resolve, _) => resolve(null));

  if (!isUnclassified && classificationId === undefined) {
    matchedClassificationsPromise = searchClassificationsWithSharedContent({
      query,
      loggedInUserId,
      systemId,
      categoryId,
      subCategoryId,
      categories,
      ownerId,
    });

    if (subCategoryId !== undefined) {
      classificationBrowsePromise = browseClassificationsWithSharedContent({
        query,
        loggedInUserId,
        subCategoryId,
        categories,
        ownerId,
      });
    } else {
      matchedSubCategoriesPromise =
        searchClassificationSubCategoriesWithSharedContent({
          query,
          loggedInUserId,
          systemId,
          categoryId,
          categories,
          ownerId,
        });
      if (categoryId !== undefined) {
        subCategoryBrowsePromise =
          browseClassificationSubCategoriesWithSharedContent({
            query,
            loggedInUserId,
            categoryId,
            categories,
            ownerId,
          });
      } else {
        matchedCategoriesPromise =
          searchClassificationCategoriesWithSharedContent({
            query,
            loggedInUserId,
            systemId,
            categories,
            ownerId,
          });

        if (systemId !== undefined) {
          categoryBrowsePromise =
            browseClassificationCategoriesWithSharedContent({
              query,
              loggedInUserId,
              systemId,
              categories,
              ownerId,
            });
        } else {
          systemBrowsePromise = browseClassificationSystemsWithSharedContent({
            query,
            loggedInUserId,
            categories,
            ownerId,
          });
        }
      }
    }
  }

  const classificationInfoPromise: Promise<PartialContentClassification | null> =
    isUnclassified
      ? new Promise((resolve, _) => resolve({}))
      : getClassificationInfo({
          systemId,
          categoryId,
          subCategoryId,
          classificationId,
        });

  const totalCountPromise = getSharedContentMatchCount({
    query,
    loggedInUserId,
    systemId,
    categoryId,
    subCategoryId,
    classificationId,
    isUnclassified,
    categories,
    ownerId,
  });

  const countByCategoryPromise = countMatchingContentByCategory({
    query,
    loggedInUserId,
    systemId,
    categoryId,
    subCategoryId,
    classificationId,
    isUnclassified,
    categories,
    ownerId,
  });

  const [
    topAuthors,
    matchedAuthors,
    authorInfo,
    content,
    curatedContent,
    matchedClassifications,
    matchedSubCategories,
    matchedCategories,
    classificationBrowse,
    subCategoryBrowse,
    categoryBrowse,
    systemBrowse,
    classificationInfo,
    totalCount,
    countByCategory,
  ] = await Promise.all([
    topAuthorsPromise,
    matchedAuthorsPromise,
    authorInfoPromise,
    contentPromise,
    curatedContentPromise,
    matchedClassificationsPromise,
    matchedSubCategoriesPromise,
    matchedCategoriesPromise,
    classificationBrowsePromise,
    subCategoryBrowsePromise,
    categoryBrowsePromise,
    systemBrowsePromise,
    classificationInfoPromise,
    totalCountPromise,
    countByCategoryPromise,
  ]);

  // Replace library owner info with source owner info
  const curatedSourceUsers = await Promise.all(
    curatedContent.map(
      async (c) =>
        await maskLibraryUserInfo({ contentId: c.contentId, owner: c.owner! }),
    ),
  );
  for (let i = 0; i < curatedContent.length; i++) {
    curatedContent[i].owner = curatedSourceUsers[i];
  }

  return {
    topAuthors,
    matchedAuthors,
    authorInfo,
    content,
    curatedContent,
    matchedClassifications,
    matchedSubCategories,
    matchedCategories,
    classificationBrowse,
    subCategoryBrowse,
    categoryBrowse,
    systemBrowse,
    classificationInfo,
    totalCount,
    countByCategory,
  };
}

export async function browseExplore({
  loggedInUserId = new Uint8Array(16),
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
  isUnclassified,
  categories,
  ownerId,
}: {
  loggedInUserId?: Uint8Array;
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
  isUnclassified?: boolean;
  categories?: Set<string>;
  ownerId?: Uint8Array;
}) {
  isUnclassified =
    isUnclassified &&
    classificationId === undefined &&
    subCategoryId === undefined &&
    categoryId === undefined &&
    systemId === undefined;

  const topAuthorsPromise = ownerId
    ? new Promise((resolve, _) => resolve(null))
    : browseUsersWithSharedContent({
        loggedInUserId,
        systemId,
        categoryId,
        subCategoryId,
        classificationId,
        isUnclassified,
        categories,
        take: 10,
      });

  const authorInfoPromise = ownerId
    ? getAuthorInfo(ownerId)
    : new Promise((resolve, _) => resolve(null));

  const recentContentPromise = browseSharedContent({
    loggedInUserId,
    isCurated: false,
    systemId,
    categoryId,
    subCategoryId,
    classificationId,
    isUnclassified,
    categories,
    ownerId,
  });

  const curatedContentPromise = browseSharedContent({
    isCurated: true,
    loggedInUserId,
    systemId,
    categoryId,
    subCategoryId,
    classificationId,
    isUnclassified,
    categories,
    ownerId,
  });

  const trendingContentPromise = browseTrendingContent({
    loggedInUserId,
    systemId,
    categoryId,
    subCategoryId,
    classificationId,
    isUnclassified,
    categories,
    ownerId,
    pageSize: 10,
  });

  let classificationBrowsePromise: Promise<
    PartialContentClassification[] | null
  > = new Promise((resolve, _) => resolve(null));
  let subCategoryBrowsePromise: Promise<PartialContentClassification[] | null> =
    new Promise((resolve, _) => resolve(null));
  let categoryBrowsePromise: Promise<PartialContentClassification[] | null> =
    new Promise((resolve, _) => resolve(null));
  let systemBrowsePromise: Promise<PartialContentClassification[] | null> =
    new Promise((resolve, _) => resolve(null));

  if (!isUnclassified && classificationId === undefined) {
    if (subCategoryId !== undefined) {
      classificationBrowsePromise = browseClassificationsWithSharedContent({
        loggedInUserId,
        subCategoryId,
        categories,
        ownerId,
      });
    } else {
      if (categoryId !== undefined) {
        subCategoryBrowsePromise =
          browseClassificationSubCategoriesWithSharedContent({
            loggedInUserId,
            categoryId,
            categories,
            ownerId,
          });
      } else {
        if (systemId !== undefined) {
          categoryBrowsePromise =
            browseClassificationCategoriesWithSharedContent({
              loggedInUserId,
              systemId,
              categories,
              ownerId,
            });
        } else {
          systemBrowsePromise = browseClassificationSystemsWithSharedContent({
            loggedInUserId,
            categories,
            ownerId,
          });
        }
      }
    }
  }

  const classificationInfoPromise: Promise<PartialContentClassification | null> =
    isUnclassified
      ? new Promise((resolve, _) => resolve({}))
      : getClassificationInfo({
          systemId,
          categoryId,
          subCategoryId,
          classificationId,
        });

  const totalCountPromise = getSharedContentMatchCount({
    loggedInUserId,
    systemId,
    categoryId,
    subCategoryId,
    classificationId,
    isUnclassified,
    categories,
    ownerId,
  });

  const countByCategoryPromise = countMatchingContentByCategory({
    loggedInUserId,
    systemId,
    categoryId,
    subCategoryId,
    classificationId,
    isUnclassified,
    categories,
    ownerId,
  });

  const [
    topAuthors,
    authorInfo,
    recentContent,
    curatedContent,
    trendingContent,
    classificationBrowse,
    subCategoryBrowse,
    categoryBrowse,
    systemBrowse,
    classificationInfo,
    totalCount,
    countByCategory,
  ] = await Promise.all([
    topAuthorsPromise,
    authorInfoPromise,
    recentContentPromise,
    curatedContentPromise,
    trendingContentPromise,
    classificationBrowsePromise,
    subCategoryBrowsePromise,
    categoryBrowsePromise,
    systemBrowsePromise,
    classificationInfoPromise,
    totalCountPromise,
    countByCategoryPromise,
  ]);

  // Replace library owner info with source owner info
  const curatedSourceUsers = await Promise.all(
    curatedContent.map(
      async (c) =>
        await maskLibraryUserInfo({ contentId: c.contentId, owner: c.owner! }),
    ),
  );
  for (let i = 0; i < curatedContent.length; i++) {
    curatedContent[i].owner = curatedSourceUsers[i];
  }

  return {
    topAuthors,
    authorInfo,
    recentContent,
    trendingContent,
    curatedContent,
    classificationBrowse,
    subCategoryBrowse,
    categoryBrowse,
    systemBrowse,
    classificationInfo,
    totalCount,
    countByCategory,
  };
}
