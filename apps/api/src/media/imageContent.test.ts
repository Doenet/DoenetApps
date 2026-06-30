import { describe, expect, test } from "vitest";
import { prisma } from "../model";
import { createContent } from "../query/activity";
import { setContentLicense } from "../query/license";
import { setContentIsPublic, shareContentWithEmail } from "../query/share";
import { createTestUser } from "../test/utils";
import { InvalidRequestError } from "../utils/error";
import {
  createImageContent,
  deleteImageContent,
  findViewableImage,
  setImageStorageKey,
} from "./imageContent";

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
      imageWidth: true,
      imageHeight: true,
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
      imageWidth: 100,
      imageHeight: 80,
    });

    const row = await getContent(contentId);
    expect(row.type).toBe("image");
    expect(row.ownerId).toEqual(owner.userId);
    expect(row.parentId).toBeNull();
    expect(row.name).toBe("donut.png");
    expect(row.mimeType).toBe("image/png");
    expect(row.sizeBytes).toBe(1024n);
    expect(row.imageWidth).toBe(100);
    expect(row.imageHeight).toBe(80);
    expect(row.storageKey).toBeNull();
    expect(row.isPublic).toBe(false);
    expect(row.visibility).toBe("private");
    expect(row.courseRootId).toBeNull();
    expect(row.sharedWith).toEqual([]);
  });

  test("inherits public visibility and license from a public parent", async () => {
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
      imageWidth: 1,
      imageHeight: 1,
    });

    const row = await getContent(contentId);
    expect(row.isPublic).toBe(true);
    expect(row.visibility).toBe("public");
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
      imageWidth: 1,
      imageHeight: 1,
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
      imageWidth: 1,
      imageHeight: 1,
    });

    const row = await getContent(contentId);
    expect(row.courseRootId).toEqual(folderId);
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
        imageWidth: 1,
        imageHeight: 1,
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
        imageWidth: 1,
        imageHeight: 1,
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
      imageWidth: 1,
      imageHeight: 1,
    });

    await expect(
      createImageContent({
        loggedInUserId: owner.userId,
        parentId: parentImageId,
        name: "child.png",
        mimeType: "image/png",
        sizeBytes: 1,
        imageWidth: 1,
        imageHeight: 1,
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
        imageWidth: 1,
        imageHeight: 1,
      }),
    ).rejects.toThrow();
  });
});

describe("setImageStorageKey", () => {
  test("updates the storage key for the owner's image", async () => {
    const owner = await createTestUser();
    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: null,
      name: "x.png",
      mimeType: "image/png",
      sizeBytes: 1,
      imageWidth: 1,
      imageHeight: 1,
    });

    await setImageStorageKey({
      contentId,
      ownerId: owner.userId,
      storageKey: "images/abc.png",
    });

    const row = await getContent(contentId);
    expect(row.storageKey).toBe("images/abc.png");
  });

  test("refuses to update another user's image", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: null,
      name: "x.png",
      mimeType: "image/png",
      sizeBytes: 1,
      imageWidth: 1,
      imageHeight: 1,
    });

    await expect(
      setImageStorageKey({
        contentId,
        ownerId: stranger.userId,
        storageKey: "evil",
      }),
    ).rejects.toThrow();

    const row = await getContent(contentId);
    expect(row.storageKey).toBeNull();
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
      imageWidth: 1,
      imageHeight: 1,
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
      imageWidth: 1,
      imageHeight: 1,
    });

    await expect(
      deleteImageContent({ contentId, ownerId: stranger.userId }),
    ).rejects.toThrow();

    const row = await prisma.content.findUnique({ where: { id: contentId } });
    expect(row).not.toBeNull();
  });
});

describe("findViewableImage", () => {
  async function makeReadyImage(ownerId: Uint8Array) {
    const { contentId } = await createImageContent({
      loggedInUserId: ownerId,
      parentId: null,
      name: "x.png",
      mimeType: "image/png",
      sizeBytes: 42,
      imageWidth: 4,
      imageHeight: 4,
    });
    await setImageStorageKey({
      contentId,
      ownerId,
      storageKey: "images/x.png",
    });
    return contentId;
  }

  test("returns serving metadata when the owner views their ready image", async () => {
    const owner = await createTestUser();
    const contentId = await makeReadyImage(owner.userId);

    const result = await findViewableImage({
      contentId,
      loggedInUserId: owner.userId,
    });
    expect(result).toEqual({
      storageKey: "images/x.png",
      mimeType: "image/png",
      sizeBytes: 42n,
      visibility: "private",
    });
  });

  test("returns visibility=public when the image is public", async () => {
    const owner = await createTestUser();
    const contentId = await makeReadyImage(owner.userId);
    await prisma.content.update({
      where: { id: contentId },
      data: { visibility: "public", isPublic: true },
    });

    const result = await findViewableImage({ contentId });
    expect(result?.visibility).toBe("public");
  });

  test("returns visibility=unlisted when the image is unlisted", async () => {
    const owner = await createTestUser();
    const contentId = await makeReadyImage(owner.userId);
    await prisma.content.update({
      where: { id: contentId },
      data: { visibility: "unlisted" },
    });

    const result = await findViewableImage({ contentId });
    expect(result?.visibility).toBe("unlisted");
  });

  test("returns null when a stranger views a private image", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const contentId = await makeReadyImage(owner.userId);

    expect(
      await findViewableImage({
        contentId,
        loggedInUserId: stranger.userId,
      }),
    ).toBeNull();
  });

  test("returns null for an anonymous viewer on a private image", async () => {
    const owner = await createTestUser();
    const contentId = await makeReadyImage(owner.userId);

    expect(await findViewableImage({ contentId })).toBeNull();
  });

  test("returns metadata for an anonymous viewer on a public image", async () => {
    const owner = await createTestUser();
    const contentId = await makeReadyImage(owner.userId);
    await prisma.content.update({
      where: { id: contentId },
      data: { visibility: "public", isPublic: true },
    });

    const result = await findViewableImage({ contentId });
    expect(result?.storageKey).toBe("images/x.png");
  });

  test("returns null when the row has no storage key yet", async () => {
    const owner = await createTestUser();
    const { contentId } = await createImageContent({
      loggedInUserId: owner.userId,
      parentId: null,
      name: "x.png",
      mimeType: "image/png",
      sizeBytes: 1,
      imageWidth: 1,
      imageHeight: 1,
    });
    // Note: no setImageStorageKey — simulates the brief window between row
    // insert and storage PUT.

    expect(
      await findViewableImage({
        contentId,
        loggedInUserId: owner.userId,
      }),
    ).toBeNull();
  });

  test("returns null when the content is not type=image", async () => {
    const owner = await createTestUser();
    const contentId = await makeReadyImage(owner.userId);
    await prisma.content.update({
      where: { id: contentId },
      data: { type: "folder" },
    });

    expect(
      await findViewableImage({
        contentId,
        loggedInUserId: owner.userId,
      }),
    ).toBeNull();
  });

  test("returns null when the content has been soft-deleted", async () => {
    const owner = await createTestUser();
    const contentId = await makeReadyImage(owner.userId);
    await prisma.content.update({
      where: { id: contentId },
      data: { isDeletedOn: new Date() },
    });

    expect(
      await findViewableImage({
        contentId,
        loggedInUserId: owner.userId,
      }),
    ).toBeNull();
  });
});
