import { expect, test } from "vitest";
import { ClassificationCategoryTree } from "../types";
import { createTestUser } from "./utils";
import {
  addClassification,
  getClassificationCategories,
  getClassifications,
  removeClassification,
  searchPossibleClassifications,
} from "../query/classification";
import { createContent, updateContent } from "../query/activity";
import { setContentIsPublic } from "../query/share";
import { prisma } from "../model";

test("Content classifications can only be edited by activity owner", async () => {
  const { userId } = await createTestUser();
  const { userId: otherId } = await createTestUser();
  const classificationId = (
    await searchPossibleClassifications({ query: "K.CC.1" })
  )[0].id;

  const { contentId: contentId } = await createContent({
    loggedInUserId: userId,
    contentType: "singleDoc",
    parentId: null,
  });

  // Add
  await expect(() =>
    addClassification({
      contentId,
      classificationId: classificationId,
      loggedInUserId: otherId,
    }),
  ).rejects.toThrowError();
  await addClassification({
    contentId,
    classificationId: classificationId,
    loggedInUserId: userId,
  });
  {
    const classifications = await getClassifications({
      contentId,
      loggedInUserId: userId,
    });
    expect(classifications.length).toBe(1);
    expect(classifications[0]).toHaveProperty("code", "K.CC.1");
    expect(classifications[0]).toHaveProperty("id", classificationId);
  }

  // Remove
  await expect(() =>
    removeClassification({
      contentId,
      classificationId: classificationId,
      loggedInUserId: otherId,
    }),
  ).rejects.toThrowError();
  await removeClassification({
    contentId,
    classificationId: classificationId,
    loggedInUserId: userId,
  });
  {
    const classifications = await getClassifications({
      contentId,
      loggedInUserId: userId,
    });
    expect(classifications).toEqual([]);
  }
});

