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
 * The categories an explore request filters by, with their codes resolved to
 * category ids by `resolveCategoryCodes`.
 */
export type ResolvedCategories = {
  /** Distinct ids of the categories the requested codes match */
  ids: number[];
  /** True if some requested code matches no category, so no content can match */
  hasUnknownCode: boolean;
};

/**
 * Generates a SQL WHERE clause to match content that has ALL specified categories.
 *
 * Each category adds one `EXISTS` probe of `_categoriesTocontent` for the
 * content row, which uses its unique (A, B) index. The ids are deduplicated
 * when the codes are resolved, so codes that name the same category (such as
 * codes differing only in letter case) add one probe.
 *
 * @param categories - The resolved categories that must all be present. If
 * undefined or with no ids, returns Prisma.empty. If a requested code matched no
 * category, returns a clause that excludes all content.
 * @returns Prisma.Sql object containing an AND clause on `content.id`, or Prisma.empty if no categories specified.
 *
 * @example
 * // For categories = { ids: [3, 7], hasUnknownCode: false }
 * // Generates:
 * // AND EXISTS (SELECT 1 FROM _categoriesTocontent AS categoriesTocontent
 * //   WHERE categoriesTocontent.B = content.id AND categoriesTocontent.A = 3)
 * // AND EXISTS (SELECT 1 FROM _categoriesTocontent AS categoriesTocontent
 * //   WHERE categoriesTocontent.B = content.id AND categoriesTocontent.A = 7)
 */
export function returnCategoryWhereClauses(categories?: ResolvedCategories) {
  if (categories === undefined) {
    return Prisma.empty;
  }
  if (categories.hasUnknownCode) {
    return Prisma.sql`AND FALSE`;
  }
  if (categories.ids.length === 0) {
    return Prisma.empty;
  }

  return Prisma.join(
    categories.ids.map(
      (id) => Prisma.sql`AND EXISTS (
    SELECT 1 FROM _categoriesTocontent AS categoriesTocontent
    WHERE categoriesTocontent.B = content.id AND categoriesTocontent.A = ${id}
  )`,
    ),
    "\n    ",
  );
}
