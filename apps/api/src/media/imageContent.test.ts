import { describe, expect, test } from "vitest";
import { prisma } from "../model";
import { createContent } from "../query/activity";
import { setContentLicense } from "../query/license";
import { setContentIsPublic, shareContentWithEmail } from "../query/share";
import { createTestUser } from "../test/utils";
import { InvalidRequestError } from "../utils/error";
import { createImageContent, deleteImageContent } from "./imageContent";

async function getContent(contentId: Uint8Array) {
  return prisma.content.findUniqueOrThrow({
    where: { id: contentId },
    select: {
      type: true,
      ownerId: true,
      parentId: true,
      name: true,
      isPublic: true,
      visibility: true,
      licenseCode: true,
      courseRootId: true,
      mimeType: true,
      sizeBytes: true,
      storageKey: true,
      sharedWith: { select: { userId: true } },
    },
  });
}

describe("createImageContent", () => {
  test("creates an image row at root with the expected metadata", async () => {
    const owner = await createTestUser();
    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: null,
      name: "donut.png",
      mimeType: "image/png",
      sizeBytes: 1024,
    });

    const row = await getContent(contentId);
    expect(row.type).toBe("image");
    expect(row.ownerId).toEqual(owner.userId);
    expect(row.parentId).toBeNull();
    expect(row.name).toBe("donut.png");
    expect(row.mimeType).toBe("image/png");
    expect(row.sizeBytes).toBe(1024n);
    expect(row.storageKey).toBeNull();
    expect(row.isPublic).toBe(false);
    expect(row.visibility).toBe("unlisted");
    expect(row.courseRootId).toBeNull();
    expect(row.sharedWith).toEqual([]);
  });

  test("stays unlisted under a private parent, regardless of the parent's visibility", async () => {
    const owner = await createTestUser();
    const { contentId: folderId } = await createContent({
      loggedInUserId: owner.userId,
      contentType: "folder",
      parentId: null,
    });

    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: folderId,
      name: "in-private.png",
      mimeType: "image/png",
      sizeBytes: 1,
    });

    const row = await getContent(contentId);
    expect(row.isPublic).toBe(false);
    expect(row.visibility).toBe("unlisted");
  });

  test("is unlisted under a public parent but still inherits license", async () => {
    const owner = await createTestUser();
    const { contentId: folderId } = await createContent({
      loggedInUserId: owner.userId,
      contentType: "folder",
      parentId: null,
    });
    await setContentLicense({
      contentId: folderId,
      loggedInUserId: owner.userId,
      licenseCode: "CCBYSA",
    });
    await setContentIsPublic({
      contentId: folderId,
      isPublic: true,
      loggedInUserId: owner.userId,
    });

    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: folderId,
      name: "in-public.png",
      mimeType: "image/png",
      sizeBytes: 1,
    });

    const row = await getContent(contentId);
    expect(row.isPublic).toBe(false);
    expect(row.visibility).toBe("unlisted");
    expect(row.licenseCode).toBe("CCBYSA");
  });

  test("inherits sharedWith from a shared parent", async () => {
    const owner = await createTestUser();
    const friend = await createTestUser();
    if (!friend.email) throw new Error("friend should have email");

    const { contentId: folderId } = await createContent({
      loggedInUserId: owner.userId,
      contentType: "folder",
      parentId: null,
    });
    await shareContentWithEmail({
      contentId: folderId,
      loggedInUserId: owner.userId,
      email: friend.email,
    });

    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: folderId,
      name: "shared.png",
      mimeType: "image/png",
      sizeBytes: 1,
    });

    const row = await getContent(contentId);
    expect(row.sharedWith).toEqual([{ userId: friend.userId }]);
  });

  test("inherits courseRootId from the parent", async () => {
    const owner = await createTestUser();
    const { contentId: folderId } = await createContent({
      loggedInUserId: owner.userId,
      contentType: "folder",
      parentId: null,
    });
    // Mark the folder itself as the course root.
    await prisma.content.update({
      where: { id: folderId },
      data: { courseRootId: folderId },
    });

    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: folderId,
      name: "in-course.png",
      mimeType: "image/png",
      sizeBytes: 1,
    });

    const row = await getContent(contentId);
    expect(row.courseRootId).toEqual(folderId);
  });

  test("rejects upload directly into a problem set (sequence)", async () => {
    const owner = await createTestUser();
    const { contentId: psetId } = await createContent({
      loggedInUserId: owner.userId,
      contentType: "sequence",
      parentId: null,
    });

    await expect(
      createImageContent({
        loggedInUserId: owner.userId,
        parentId: psetId,
        name: "nope.png",
        mimeType: "image/png",
        sizeBytes: 1,
      }),
    ).rejects.toThrow("Cannot upload an image into a problem set");
  });

  test("rejects upload under an assigned activity", async () => {
    const owner = await createTestUser();
    const { contentId: psetId } = await createContent({
      loggedInUserId: owner.userId,
      contentType: "sequence",
      parentId: null,
    });
    // Mark the sequence as an assignment root — same trigger
    // prepareNewChild checks against.
    await prisma.content.update({
      where: { id: psetId },
      data: { isAssignmentRoot: true },
    });

    await expect(
      createImageContent({
        loggedInUserId: owner.userId,
        parentId: psetId,
        name: "nope.png",
        mimeType: "image/png",
        sizeBytes: 1,
      }),
    ).rejects.toBeInstanceOf(InvalidRequestError);
  });

  test("rejects when parent is a singleDoc (docs are leaves, not containers)", async () => {
    const owner = await createTestUser();
    const { contentId: docId } = await createContent({
      loggedInUserId: owner.userId,
      contentType: "singleDoc",
      parentId: null,
    });

    await expect(
      createImageContent({
        loggedInUserId: owner.userId,
        parentId: docId,
        name: "child.png",
        mimeType: "image/png",
        sizeBytes: 1,
      }),
    ).rejects.toThrow();
  });

  test("rejects when parent is an image (images are leaves, not containers)", async () => {
    const owner = await createTestUser();
    const { contentId: parentImageId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: null,
      name: "parent.png",
      mimeType: "image/png",
      sizeBytes: 1,
    });

    await expect(
      createImageContent({
        loggedInUserId: owner.userId,
        parentId: parentImageId,
        name: "child.png",
        mimeType: "image/png",
        sizeBytes: 1,
      }),
    ).rejects.toThrow();
  });

  test("rejects when parent belongs to a different owner", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const { contentId: theirFolder } = await createContent({
      loggedInUserId: stranger.userId,
      contentType: "folder",
      parentId: null,
    });

    await expect(
      createImageContent({
        loggedInUserId: owner.userId,
        parentId: theirFolder,
        name: "trespass.png",
        mimeType: "image/png",
        sizeBytes: 1,
      }),
    ).rejects.toThrow();
  });
});

describe("createImageContent with storageKey", () => {
  test("persists the supplied storageKey", async () => {
    const owner = await createTestUser();
    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: null,
      name: "x.png",
      mimeType: "image/png",
      sizeBytes: 1,
      storageKey: "images/abc.png",
    });

    const row = await getContent(contentId);
    expect(row.storageKey).toBe("images/abc.png");
  });
});

describe("deleteImageContent", () => {
  test("deletes the owner's image row", async () => {
    const owner = await createTestUser();
    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: null,
      name: "x.png",
      mimeType: "image/png",
      sizeBytes: 1,
    });

    await deleteImageContent({ contentId, ownerId: owner.userId });

    const row = await prisma.content.findUnique({ where: { id: contentId } });
    expect(row).toBeNull();
  });

  test("refuses to delete another user's image", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: null,
      name: "x.png",
      mimeType: "image/png",
      sizeBytes: 1,
    });

    await expect(
      deleteImageContent({ contentId, ownerId: stranger.userId }),
    ).rejects.toThrow();

    const row = await prisma.content.findUnique({ where: { id: contentId } });
    expect(row).not.toBeNull();
  });
});
