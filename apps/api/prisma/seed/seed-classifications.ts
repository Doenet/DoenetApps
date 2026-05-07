import { prisma } from "../seed";
import commonCoreMath from "./common-core-math.json";
import mnMath from "./mn-math.json";
import webWork from "./webwork.json";
import hscMathAdditions from "./hscmath-additions.json";

async function upsertClassificationSystem(
  name: string,
  shortName: string,
  categoryLabel: string,
  subCategoryLabel: string,
  descriptionLabel: string,
  sortIndex: number,
  type: string,
  categoriesInDescription: boolean,
) {
  const { id } = await prisma.classificationSystems.upsert({
    where: { name },
    update: {
      name,
      shortName,
      categoryLabel,
      subCategoryLabel,
      descriptionLabel,
      sortIndex,
      type,
      categoriesInDescription,
    },
    create: {
      name,
      shortName,
      categoryLabel,
      subCategoryLabel,
      descriptionLabel,
      sortIndex,
      type,
      categoriesInDescription,
    },
  });
  return id;
}

async function upsertClassificationCategory(
  category: string,
  systemId: number,
  sortIndex: number,
) {
  const { id } = await prisma.classificationCategories.upsert({
    where: { category_systemId: { category, systemId } },
    update: { category, systemId, sortIndex },
    create: { category, systemId, sortIndex },
  });
  return id;
}

async function upsertClassificationSubCategory(
  subCategory: string,
  categoryId: number,
  sortIndex: number,
) {
  const { id } = await prisma.classificationSubCategories.upsert({
    where: { subCategory_categoryId: { subCategory, categoryId } },
    update: { subCategory, categoryId, sortIndex },
    create: { subCategory, categoryId, sortIndex },
  });
  return id;
}

async function upsertClassificationDescription(
  description: string,
  classificationId: number,
  subCategoryId: number,
  sortIndex: number,
  isPrimary: boolean,
) {
  await prisma.classificationDescriptions.upsert({
    where: {
      classificationId_subCategoryId: {
        classificationId,
        subCategoryId,
      },
    },
    create: {
      description,
      classificationId,
      subCategoryId,
      sortIndex,
      isPrimary,
    },
    update: { description, sortIndex, isPrimary },
  });
}

async function upsertClassification(
  code: string,
  description: string,
  subCategoryId: number,
  sortIndex: number,
  isPrimary: boolean,
) {
  // can't actually upsert as don't have a unique index
  const classification = await prisma.classifications.findMany({
    where: {
      code,
      descriptions: { some: { subCategoryId } },
    },
  });
  if (classification.length > 1) {
    throw Error("Shouldn't get a duplicate classification when seeding...");
  }

  if (classification.length === 0) {
    await prisma.classifications.create({
      data: {
        code,
        descriptions: { create: { description, subCategoryId, sortIndex } },
      },
    });
  } else {
    await upsertClassificationDescription(
      description,
      classification[0].id,
      subCategoryId,
      sortIndex,
      isPrimary,
    );
  }
}

type ClassificationSystemData = {
  category: string;
  subCategory: string;
  code: string;
  description:
    | string
    | {
        descriptionLinked: string;
        toCategory: string;
        toSubCategory: string;
        toDescription: string;
      };
  sortIndex: string;
}[];

