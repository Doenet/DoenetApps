import { prisma } from "../model";
import { prepareNewChild } from "../content-tree";
import { InvalidRequestError } from "../utils/error";
import { filterViewableContent } from "../utils/permissions";

/**
 * Whether a user is in the early-access cohort for image uploads. The image
 * feature is gated while it's experimental — see
 * `apps/api/scripts/enable-image-upload.ts` for the admin grant.
 */
export async function canUserUploadImages(
  userId: Uint8Array,
): Promise<boolean> {
  const row = await prisma.users.findUnique({
    where: { userId },
    select: { canUploadImages: true },
  });
  return row?.canUploadImages ?? false;
}

/**
 * Creates a new image content row in `parentId` of `loggedInUserId`'s tree.
 * Inherits share / license / course context from the parent via
 * `prepareNewChild`, but visibility is always `unlisted` regardless of the
 * parent — images are inline assets that should be link-reachable but never
 * surface in search/explore. The id is auto-generated; the storage key is
 * set later by `setImageStorageKey` once the bytes land in storage.
 */
export async function createImageContent({
  loggedInUserId,
  parentId,
  name,
  mimeType,
  sizeBytes,
  imageWidth,
  imageHeight,
}: {
  loggedInUserId: Uint8Array;
  parentId: Uint8Array | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  imageWidth: number;
  imageHeight: number;
}) {
  const ownerId = loggedInUserId;
  const { sortIndex, parentType, licenseCode, sharedWith, courseRootId } =
    await prepareNewChild({ ownerId, parentId });

  if (parentType === "sequence") {
    throw new InvalidRequestError("Cannot upload an image into a problem set");
  }

  const content = await prisma.content.create({
    data: {
      ownerId,
      type: "image",
      parentId,
      name,
      isPublic: false,
      visibility: "unlisted",
      licenseCode,
      sortIndex,
      courseRootId,
      mimeType,
      sizeBytes: BigInt(sizeBytes),
      imageWidth,
      imageHeight,
      sharedWith: {
        createMany: { data: sharedWith.map((userId) => ({ userId })) },
      },
    },
  });

  return {
    contentId: content.id,
    name: content.name,
    contentType: content.type,
  };
}

/**
 * Records the opaque storage key for an image row. The key is whatever the
 * storage adapter (currently `s3.ts`) uses to address the bytes — this layer
 * does not care.
 */
export async function setImageStorageKey({
  contentId,
  ownerId,
  storageKey,
}: {
  contentId: Uint8Array;
  ownerId: Uint8Array;
  storageKey: string;
}) {
  await prisma.content.update({
    where: { id: contentId, ownerId, type: "image" },
    data: { storageKey },
  });
}

export async function deleteImageContent({
  contentId,
  ownerId,
}: {
  contentId: Uint8Array;
  ownerId: Uint8Array;
}) {
  await prisma.content.delete({
    where: { id: contentId, ownerId, type: "image" },
  });
}

/**
 * Returns the image row's serving metadata if the caller may view it and the
 * bytes are ready (storage key present). Returns null in every other case —
 * row missing, wrong type, soft-deleted, not viewable, or not yet uploaded.
 *
 * Owns the full read-side gate so callers don't reimplement it.
 */
export async function findViewableImage({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId?: Uint8Array;
}): Promise<{
  storageKey: string;
  mimeType: string;
  sizeBytes: bigint | null;
} | null> {
  const row = await prisma.content.findFirst({
    where: {
      id: contentId,
      type: "image",
      ...filterViewableContent(loggedInUserId),
    },
    select: {
      mimeType: true,
      storageKey: true,
      sizeBytes: true,
    },
  });

  if (!row || !row.storageKey || !row.mimeType) return null;

  return {
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
  };
}
