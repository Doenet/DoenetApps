import { describe, expect, test } from "vitest";
import { updateContentAudit } from "../content-audit";
import { createContent } from "../query/activity";
import { getEditorShareStatus } from "../query/editor";
import { createTestUser } from "../test/utils";
import { prisma } from "../model";
import { InvalidRequestError } from "../utils/error";
import { StatusCodes } from "http-status-codes";
import { updateVisibility } from "./visibility";

async function expectInvalidRequest(promise: Promise<unknown>) {
  try {
    await promise;
    expect.fail("Expected InvalidRequestError");
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidRequestError);
    return error as InvalidRequestError;
  }
}

async function connectRequiredCategories(contentId: Uint8Array) {
  const groups = await prisma.categoryGroups.findMany({
    where: { isRequired: true },
    select: {
      categories: {
        select: { code: true },
        orderBy: { sortIndex: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });

  const categories = groups.map((group) => {
    const [category] = group.categories;
    if (!category) {
      throw new Error("Required category group is missing seeded categories");
    }
    return { code: category.code };
  });

  await prisma.content.update({
    where: { id: contentId },
    data: { categories: { connect: categories } },
  });
}

async function makeDocumentPubliclyShareable({
  contentId,
  userId,
}: {
  contentId: Uint8Array;
  userId: Uint8Array;
}) {
  await connectRequiredCategories(contentId);
  const { source, doenetmlVersionId } = await prisma.content.findUniqueOrThrow({
    where: { id: contentId },
    select: { source: true, doenetmlVersionId: true },
  });

  await updateContentAudit({
    contentId,
    loggedInUserId: userId,
    source: source ?? "",
    doenetmlVersionId,
    errorsCheckPasses: true,
    accessibilityCheckPasses: true,
  });
}

async function getVisibilityState(contentId: Uint8Array) {
  return prisma.content.findUniqueOrThrow({
    where: { id: contentId },
    select: {
      visibility: true,
      isPublic: true,
      publiclySharedAt: true,
    },
  });
}

describe("updateVisibility", () => {
  test("allows owners to make eligible documents public", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    await makeDocumentPubliclyShareable({
      contentId,
      userId: user.userId,
    });

    const result = await updateVisibility({
      loggedInUserId: user.userId,
      contentId,
      visibility: "public",
    });

    expect(result).toEqual({ visibility: "public" });

    const content = await getVisibilityState(contentId);
    expect(content.visibility).toBe("public");
    expect(content.isPublic).toBe(true);
    expect(content.publiclySharedAt).toBeInstanceOf(Date);
  });

  test("blocks public sharing until categories and diagnostics are satisfied", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    const error = await expectInvalidRequest(
      updateVisibility({
        loggedInUserId: user.userId,
        contentId,
        visibility: "public",
      }),
    );

    expect(error.message).toContain("required categories are filled out");
    expect(error.message).toContain("documents have no errors");
    expect(error.message).toContain(
      "documents have no level 1 accessibility violations",
    );
  });

  test("reports pending diagnostics for new blank documents", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    const status = await getEditorShareStatus({
      contentId,
      loggedInUserId: user.userId,
    });

    expect(status.canSharePublicly).toBe(false);
    expect(status.publicShareIssues).toContain("errorsCheckPending");
    expect(status.publicShareIssues).toContain("accessibilityCheckPending");
    expect(status.publicShareIssues).not.toContain("errorsCheck");
    expect(status.publicShareIssues).not.toContain("accessibilityCheck");
  });

  test("reports folders as not publicly shareable", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "folder",
      parentId: null,
    });

    const status = await getEditorShareStatus({
      contentId,
      loggedInUserId: user.userId,
    });

    expect(status.canSharePublicly).toBe(false);
  });

  test("treats trashed content as not found", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    await prisma.content.update({
      where: { id: contentId },
      data: { isDeletedOn: new Date() },
    });

    const error = await expectInvalidRequest(
      updateVisibility({
        loggedInUserId: user.userId,
        contentId,
        visibility: "unlisted",
      }),
    );

    expect(error.errorCode).toBe(StatusCodes.NOT_FOUND);
    expect(error.message).toBe("Content not found");
  });

  test("checks descendant diagnostics before allowing public sharing", async () => {
    const user = await createTestUser();
    const { contentId: sequenceId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "sequence",
      parentId: null,
    });

    await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: sequenceId,
    });

    await connectRequiredCategories(sequenceId);

    const error = await expectInvalidRequest(
      updateVisibility({
        loggedInUserId: user.userId,
        contentId: sequenceId,
        visibility: "public",
      }),
    );

    expect(error.message).not.toContain("required categories are filled out");
    expect(error.message).toContain("documents have no errors");
    expect(error.message).toContain(
      "documents have no level 1 accessibility violations",
    );
  });

  test("rejects publicly sharing folders", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "folder",
      parentId: null,
    });

    const error = await expectInvalidRequest(
      updateVisibility({
        loggedInUserId: user.userId,
        contentId,
        visibility: "public",
      }),
    );

    expect(error.message).toContain("not yet implemented");
  });

  test("does not allow a child to become less public than its parent", async () => {
    const user = await createTestUser();
    const { contentId: parentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "folder",
      parentId: null,
    });

    await updateVisibility({
      loggedInUserId: user.userId,
      contentId: parentId,
      visibility: "unlisted",
    });

    const { contentId: childId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId,
    });

    const error = await expectInvalidRequest(
      updateVisibility({
        loggedInUserId: user.userId,
        contentId: childId,
        visibility: "private",
      }),
    );

    expect(error.message).toContain("less public");
  });

  test("cascades unlisted visibility while excluding assignment content", async () => {
    const user = await createTestUser();
    const { contentId: folderId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "folder",
      parentId: null,
    });

    const { contentId: docId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: folderId,
    });

    const { contentId: assignmentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "sequence",
      parentId: folderId,
    });

    const { contentId: assignmentChildId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: assignmentId,
    });

    await prisma.content.update({
      where: { id: assignmentId },
      data: { isAssignmentRoot: true },
    });

    await updateVisibility({
      loggedInUserId: user.userId,
      contentId: folderId,
      visibility: "unlisted",
    });

    const [folder, doc, assignment, assignmentChild] = await Promise.all([
      prisma.content.findUniqueOrThrow({ where: { id: folderId } }),
      prisma.content.findUniqueOrThrow({ where: { id: docId } }),
      prisma.content.findUniqueOrThrow({ where: { id: assignmentId } }),
      prisma.content.findUniqueOrThrow({ where: { id: assignmentChildId } }),
    ]);

    expect(folder.visibility).toBe("unlisted");
    expect(doc.visibility).toBe("unlisted");
    expect(assignment.visibility).toBe("private");
    expect(assignmentChild.visibility).toBe("private");
  });

  test("clears the public timestamp when content becomes unlisted again", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    await makeDocumentPubliclyShareable({
      contentId,
      userId: user.userId,
    });

    await updateVisibility({
      loggedInUserId: user.userId,
      contentId,
      visibility: "public",
    });

    const publicState = await getVisibilityState(contentId);
    expect(publicState.publiclySharedAt).toBeInstanceOf(Date);

    const result = await updateVisibility({
      loggedInUserId: user.userId,
      contentId,
      visibility: "unlisted",
    });

    expect(result).toEqual({ visibility: "unlisted" });

    const unlistedState = await getVisibilityState(contentId);
    expect(unlistedState.visibility).toBe("unlisted");
    expect(unlistedState.isPublic).toBe(false);
    expect(unlistedState.publiclySharedAt).toBeNull();
  });

  test("rejects non-owner visibility changes with a not found error", async () => {
    const owner = await createTestUser();
    const otherUser = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: owner.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    const error = await expectInvalidRequest(
      updateVisibility({
        loggedInUserId: otherUser.userId,
        contentId,
        visibility: "unlisted",
      }),
    );

    expect(error.errorCode).toBe(StatusCodes.NOT_FOUND);
  });

  test("rejects changing assignment visibility", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    await prisma.content.update({
      where: { id: contentId },
      data: { isAssignmentRoot: true },
    });

    const error = await expectInvalidRequest(
      updateVisibility({
        loggedInUserId: user.userId,
        contentId,
        visibility: "unlisted",
      }),
    );

    expect(error.message).toContain("Assignment visibility");
  });
});
