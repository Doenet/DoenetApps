import { describe, expect, test } from "vitest";
import { createContent } from "../query/activity";
import { prisma } from "../model";
import { createTestUser } from "../test/utils";
import { getAllCategories, selectCategoryFields } from "./categories";

async function getSeededGroup(name: string) {
  const group = await prisma.categoryGroups.findUnique({
    where: { name },
    select: {
      categories: {
        select: {
          code: true,
          term: true,
          description: true,
        },
        orderBy: { sortIndex: "asc" },
      },
    },
  });

  if (!group) {
    throw new Error(`Missing seeded category group: ${name}`);
  }

  return group;
}

describe("categories", () => {
  test("selectCategoryFields returns attached category metadata", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    const scopeGroup = await getSeededGroup("Scope");
    const modeGroup = await getSeededGroup("Mode");

    const [scopeCategory, modeCategory] = [
      scopeGroup.categories[0],
      modeGroup.categories[0],
    ];

    if (!scopeCategory || !modeCategory) {
      throw new Error("Expected seeded categories in Scope and Mode groups");
    }

    await prisma.content.update({
      where: { id: contentId },
      data: {
        categories: {
          connect: [{ code: scopeCategory.code }, { code: modeCategory.code }],
        },
      },
    });

    const { categories } = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: selectCategoryFields,
    });

    expect(categories.toSorted((a, b) => a.code.localeCompare(b.code))).toEqual(
      [modeCategory, scopeCategory].toSorted((a, b) =>
        a.code.localeCompare(b.code),
      ),
    );
  });

  test("getAllCategories returns seeded groups with expected flags and sort order", async () => {
    const { allCategories } = await getAllCategories();

    const scope = allCategories.find((group) => group.name === "Scope");
    const mode = allCategories.find((group) => group.name === "Mode");
    const duration = allCategories.find((group) => group.name === "Duration");

    if (!scope || !mode || !duration) {
      throw new Error(
        "Expected seeded Scope, Mode, and Duration category groups",
      );
    }

    expect(scope).toMatchObject({
      isRequired: true,
      isExclusive: true,
    });
    expect(scope.categories.map((category) => category.code)).toEqual([
      "isWidget",
      "isProblemSet",
      "isQuestion",
    ]);

    expect(mode).toMatchObject({
      isRequired: true,
      isExclusive: false,
    });
    expect(
      mode.categories.slice(0, 3).map((category) => category.code),
    ).toEqual(["isPreview", "isPractice", "isAssessment"]);

    expect(duration).toMatchObject({
      isRequired: true,
      isExclusive: true,
    });
    expect(duration.categories[0]?.code).toBe("takesLessThanFiveMinutes");
  });
});
