import { Prisma } from "@prisma/client";
import { ContentClassification } from "../types";

export function sortClassifications(classifications: ContentClassification[]) {
  // Sort based on the first description of the classification.

  function comparator(a: ContentClassification, b: ContentClassification) {
    return a.descriptions[0].sortIndex - b.descriptions[0].sortIndex;
  }

  classifications.sort(comparator);

  return classifications;
}

export function returnClassificationJoins({
  includeSystem = false,
  includeCategory = false,
  includeSubCategory = false,
  includeClassification = false,
  joinFromContent = false,
}: {
  includeSystem?: boolean;
  includeCategory?: boolean;
  includeSubCategory?: boolean;
  includeClassification?: boolean;
  joinFromContent?: boolean;
}) {
  if (
    !(
      includeClassification ||
      includeSubCategory ||
      includeCategory ||
      includeSystem
    )
  ) {
    return Prisma.empty;
  }

  return Prisma.sql`${
    joinFromContent
      ? Prisma.sql`
        LEFT JOIN
          contentClassifications ON content.id = contentClassifications.contentId
        LEFT JOIN
          classifications ON contentClassifications.classificationId = classifications.id`
      : Prisma.empty
  }
        LEFT JOIN
          classificationDescriptions ON classifications.id = classificationDescriptions.classificationId
  ${
    includeSubCategory || includeCategory || includeSystem
      ? Prisma.sql`
        LEFT JOIN
          classificationSubCategories ON classificationDescriptions.subCategoryId = classificationSubCategories.id`
      : Prisma.empty
  }
  ${
    includeCategory || includeSystem
      ? Prisma.sql`
        LEFT JOIN
          classificationCategories ON classificationSubCategories.categoryId = classificationCategories.id`
      : Prisma.empty
  }
  ${
    includeSystem
      ? Prisma.sql`
        LEFT JOIN
          classificationSystems ON classificationCategories.systemId = classificationSystems.id`
      : Prisma.empty
  }`;
}

export function returnClassificationMatchClauses({
  query_as_prefixes,
  matchClassification = false,
  matchSubCategory = false,
  matchCategory = false,
  matchSystem = false,
  prependOperator = false,
  operator = "OR",
}: {
  query_as_prefixes: string;
  matchClassification?: boolean;
  matchSubCategory?: boolean;
  matchCategory?: boolean;
  matchSystem?: boolean;
  prependOperator?: boolean;
  operator?: "+" | "OR";
}) {
  if (!(matchClassification || matchSubCategory || matchCategory)) {
    return Prisma.empty;
  }

  let classificationSQL;

  if (matchClassification) {
    classificationSQL = Prisma.sql`
      MATCH(classifications.code) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
      + MATCH(classificationDescriptions.description) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)`;

    if (prependOperator) {
      if (operator === "OR") {
        classificationSQL = Prisma.sql`OR ${classificationSQL}`;
      } else {
        classificationSQL = Prisma.sql`+ ${classificationSQL}`;
      }
    }
  } else {
    classificationSQL = Prisma.empty;
  }

  let subCategorySQL;
  if (matchSubCategory) {
    subCategorySQL = Prisma.sql`MATCH(classificationSubCategories.subCategory) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)`;
    if (prependOperator || matchClassification) {
      if (operator === "OR") {
        subCategorySQL = Prisma.sql`OR ${subCategorySQL}`;
      } else {
        subCategorySQL = Prisma.sql`+ ${subCategorySQL}`;
      }
    }
  } else {
    subCategorySQL = Prisma.empty;
  }

  let categorySQL;
  if (matchCategory) {
    categorySQL = Prisma.sql`MATCH(classificationCategories.category) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)`;
    if (prependOperator || matchClassification || matchSubCategory) {
      if (operator === "OR") {
        categorySQL = Prisma.sql`OR ${categorySQL}`;
      } else {
        categorySQL = Prisma.sql`+ ${categorySQL}`;
      }
    }
  } else {
    categorySQL = Prisma.empty;
  }

  let systemSQL;
  if (matchSystem) {
    systemSQL = Prisma.sql`MATCH(classificationSystems.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)`;
    if (
      prependOperator ||
      matchClassification ||
      matchSubCategory ||
      matchCategory
    ) {
      if (operator === "OR") {
        systemSQL = Prisma.sql`OR ${systemSQL}`;
      } else {
        systemSQL = Prisma.sql`+ ${systemSQL}`;
      }
    }
  } else {
    systemSQL = Prisma.empty;
  }

  return Prisma.sql`${classificationSQL} ${subCategorySQL} ${categorySQL} ${systemSQL}`;
}

