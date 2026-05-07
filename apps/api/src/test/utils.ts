import { onTestFinished } from "vitest";
import { prisma } from "../model";
import { findOrCreateUser } from "../query/user";
import { filterEditableRootAssignment } from "../utils/permissions";
import { ContentType } from "@prisma/client";
import { createContent, updateContent } from "../query/activity";

// create an isolated user for each test, will allow tests to be run in parallel
export async function createTestUser(
  isEditor = false,
  isAnonymous = false,
  lastNamePrefix = "",
  isPremium = false,
) {
  const id =
    Date.now().toString() + Math.round(Math.random() * 100000).toString();
  const email = `vitest${id}@vitest.test`;
  const firstNames = `vitest`;
  const lastNames = `${lastNamePrefix}user${id}`;
  let user;

  try {
    user = await findOrCreateUser({
      email,
      firstNames,
      lastNames,
      isEditor,
      isAnonymous,
      isPremium,
    });
  } catch (_e) {
    // try again by adding "a" to the end of the id for the email
    user = await findOrCreateUser({
      email: `vitest${id}a@vitest.test`,
      firstNames,
      lastNames: `user${id}a`,
      isEditor,
      isAnonymous,
      isPremium,
    });
  }
  return user;
}

export async function createTestEditorUser() {
  return await createTestUser(true);
}

export async function createTestAnonymousUser(lastNamePrefix = "") {
  return await createTestUser(false, true, lastNamePrefix);
}

export async function createTestPremiumUser(lastNamePrefix = "") {
  return await createTestUser(false, false, lastNamePrefix, true);
}

export async function getTestAssignment(
  contentId: Uint8Array,
  loggedInUserId: Uint8Array,
) {
  const assignment = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ...filterEditableRootAssignment(loggedInUserId),
    },
  });
  return assignment;
}

export async function createTestClassifications({
  systemId: originalSystemId,
  word,
  code,
}: {
  systemId?: number;
  word: string;
  code: string;
}) {
  let systemId;
  if (originalSystemId === undefined) {
    // if systemId is undefined, then create a new system
    const system = await prisma.classificationSystems.create({
      data: {
        name: `${word}${code}`,
        shortName: `${word}${code}`,
        categoryLabel: "",
        subCategoryLabel: "",
        descriptionLabel: "",
        sortIndex: 100,
        type: "other",
      },
    });
    systemId = system.id;
  } else {
    systemId = originalSystemId;
  }

  ////////////////
  // A. category A
  ////////////////
  const { id: categoryIdA } = await prisma.classificationCategories.create({
    data: {
      category: `${word}${code} ${word}A${code}`,
      systemId,
      sortIndex: 1,
    },
  });

  // A1. sub category A1
  //////////////////////
  const { id: subCategoryIdA1 } =
    await prisma.classificationSubCategories.create({
      data: {
        subCategory: `${word}${code} ${word}A1${code}`,
        categoryId: categoryIdA,
        sortIndex: 2,
      },
    });

  // A1A. classification A1A
  const { id: classificationIdA1A } = await prisma.classifications.create({
    data: {
      code: `${word}A1A${code}`,
      descriptions: {
        create: {
          description: `${word}${code} ${word}A1A${code}`,
          subCategoryId: subCategoryIdA1,
          sortIndex: 3,
        },
      },
    },
  });

  // A1B. classification A1B
  const { id: classificationIdA1B } = await prisma.classifications.create({
    data: {
      code: `${word}A1B${code}`,
      descriptions: {
        create: {
          description: `${word}${code} ${word}A1B${code}`,
          subCategoryId: subCategoryIdA1,
          sortIndex: 4,
        },
      },
    },
  });

  // A2. sub category A2
  //////////////////////
  const { id: subCategoryIdA2 } =
    await prisma.classificationSubCategories.create({
      data: {
        subCategory: `${word}${code} ${word}A2${code}`,
        categoryId: categoryIdA,
        sortIndex: 5,
      },
    });

  // A2A. classification A2A
  const { id: classificationIdA2A } = await prisma.classifications.create({
    data: {
      code: `${word}A2A${code}`,
      descriptions: {
        create: {
          description: `${word}${code} ${word}A2A${code}`,
          subCategoryId: subCategoryIdA2,
          sortIndex: 6,
        },
      },
    },
  });

  // A2B. classification A2B
  const { id: classificationIdA2B } = await prisma.classifications.create({
    data: {
      code: `${word}A2B${code}`,
      descriptions: {
        create: {
          description: `${word}${code} ${word}A2B${code}`,
          subCategoryId: subCategoryIdA2,
          sortIndex: 7,
        },
      },
    },
  });

  ////////////////
  // B. category B
  ////////////////
  const { id: categoryIdB } = await prisma.classificationCategories.create({
    data: {
      category: `${word}${code} ${word}B${code}`,
      systemId,
      sortIndex: 8,
    },
  });

  // B1. sub category B1
  //////////////////////
  const { id: subCategoryIdB1 } =
    await prisma.classificationSubCategories.create({
      data: {
        subCategory: `${word}${code} ${word}B1${code}`,
        categoryId: categoryIdB,
        sortIndex: 9,
      },
    });

  // B1A. classification B1A
  const { id: classificationIdB1A } = await prisma.classifications.create({
    data: {
      code: `${word}B1A${code}`,
      descriptions: {
        create: {
          description: `${word}${code} ${word}B1A${code}`,
          subCategoryId: subCategoryIdB1,
          sortIndex: 10,
        },
      },
    },
  });

  // B1B. classification B1B
  const { id: classificationIdB1B } = await prisma.classifications.create({
    data: {
      code: `${word}B1B${code}`,
      descriptions: {
        create: {
          description: `${word}${code} ${word}B1B${code}`,
          subCategoryId: subCategoryIdB1,
          sortIndex: 11,
        },
      },
    },
  });

  // B2. sub category B2
  //////////////////////
  const { id: subCategoryIdB2 } =
    await prisma.classificationSubCategories.create({
      data: {
        subCategory: `${word}${code} ${word}B2${code}`,
        categoryId: categoryIdB,
        sortIndex: 12,
      },
    });

  // B2A. classification B2A
  const { id: classificationIdB2A } = await prisma.classifications.create({
    data: {
      code: `${word}B2A${code}`,
      descriptions: {
        create: {
          description: `${word}${code} ${word}B2A${code}`,
          subCategoryId: subCategoryIdB2,
          sortIndex: 13,
        },
      },
    },
  });

  // B2B. classification B2B
  const { id: classificationIdB2B } = await prisma.classifications.create({
    data: {
      code: `${word}B2B${code}`,
      descriptions: {
        create: {
          description: `${word}${code} ${word}B2B${code}`,
          subCategoryId: subCategoryIdB2,
          sortIndex: 14,
        },
      },
    },
  });

  onTestFinished(() =>
    deleteTestClassifications({
      systemId: originalSystemId === undefined ? systemId : undefined,
      categoryIdA,
      subCategoryIdA1,
      classificationIdA1A,
      classificationIdA1B,
      subCategoryIdA2,
      classificationIdA2A,
      classificationIdA2B,
      categoryIdB,
      subCategoryIdB1,
      classificationIdB1A,
      classificationIdB1B,
      subCategoryIdB2,
      classificationIdB2A,
      classificationIdB2B,
    }),
  );

  return {
    systemId,
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    classificationIdA1B,
    subCategoryIdA2,
    classificationIdA2A,
    classificationIdA2B,
    categoryIdB,
    subCategoryIdB1,
    classificationIdB1A,
    classificationIdB1B,
    subCategoryIdB2,
    classificationIdB2A,
    classificationIdB2B,
  };
}

