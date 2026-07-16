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
// DoenetML `<image>` attribution supplied when creating an image. The license
// is required (an image is never created unlicensed); the rest are optional.
export type ImageAttributionInput = {
  imageAuthorName: string | null;
  imageAuthorUrl: string | null;
  imageTitle: string | null;
  imageOriginalUrl: string | null;
  imageLicenseCodes: string;
  imageLicenseVersion: string | null;
};

// Fallback used only by internal/test callers that don't supply attribution.
// The real upload path always passes an explicit, user-chosen license that the
// API validates (`completeUploadImageBodySchema`); this default merely satisfies
// the required `imageContent.licenseCodes` column for direct callers.
const DEFAULT_IMAGE_ATTRIBUTION: ImageAttributionInput = {
  imageAuthorName: null,
  imageAuthorUrl: null,
  imageTitle: null,
  imageOriginalUrl: null,
  imageLicenseCodes: "CC-BY-SA",
  imageLicenseVersion: null,
};

export async function createImageContent({
  loggedInUserId,
  parentId,
  name,
  mimeType,
  sizeBytes,
  storageKey,
  attribution = DEFAULT_IMAGE_ATTRIBUTION,
}: {
  loggedInUserId: Uint8Array;
  parentId: Uint8Array | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
  attribution?: ImageAttributionInput;
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
      // The 1:1 image row is created together with the content row, so an image
      // always has its (required) license from the moment it exists.
      imageData: {
        create: {
          mimeType,
          sizeBytes: BigInt(sizeBytes),
          storageKey,
          authorName: attribution.imageAuthorName,
          authorUrl: attribution.imageAuthorUrl,
          title: attribution.imageTitle,
          originalUrl: attribution.imageOriginalUrl,
          licenseCodes: attribution.imageLicenseCodes,
          licenseVersion: attribution.imageLicenseVersion,
        },
      },
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

/**
 * Sets the DoenetML `<image>` attribution/licensing on an image content item.
 * Only the owner may edit, and only rows of `type: "image"`. Empty strings are
 * normalized to `null` so absent fields don't emit empty tag attributes. The
 * caller is responsible for validating `imageLicenseCodes` against the
 * recognized codes (see `setImageAttributionSchema`).
 */
export async function setImageAttribution({
  contentId,
  ownerId,
  imageAuthorName,
  imageAuthorUrl,
  imageTitle,
  imageOriginalUrl,
  imageLicenseCodes,
  imageLicenseVersion,
}: {
  contentId: Uint8Array;
  ownerId: Uint8Array;
  imageAuthorName: string | null;
  imageAuthorUrl: string | null;
  imageTitle: string | null;
  imageOriginalUrl: string | null;
  imageLicenseCodes: string;
  imageLicenseVersion: string | null;
}) {
  // Scoped through the relation: only the owner's own image rows are editable.
  const result = await prisma.imageContent.updateMany({
    where: { contentId, content: { ownerId, type: "image" } },
    data: {
      authorName: imageAuthorName,
      authorUrl: imageAuthorUrl,
      title: imageTitle,
      originalUrl: imageOriginalUrl,
      licenseCodes: imageLicenseCodes,
      licenseVersion: imageLicenseVersion,
    },
  });

  if (result.count === 0) {
    throw new InvalidRequestError("Image not found");
  }
}