async function addClassificationFromData({
  name,
  shortName,
  categoryLabel,
  subCategoryLabel,
  descriptionLabel,
  data,
  sortIndex,
  type,
  categoriesInDescription,
}: {
  name: string;
  shortName: string;
  categoryLabel: string;
  subCategoryLabel: string;
  descriptionLabel: string;
  data: ClassificationSystemData;
  sortIndex: number;
  type: string;
  categoriesInDescription: boolean;
}) {
  const systemId = await upsertClassificationSystem(
    name,
    shortName,
    categoryLabel,
    subCategoryLabel,
    descriptionLabel,
    sortIndex,
    type,
    categoriesInDescription,
  );

  let lastCategory = "";
  let lastCategoryId = NaN;
  let lastSubCategory = "";
  let lastSubCategoryId = NaN;
  const baseSortIndex = 10000 * sortIndex;
  for (const classification of data) {
    if (classification.category !== lastCategory) {
      lastCategoryId = await upsertClassificationCategory(
        classification.category,
        systemId,
        baseSortIndex + Number(classification.sortIndex),
      );
    }
    if (
      classification.subCategory !== lastSubCategory ||
      classification.category !== lastCategory
    ) {
      lastSubCategoryId = await upsertClassificationSubCategory(
        classification.subCategory,
        lastCategoryId,
        baseSortIndex + Number(classification.sortIndex),
      );
    }

    lastCategory = classification.category;
    lastSubCategory = classification.subCategory;

    if (typeof classification.description === "string") {
      await upsertClassification(
        classification.code,
        classification.description,
        lastSubCategoryId,
        baseSortIndex + Number(classification.sortIndex),
        true,
      );
    }
  }

  for (const classification of data) {
    if (typeof classification.description !== "string") {
      const linked = classification.description;

      // find category, subCategory, description, classification that we'll link to
      const linkedCategoryId = (
        await prisma.classificationCategories.findUniqueOrThrow({
          where: {
            category_systemId: { systemId, category: linked.toCategory },
          },
        })
      ).id;

      const linkedSubCategoryId = (
        await prisma.classificationSubCategories.findUniqueOrThrow({
          where: {
            subCategory_categoryId: {
              categoryId: linkedCategoryId,
              subCategory: linked.toSubCategory,
            },
          },
        })
      ).id;

      const linkedDescriptionId = (
        await prisma.classificationDescriptions.findUniqueOrThrow({
          where: {
            description_subCategoryId: {
              subCategoryId: linkedSubCategoryId,
              description: linked.toDescription,
            },
          },
        })
      ).id;

      const linkedClassification = await prisma.classifications.findMany({
        where: {
          descriptions: { some: { id: linkedDescriptionId } },
        },
      });

      if (linkedClassification.length !== 1) {
        throw Error(
          "Classification linked to description that isn't found or isn't unique",
        );
      }

      // find new category and subcategory
      const newCategoryId = (
        await prisma.classificationCategories.findUniqueOrThrow({
          where: {
            category_systemId: {
              systemId,
              category: classification.category,
            },
          },
          select: { id: true },
        })
      ).id;

      const newSubCategoryId = (
        await prisma.classificationSubCategories.findUniqueOrThrow({
          where: {
            subCategory_categoryId: {
              categoryId: newCategoryId,
              subCategory: classification.subCategory,
            },
          },
          select: { id: true },
        })
      ).id;

      // upsert new description
      await upsertClassificationDescription(
        linked.descriptionLinked,
        linkedClassification[0].id,
        newSubCategoryId,
        baseSortIndex + Number(classification.sortIndex),
        false,
      );
    }
  }
}

export async function seedClassifications() {
  await addClassificationFromData({
    name: "High school and college math",
    shortName: "HS/C Math",
    categoryLabel: "Subject",
    subCategoryLabel: "Chapter",
    descriptionLabel: "Section",
    data: webWork,
    sortIndex: 1,
    type: "Primary",
    categoriesInDescription: true,
  });

  await addClassificationFromData({
    name: "Common Core Math",
    shortName: "CC Math",
    categoryLabel: "Grade",
    subCategoryLabel: "Cluster",
    descriptionLabel: "Standard",
    data: commonCoreMath,
    sortIndex: 10,
    type: "Standards",
    categoriesInDescription: false,
  });

  await addClassificationFromData({
    name: "Minnesota Academic Standards in Math",
    shortName: "MN Math",
    categoryLabel: "Grade",
    subCategoryLabel: "Standard",
    descriptionLabel: "Benchmark",
    data: mnMath,
    sortIndex: 11,
    type: "Standards",
    categoriesInDescription: false,
  });

  await addClassificationFromData({
    name: "High school and college math",
    shortName: "HS/C Math",
    categoryLabel: "Subject",
    subCategoryLabel: "Chapter",
    descriptionLabel: "Section",
    data: hscMathAdditions,
    sortIndex: 1,
    type: "Primary",
    categoriesInDescription: true,
  });
}