export async function deleteTestClassifications({
  systemId,
  categoryIdA,
  subCategoryIdA1,
  classificationIdA1A,
  classificationIdA1B,
  subCategoryIdA2,
  classificationIdA2A,
  classificationIdA2B,
  categoryIdB,
  subCategoryIdB1,
  classificationIdB1A,
  classificationIdB1B,
  subCategoryIdB2,
  classificationIdB2A,
  classificationIdB2B,
}: {
  systemId?: number;
  categoryIdA: number;
  subCategoryIdA1: number;
  classificationIdA1A: number;
  classificationIdA1B: number;
  subCategoryIdA2: number;
  classificationIdA2A: number;
  classificationIdA2B: number;
  categoryIdB: number;
  subCategoryIdB1: number;
  classificationIdB1A: number;
  classificationIdB1B: number;
  subCategoryIdB2: number;
  classificationIdB2A: number;
  classificationIdB2B: number;
}) {
  // sub category A1
  await prisma.classifications.update({
    where: { id: classificationIdA1A },
    data: { contentClassifications: { deleteMany: {} } },
  });
  await prisma.classifications.update({
    where: { id: classificationIdA1B },
    data: { contentClassifications: { deleteMany: {} } },
  });

  await prisma.classificationDescriptions.delete({
    where: {
      classificationId_subCategoryId: {
        classificationId: classificationIdA1A,
        subCategoryId: subCategoryIdA1,
      },
    },
  });
  await prisma.classifications.delete({ where: { id: classificationIdA1A } });
  await prisma.classificationDescriptions.delete({
    where: {
      classificationId_subCategoryId: {
        classificationId: classificationIdA1B,
        subCategoryId: subCategoryIdA1,
      },
    },
  });
  await prisma.classifications.delete({ where: { id: classificationIdA1B } });
  await prisma.classificationSubCategories.delete({
    where: { id: subCategoryIdA1 },
  });

  // sub category A2
  await prisma.classifications.update({
    where: { id: classificationIdA2A },
    data: { contentClassifications: { deleteMany: {} } },
  });
  await prisma.classifications.update({
    where: { id: classificationIdA2B },
    data: { contentClassifications: { deleteMany: {} } },
  });

  await prisma.classificationDescriptions.delete({
    where: {
      classificationId_subCategoryId: {
        classificationId: classificationIdA2A,
        subCategoryId: subCategoryIdA2,
      },
    },
  });
  await prisma.classifications.delete({ where: { id: classificationIdA2A } });
  await prisma.classificationDescriptions.delete({
    where: {
      classificationId_subCategoryId: {
        classificationId: classificationIdA2B,
        subCategoryId: subCategoryIdA2,
      },
    },
  });
  await prisma.classifications.delete({ where: { id: classificationIdA2B } });
  await prisma.classificationSubCategories.delete({
    where: { id: subCategoryIdA2 },
  });

  await prisma.classificationCategories.delete({ where: { id: categoryIdA } });

  // sub category B1
  await prisma.classifications.update({
    where: { id: classificationIdB1A },
    data: { contentClassifications: { deleteMany: {} } },
  });
  await prisma.classifications.update({
    where: { id: classificationIdB1B },
    data: { contentClassifications: { deleteMany: {} } },
  });

  await prisma.classificationDescriptions.delete({
    where: {
      classificationId_subCategoryId: {
        classificationId: classificationIdB1A,
        subCategoryId: subCategoryIdB1,
      },
    },
  });
  await prisma.classifications.delete({ where: { id: classificationIdB1A } });
  await prisma.classificationDescriptions.delete({
    where: {
      classificationId_subCategoryId: {
        classificationId: classificationIdB1B,
        subCategoryId: subCategoryIdB1,
      },
    },
  });
  await prisma.classifications.delete({ where: { id: classificationIdB1B } });
  await prisma.classificationSubCategories.delete({
    where: { id: subCategoryIdB1 },
  });

  // sub category B2
  await prisma.classifications.update({
    where: { id: classificationIdB2A },
    data: { contentClassifications: { deleteMany: {} } },
  });
  await prisma.classifications.update({
    where: { id: classificationIdB2B },
    data: { contentClassifications: { deleteMany: {} } },
  });

  await prisma.classificationDescriptions.delete({
    where: {
      classificationId_subCategoryId: {
        classificationId: classificationIdB2A,
        subCategoryId: subCategoryIdB2,
      },
    },
  });
  await prisma.classifications.delete({ where: { id: classificationIdB2A } });
  await prisma.classificationDescriptions.delete({
    where: {
      classificationId_subCategoryId: {
        classificationId: classificationIdB2B,
        subCategoryId: subCategoryIdB2,
      },
    },
  });
  await prisma.classifications.delete({ where: { id: classificationIdB2B } });
  await prisma.classificationSubCategories.delete({
    where: { id: subCategoryIdB2 },
  });

  await prisma.classificationCategories.delete({ where: { id: categoryIdB } });

  if (systemId) {
    await prisma.classificationSystems.delete({ where: { id: systemId } });
  }
}

