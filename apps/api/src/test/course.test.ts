import { describe, expect, test } from "vitest";
import { createTestUser, doc, fold, pset, setupTestContent } from "./utils";
import { markFolderAsCourse } from "../query/course";
import { prisma } from "../model";

describe("markFolderAsCourse()", () => {
  test("create course from empty folder", async () => {
    const { userId } = await createTestUser();
    const [folderId] = await setupTestContent(userId, { "folder 1": fold({}) });

    const { classCode } = await markFolderAsCourse({
      loggedInUserId: userId,
      folderId,
    });
    expect(Number.isInteger(classCode)).toBe(true);

    const course = await prisma.content.findUniqueOrThrow({
      where: { id: folderId },
      select: {
        courseRootId: true,
        classCode: true,
        courseContent: { select: { id: true, courseRootId: true } },
      },
    });
    expect(course.courseRootId).toEqual(folderId);
    expect(course.classCode).toEqual(classCode);
    expect(course.courseContent).eqls([
      { id: folderId, courseRootId: folderId },
    ]);
  });

  test("create course from folder with content", async () => {
    const { userId } = await createTestUser();
    const allIds = await setupTestContent(userId, {
      "course folder": fold({
        "outer doc": doc(""),
        "sub folder": fold({
          "problem set": pset({
            "inner doc": doc(""),
          }),
        }),
      }),
    });
    const courseFolderId = allIds[0];

    const { classCode } = await markFolderAsCourse({
      loggedInUserId: userId,
      folderId: courseFolderId,
    });
    expect(Number.isInteger(classCode)).toBe(true);

    const course = await prisma.content.findUniqueOrThrow({
      where: { id: courseFolderId },
      select: {
        courseRootId: true,
        classCode: true,
        courseContent: { select: { id: true, courseRootId: true } },
      },
    });
    expect(course.courseRootId).toEqual(courseFolderId);
    expect(course.classCode).toEqual(classCode);

    // TODO: These don't necessarily need to match in order
    // So if it breaks, make this test more robust
    expect(course.courseContent).eqls(
      allIds.map((id) => ({
        id,
        courseRootId: courseFolderId,
      })),
    );
  });

  test("cannot create course inside course", async () => {
    const { userId } = await createTestUser();
    const [courseFolderId, innerFolderId] = await setupTestContent(userId, {
      "course folder": fold({
        "inner folder": fold({}),
      }),
    });

    await markFolderAsCourse({
      loggedInUserId: userId,
      folderId: courseFolderId,
    });
    await expect(
      markFolderAsCourse({
        loggedInUserId: userId,
        folderId: innerFolderId,
      }),
    ).rejects.toThrow("already part of a course");
  });

  test("cannot create course that contains course", async () => {
    const { userId } = await createTestUser();
    const [outerFolderId, courseFolderId] = await setupTestContent(userId, {
      "outer folder": fold({
        "course folder": fold({}),
      }),
    });

    await markFolderAsCourse({
      loggedInUserId: userId,
      folderId: courseFolderId,
    });
    await expect(
      markFolderAsCourse({
        loggedInUserId: userId,
        folderId: outerFolderId,
      }),
    ).rejects.toThrow("subfolder is already a course");
  });
});