export function returnClassificationFilterWhereClauses({
  systemId,
  categoryId,
  subCategoryId,
  classificationId,
  isUnclassified = false,
}: {
  systemId?: number;
  categoryId?: number;
  subCategoryId?: number;
  classificationId?: number;
  isUnclassified?: boolean;
}) {
  if (isUnclassified) {
    return Prisma.sql`AND classifications.id is null`;
  } else if (classificationId !== undefined) {
    return Prisma.sql`AND classifications.id = ${classificationId}`;
  } else if (subCategoryId !== undefined) {
    return Prisma.sql`AND classificationDescriptions.subCategoryId = ${subCategoryId}`;
  } else if (categoryId !== undefined) {
    return Prisma.sql`AND classificationSubCategories.categoryId = ${categoryId}`;
  } else if (systemId !== undefined) {
    return Prisma.sql`AND classificationCategories.systemId = ${systemId}`;
  } else {
    return Prisma.empty;
  }
}

/**
 * Generates SQL LEFT JOIN clauses to filter content by multiple categories.
 *
 * For each category in the set, this creates:
 * 1. A LEFT JOIN to the many-to-many relation table (_categoriesTocontent)
 * 2. A LEFT JOIN to the categories table
 *
 * The joins are aliased as ccf1, ccf2, ccf3... and categories1, categories2, categories3...
 * to support multiple category filters simultaneously.
 *
 * @param categories - A set of category codes to filter by. If undefined or empty, returns Prisma.empty.
 * @returns Prisma.Sql object containing the LEFT JOIN clauses, or Prisma.empty if no categories specified.
 *
 * @example
 * // For categories = new Set(["math", "algebra"])
 * // Generates:
 * // LEFT JOIN _categoriesTocontent AS ccf1 ON ccf1.B = content.id
 * // LEFT JOIN categories as categories1 on categories1.id = ccf1.A
 * // LEFT JOIN _categoriesTocontent AS ccf2 ON ccf2.B = content.id
 * // LEFT JOIN categories as categories2 on categories2.id = ccf2.A
 */
export function returnCategoryJoins(categories?: Set<string>) {
  const numCategories = categories === undefined ? 0 : categories.size;

  if (numCategories === 0) {
    return Prisma.empty;
  }

  // Build join clauses dynamically for any number of categories
  const joinClauses: Prisma.Sql[] = [];

  for (let i = 0; i < numCategories; i++) {
    joinClauses.push(Prisma.sql`
      LEFT JOIN _categoriesTocontent AS ${Prisma.raw(`ccf${i + 1}`)} ON ${Prisma.raw(`ccf${i + 1}`)}.B = content.id
      LEFT JOIN categories as ${Prisma.raw(`categories${i + 1}`)} on ${Prisma.raw(`categories${i + 1}`)}.id = ${Prisma.raw(`ccf${i + 1}`)}.A
    `);
  }

  return Prisma.sql`${Prisma.join(joinClauses, " ")}`;
}

/**
 * Generates SQL WHERE clauses to match content that has ALL specified categories.
 *
 * Works in conjunction with returnCategoryJoins() to filter content. Each category
 * must match one of the joined category tables (categories1, categories2, etc.).
 * This creates an AND condition ensuring content is tagged with all specified categories.
 *
 * @param categories - A set of category codes that must all be present. If undefined or empty, returns Prisma.empty.
 * @returns Prisma.Sql object containing AND clauses for each category, or Prisma.empty if no categories specified.
 *
 * @example
 * // For categories = new Set(["math", "algebra"])
 * // Generates:
 * // AND categories1.code = 'math'
 * // AND categories2.code = 'algebra'
 */
export function returnCategoryWhereClauses(categories?: Set<string>) {
  if (categories === undefined) {
    return Prisma.empty;
  }

  const categoriesToRequire = [...categories.keys()];

  const numCategories = categoriesToRequire.length;

  if (numCategories === 0) {
    return Prisma.empty;
  }

  // Build where clauses dynamically for any number of categories
  const whereClauses: Prisma.Sql[] = [];

  for (let i = 0; i < numCategories; i++) {
    whereClauses.push(
      Prisma.sql`AND ${Prisma.raw(`categories${i + 1}`)}.code = ${categoriesToRequire[i]}`,
    );
  }

  return Prisma.sql`${Prisma.join(whereClauses, " ")}`;
}