export async function createTestCategory({
  word,
  code,
}: {
  word: string;
  code: string;
}) {
  const group = await prisma.categoryGroups.create({
    data: {
      name: `${word}${code} group`,
    },
  });
  const category = await prisma.categories.create({
    data: {
      groupId: group.id,
      code: `${word}${code}`,
      term: `${word}${code}`,
      description: `${word} ${code}`,
      sortIndex: 10,
    },
  });

  onTestFinished(() => deleteTestCategory(category.id));

  return category;
}

export async function deleteTestCategory(categoryId: number) {
  const { groupId } = await prisma.categories.findUniqueOrThrow({
    where: { id: categoryId },
    select: {
      groupId: true,
    },
  });

  const deleteCategory = prisma.categories.delete({
    where: { id: categoryId },
  });

  if (groupId) {
    const deleteGroup = prisma.categoryGroups.delete({
      where: { id: groupId },
    });
    await prisma.$transaction([deleteCategory, deleteGroup]);
  } else {
    await deleteCategory;
  }
}

/**
 * Creates a tree of content and returns the content ids.
 * Use the helper functions `doc()`, `pset()`, `qbank()`, and `fold()`.
 * Content ids are ordered in depth-first-search order of the tree.
 */
export async function setupTestContent(
  ownerId: Uint8Array,
  contents: Record<string, TestSetup>,
  parentId: Uint8Array | null = null,
) {
  const ids: Uint8Array[] = [];
  for (const name in contents) {
    const content = contents[name];
    const { contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: content.type,
      parentId,
    });
    await updateContent({
      contentId,
      name,
      source: content.source,
      loggedInUserId: ownerId,
    });

    const childrenIds = await setupTestContent(
      ownerId,
      content.children,
      contentId,
    );
    ids.push(contentId, ...childrenIds);
  }

  return ids;
}

type TestSetup = {
  type: ContentType;
  children: Record<string, TestSetup>;
  source?: string;
};

export function doc(source: string): TestSetup {
  return { type: "singleDoc", children: {}, source };
}
export function pset(children: Record<string, TestSetup>): TestSetup {
  return { type: "sequence", children };
}
export function qbank(children: Record<string, TestSetup>): TestSetup {
  return { type: "select", children };
}
export function fold(children: Record<string, TestSetup>): TestSetup {
  return { type: "folder", children };
}