test("Get classifications of public activity", async () => {
  const classId1 = (await searchPossibleClassifications({ query: "K.CC.1" }))[0]
    .id;
  const classId2 = (
    await searchPossibleClassifications({ query: "8.2.1.5" })
  )[0].id;
  const { userId: ownerId } = await createTestUser();
  const { contentId: contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  await addClassification({
    contentId,
    classificationId: classId1,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId,
    classificationId: classId2,
    loggedInUserId: ownerId,
  });

  const { userId: viewerId } = await createTestUser();
  await expect(() =>
    getClassifications({ contentId, loggedInUserId: viewerId }),
  ).rejects.toThrowError("cannot be accessed");

  await updateContent({
    contentId,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId,
    loggedInUserId: ownerId,
    isPublic: true,
  });
  const classifications = await getClassifications({
    contentId,
    loggedInUserId: viewerId,
  });
  expect(classifications.length).toBe(2);
});

test("Get classification categories as tree", async () => {
  const results: ClassificationCategoryTree[] =
    await getClassificationCategories();
  expect(results.length).toBeGreaterThan(0);
  expect(results[0].categories.length).toBeGreaterThan(0);
  expect(results[0].categories[0].subCategories.length).toBeGreaterThan(0);
});

test("Have unique content classification code per system", async () => {
  const systems = await prisma.classificationSystems.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  for (const system of systems) {
    const codes = (
      await prisma.classifications.findMany({
        select: { code: true },
        where: {
          descriptions: {
            some: { subCategory: { category: { systemId: system.id } } },
          },
        },
      })
    ).map((c) => c.code);

    const uniqueCodes = [...new Set(codes)];

    expect(uniqueCodes.length).eq(
      codes.length,
      `Found non-unique codes in system ${system.name}`,
    );
  }
});

test("Search for content classifications, query alone", async () => {
  {
    // Code
    const results = await searchPossibleClassifications({ query: "CC.1" });
    // should be first entry
    expect(results[0].code).eq("Alg.CC.1");
  }
  {
    // Category
    const results = await searchPossibleClassifications({ query: "Kind" });
    expect(results.find((i) => i.code === "K.CC.1")).toBeDefined();
  }
  {
    // Sub Category
    const results = await searchPossibleClassifications({
      query: "nonlinear functions",
    });
    expect(results.find((i) => i.code === "8.2.1.5")).toBeDefined();
  }
  {
    // Description
    const results = await searchPossibleClassifications({ query: "exponents" });
    expect(results.find((i) => i.code === "A.SSE.3 c.")).toBeDefined();
  }
  {
    // System name
    const results = await searchPossibleClassifications({
      query: "coMMoN cOrE",
    });
    expect(results[0].descriptions[0].subCategory.category.system.name).eq(
      "Common Core Math",
    );
  }
  {
    // Combination of fields
    const results = await searchPossibleClassifications({
      query: "claps addition SUBTRACTION kindergarten operations",
    });
    expect(results[0].code).eq("K.OA.1");
  }
});

test("Search for content classifications, by category and system ids", async () => {
  const coins = (
    await searchPossibleClassifications({
      query: "1.3.2.3",
    })
  )[0];

  const measurementsId = coins?.descriptions[0].subCategory.id;
  const firstGradeId = coins?.descriptions[0].subCategory.category.id;
  const mnStandardsId = coins?.descriptions[0].subCategory.category.system.id;

  {
    // with no filter, finds everything, so gets first 100 entries
    // which will all be common core
    const results = await searchPossibleClassifications({});

    expect(results.length).eq(100);
    expect(
      results.find(
        (i) =>
          i.descriptions[0].subCategory.category.system.shortName == "MN Math",
      ),
    ).toBeUndefined();
  }

  {
    // Just system
    const results = await searchPossibleClassifications({
      systemId: mnStandardsId,
    });

    expect(results.length).eq(100);
    expect(
      results.find(
        (i) =>
          i.descriptions[0].subCategory.category.system.id === mnStandardsId,
      ),
    ).toBeDefined();
    expect(
      results.find(
        (i) =>
          i.descriptions[0].subCategory.category.system.id !== mnStandardsId,
      ),
    ).toBeUndefined();
    expect(
      results.find(
        (i) => i.descriptions[0].subCategory.category.id === firstGradeId,
      ),
    ).toBeDefined();
    expect(
      results.find(
        (i) => i.descriptions[0].subCategory.category.id !== firstGradeId,
      ),
    ).toBeDefined();
  }

  {
    // system and category
    const results = await searchPossibleClassifications({
      systemId: mnStandardsId,
      categoryId: firstGradeId,
    });

    expect(results.length).eq(20);
    expect(
      results.find(
        (i) =>
          i.descriptions[0].subCategory.category.system.id === mnStandardsId,
      ),
    ).toBeDefined();
    expect(
      results.find(
        (i) =>
          i.descriptions[0].subCategory.category.system.id !== mnStandardsId,
      ),
    ).toBeUndefined();
    expect(
      results.find(
        (i) => i.descriptions[0].subCategory.category.id === firstGradeId,
      ),
    ).toBeDefined();
    expect(
      results.find(
        (i) => i.descriptions[0].subCategory.category.id !== firstGradeId,
      ),
    ).toBeUndefined();
    expect(
      results.find((i) => i.descriptions[0].subCategory.id === measurementsId),
    ).toBeDefined();
    expect(
      results.find((i) => i.descriptions[0].subCategory.id !== measurementsId),
    ).toBeDefined();
  }

  {
    // system, category and subCategory
    const results = await searchPossibleClassifications({
      systemId: mnStandardsId,
      categoryId: firstGradeId,
      subCategoryId: measurementsId,
    });

    expect(results.length).eq(3);
    expect(
      results.find(
        (i) =>
          i.descriptions[0].subCategory.category.system.id === mnStandardsId,
      ),
    ).toBeDefined();
    expect(
      results.find(
        (i) =>
          i.descriptions[0].subCategory.category.system.id !== mnStandardsId,
      ),
    ).toBeUndefined();
    expect(
      results.find(
        (i) => i.descriptions[0].subCategory.category.id === firstGradeId,
      ),
    ).toBeDefined();
    expect(
      results.find(
        (i) => i.descriptions[0].subCategory.category.id !== firstGradeId,
      ),
    ).toBeUndefined();
    expect(
      results.find((i) => i.descriptions[0].subCategory.id === measurementsId),
    ).toBeDefined();
    expect(
      results.find((i) => i.descriptions[0].subCategory.id !== measurementsId),
    ).toBeUndefined();
  }
});

test("Search for content classifications, by query and by category and system ids", async () => {
  const coins = (
    await searchPossibleClassifications({
      query: "1.3.2.3",
    })
  )[0];

  const measurementsId = coins?.descriptions[0].subCategory.id;
  const firstGradeId = coins?.descriptions[0].subCategory.category.id;
  const mnStandardsId = coins?.descriptions[0].subCategory.category.system.id;

  {
    // system and query
    const results = await searchPossibleClassifications({
      query: "measurement",
      systemId: mnStandardsId,
    });

    for (const result of results) {
      expect(result.descriptions[0].subCategory.category.system.id).eq(
        mnStandardsId,
      );
      expect(
        result.descriptions[0].description.includes("measurement") ||
          result.descriptions[0].subCategory.subCategory.includes(
            "measurement",
          ),
      ).eq(true);
    }
  }

  {
    // system, category, and query
    const results = await searchPossibleClassifications({
      query: "model",
      systemId: mnStandardsId,
      categoryId: firstGradeId,
    });

    for (const result of results) {
      expect(result.descriptions[0].subCategory.category.id).eq(firstGradeId);
      expect(
        result.descriptions[0].description.includes("model") ||
          result.descriptions[0].subCategory.subCategory.includes("model"),
      ).eq(true);
    }
  }

  {
    // system, category, subcategory and query
    const results = await searchPossibleClassifications({
      query: "hour",
      systemId: mnStandardsId,
      categoryId: firstGradeId,
      subCategoryId: measurementsId,
    });

    expect(results.length).eq(1);
    expect(results[0].code).eq("1.3.2.2");
  }

  {
    // code matches on top
    const results = await searchPossibleClassifications({
      query: "2.3 number sense model coin",
      categoryId: firstGradeId,
    });

    expect(results.length).greaterThan(10);

    expect(results[0].code).eq("1.2.2.3"); // first is number sense 2.3 category
    expect(results[1].code).eq("1.3.2.3"); // second is coin 2.3 category
    expect(results[2].code).eq("1.1.2.3"); // third is remaining 2.3 category from first grade
  }
});

test("Search classifications has correct primary description", async () => {
  const classification = (
    await searchPossibleClassifications({ query: "Trig.PC.1" })
  )[0];

  expect(classification.descriptions[0].subCategory.category.category).eq(
    "Trigonometry",
  );
  expect(classification.descriptions[0].subCategory.category.system.name).eq(
    "High school and college math",
  );
});

test("Classifications show as primary, sorted by primary", async () => {
  const { userId } = await createTestUser();
  const { contentId: contentId } = await createContent({
    loggedInUserId: userId,
    contentType: "singleDoc",
    parentId: null,
  });

  const multivarClassificationId = (
    await searchPossibleClassifications({ query: "CalcMV.CV.1" })
  )[0].id;

  const algebraClassificationId = (
    await searchPossibleClassifications({ query: "Alg.FN.1" })
  )[0].id;

  const trigPolarClassificationId = (
    await searchPossibleClassifications({ query: "Trig.PC.1" })
  )[0].id;

  const diffEqClassificationId = (
    await searchPossibleClassifications({ query: "DiffEq.IC.1" })
  )[0].id;

  await addClassification({
    contentId,
    classificationId: diffEqClassificationId,
    loggedInUserId: userId,
  });
  await addClassification({
    contentId,
    classificationId: trigPolarClassificationId,
    loggedInUserId: userId,
  });
  await addClassification({
    contentId,
    classificationId: multivarClassificationId,
    loggedInUserId: userId,
  });
  await addClassification({
    contentId,
    classificationId: algebraClassificationId,
    loggedInUserId: userId,
  });

  const classifications = await getClassifications({
    contentId,
    loggedInUserId: userId,
  });
  expect(classifications[0].code).eq("CalcMV.CV.1");
  expect(classifications[1].code).eq("Alg.FN.1");
  expect(classifications[2].code).eq("Trig.PC.1");
  expect(classifications[3].code).eq("DiffEq.IC.1");

  expect(classifications[1].descriptions[0].subCategory.category.category).eq(
    "Algebra",
  );
  expect(
    classifications[1].descriptions[0].subCategory.category.system.name,
  ).eq("High school and college math");

  expect(classifications[2].descriptions[0].subCategory.category.category).eq(
    "Trigonometry",
  );
  expect(
    classifications[2].descriptions[0].subCategory.category.system.name,
  ).eq("High school and college math");
});
