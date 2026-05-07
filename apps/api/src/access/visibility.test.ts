import { describe, expect, test } from "vitest";
import { createTestUser, fold, setupTestContent, doc } from "../test/utils";
import { updateVisibility } from "./visibility";
import { createContent } from "../query/activity";
import { createAssignment } from "../query/assign";
import { InvalidRequestError } from "../utils/error";
import { prisma } from "../model";
import { StatusCodes } from "http-status-codes";
import { DateTime } from "luxon";

describe("updateVisibility", () => {
  test("Owner can change visibility from private to public", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    const result = await updateVisibility({
      loggedInUserId: user.userId,
      contentId,
      visibility: "public",
    });

    expect(result.visibility).toBe("public");
  });

  test("Owner can change visibility from public to private", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    await updateVisibility({
      loggedInUserId: user.userId,
      contentId,
      visibility: "public",
    });

    const result = await updateVisibility({
      loggedInUserId: user.userId,
      contentId,
      visibility: "private",
    });

    expect(result.visibility).toBe("private");
  });

  test("Non-owner cannot change visibility", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();

    const { contentId } = await createContent({
      loggedInUserId: user1.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    try {
      await updateVisibility({
        loggedInUserId: user2.userId,
        contentId,
        visibility: "public",
      });
      expect.fail("Should have thrown permission error");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidRequestError);
      expect((e as InvalidRequestError).errorCode).toBe(StatusCodes.NOT_FOUND);
    }
  });

  test("Cannot change assignment visibility", async () => {
    const user = await createTestUser();

    // Create an assignment by setting isAssignmentRoot
    const { contentId: assignmentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    // Mark as assignment
    await prisma.content.update({
      where: { id: assignmentId },
      data: { isAssignmentRoot: true },
    });

    try {
      await updateVisibility({
        loggedInUserId: user.userId,
        contentId: assignmentId,
        visibility: "public",
      });
      expect.fail("Should have thrown assignment error");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidRequestError);
      expect((e as InvalidRequestError).message).toContain(
        "Assignment visibility",
      );
    }
  });

  test("Cannot change visibility of content within assignment", async () => {
    const user = await createTestUser();

    // Assignments are shallow, so assigned content sits directly under the root.
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

    // Create an assignment (copies the sequence and its direct children)
    const { assignmentId } = await createAssignment({
      contentId: sequenceId,
      loggedInUserId: user.userId,
      closedOn: DateTime.now().plus({ days: 1 }),
      destinationParentId: null,
    });

    const assignmentChild = await prisma.content.findFirstOrThrow({
      where: {
        isDeletedOn: null,
        ownerId: user.userId,
        parentId: assignmentId,
      },
      select: { id: true },
    });

    // Try to change visibility of the copied assignment child - should fail
    try {
      await updateVisibility({
        loggedInUserId: user.userId,
        contentId: assignmentChild.id,
        visibility: "public",
      });
      expect.fail("Should have thrown assignment content error");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidRequestError);
      expect((e as InvalidRequestError).message).toContain(
        "Assignment visibility",
      );
    }
  });

  test("Cannot make child less public than parent (private child in unlisted parent)", async () => {
    const user = await createTestUser();

    // Create a folder (will be unlisted)
    const { contentId: parentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "folder",
      parentId: null,
    });

    // Make parent unlisted
    await updateVisibility({
      loggedInUserId: user.userId,
      contentId: parentId,
      visibility: "unlisted",
    });

    // Create child document (default is private)
    const { contentId: childId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId,
    });

    // Try to keep child private - should fail
    try {
      await updateVisibility({
        loggedInUserId: user.userId,
        contentId: childId,
        visibility: "private",
      });
      expect.fail("Should have thrown hierarchy error");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidRequestError);
      expect((e as InvalidRequestError).message).toContain("less public");
    }
  });

  test("Can make child more public than parent", async () => {
    const user = await createTestUser();

    // Create a private folder
    const { contentId: parentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "folder",
      parentId: null,
    });

    // Create child document
    const { contentId: childId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId,
    });

    // Make child public (parent is private) - should succeed
    const result = await updateVisibility({
      loggedInUserId: user.userId,
      contentId: childId,
      visibility: "public",
    });

    expect(result.visibility).toBe("public");
  });

  test("Cascades visibility to descendants when making parent more public", async () => {
    const user = await createTestUser();

    // Create a structure: folder > subfolder > doc
    const [folderId, subfolderId, docId] = await setupTestContent(user.userId, {
      folder1: fold({
        subfolder1: fold({
          doc1: doc("<p>test</p>"),
        }),
      }),
    });

    // All start private
    const content = await prisma.content.findUniqueOrThrow({
      where: { id: folderId },
    });
    expect(content.visibility).toBe("private");

    // Make parent public - should cascade
    await updateVisibility({
      loggedInUserId: user.userId,
      contentId: folderId,
      visibility: "public",
    });

    // Check all descendants are now public
    const folder = await prisma.content.findUniqueOrThrow({
      where: { id: folderId },
    });
    expect(folder.visibility).toBe("public");

    const subfolder = await prisma.content.findUniqueOrThrow({
      where: { id: subfolderId },
    });
    expect(subfolder.visibility).toBe("public");

    const docContent = await prisma.content.findUniqueOrThrow({
      where: { id: docId },
    });
    expect(docContent.visibility).toBe("public");
  });

  test("Cascade excludes assignments", async () => {
    const user = await createTestUser();

    // Create folder with a document
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

    // Create assignment subtree as sibling
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

    // Mark as assignment
    await prisma.content.update({
      where: { id: assignmentId },
      data: { isAssignmentRoot: true },
    });

    // Make folder public
    await updateVisibility({
      loggedInUserId: user.userId,
      contentId: folderId,
      visibility: "public",
    });

    // Document should be public
    const docContent = await prisma.content.findUniqueOrThrow({
      where: { id: docId },
    });
    expect(docContent.visibility).toBe("public");

    // Assignment should still be private
    const assignment = await prisma.content.findUniqueOrThrow({
      where: { id: assignmentId },
    });
    expect(assignment.visibility).toBe("private");

    const assignmentChild = await prisma.content.findUniqueOrThrow({
      where: { id: assignmentChildId },
    });
    expect(assignmentChild.visibility).toBe("private");
  });

  test("Cascades when making parent less public (override children)", async () => {
    const user = await createTestUser();

    // Create folder with public document
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

    // Make both public
    await updateVisibility({
      loggedInUserId: user.userId,
      contentId: folderId,
      visibility: "public",
    });

    // Make folder private - should cascade and override children
    await updateVisibility({
      loggedInUserId: user.userId,
      contentId: folderId,
      visibility: "private",
    });

    // Folder is private
    const folder = await prisma.content.findUniqueOrThrow({
      where: { id: folderId },
    });
    expect(folder.visibility).toBe("private");

    // Document should also be private now (cascaded)
    const docContent = await prisma.content.findUniqueOrThrow({
      where: { id: docId },
    });
    expect(docContent.visibility).toBe("private");
  });

  test("Cascade excludes assignments when making parent less public", async () => {
    const user = await createTestUser();

    // Create folder with document and assignment
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
      contentType: "singleDoc",
      parentId: folderId,
    });

    // Mark as assignment
    await prisma.content.update({
      where: { id: assignmentId },
      data: { isAssignmentRoot: true },
    });

    // Make all public
    await updateVisibility({
      loggedInUserId: user.userId,
      contentId: folderId,
      visibility: "public",
    });

    // Make folder private
    await updateVisibility({
      loggedInUserId: user.userId,
      contentId: folderId,
      visibility: "private",
    });

    // Document should be private
    const doc = await prisma.content.findUniqueOrThrow({
      where: { id: docId },
    });
    expect(doc.visibility).toBe("private");

    // Assignment should still be private (unchanged)
    const assignment = await prisma.content.findUniqueOrThrow({
      where: { id: assignmentId },
    });
    expect(assignment.visibility).toBe("private");
  });

  test("Works with all content types", async () => {
    const user = await createTestUser();

    const types: Array<"singleDoc" | "sequence" | "select" | "folder"> = [
      "singleDoc",
      "sequence",
      "select",
      "folder",
    ];

    for (const contentType of types) {
      const { contentId } = await createContent({
        loggedInUserId: user.userId,
        contentType,
        parentId: null,
      });

      const result = await updateVisibility({
        loggedInUserId: user.userId,
        contentId,
        visibility: "public",
      });

      expect(result.visibility).toBe("public");
    }
  });

  test("Returns the requested visibility when the update is idempotent", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    // Set to public
    await updateVisibility({
      loggedInUserId: user.userId,
      contentId,
      visibility: "public",
    });

    // Set to public again - should just return current
    const result = await updateVisibility({
      loggedInUserId: user.userId,
      contentId,
      visibility: "public",
    });

    expect(result.visibility).toBe("public");
  });

  test("Rejects non-existent content", async () => {
    const user = await createTestUser();
    const fakeId = new Uint8Array(16);

    try {
      await updateVisibility({
        loggedInUserId: user.userId,
        contentId: fakeId,
        visibility: "public",
      });
      expect.fail("Should have thrown not found error");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidRequestError);
      expect((e as InvalidRequestError).errorCode).toBe(StatusCodes.NOT_FOUND);
    }
  });

  test("Response is AccessPolicy (only visibility, no Content properties)", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    const result = await updateVisibility({
      loggedInUserId: user.userId,
      contentId,
      visibility: "public",
    });

    // Verify response is AccessPolicy (only has visibility)
    expect(result).toEqual({ visibility: "public" });
    // Ensure no Content properties are present
    expect(Object.keys(result).sort()).toEqual(["visibility"]);
  });
});
