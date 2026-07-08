import { prisma } from "../model";
import { prepareNewChild } from "../content-tree";
import { InvalidRequestError } from "../utils/error";

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
 * surface in search/explore. `storageKey` is the opaque S3 key the CDN reads
 * from; it's optional only so tests can create rows without touching S3.
 */
export async function createImageContent({
  loggedInUserId,
  parentId,
  name,
  mimeType,
  sizeBytes,
  storageKey,
}: {
  loggedInUserId: Uint8Array;
  parentId: Uint8Array | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
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
      storageKey,
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
