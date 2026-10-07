import { ContentType, Visibility } from "@prisma/client";
import { prisma } from "../model";
import { InvalidRequestError } from "../utils/error";
import { getNextSortIndexForParent } from "../utils/sort";

/**
 * Validates that `parentId` is a legal place for `ownerId` to add a new child,
 * and returns the fields that child should be created with.
 *
 * Validates:
 *   - parent exists, is owned by `ownerId`, and isn't soft-deleted
 *   - parent is a container type (folder, sequence, or select) — never a leaf
 *     (`singleDoc`, `image`)
 *   - parent isn't an assignment root, and isn't directly under one
 *
 * Returns:
 *   - `sortIndex`     — next position at the end of the parent's children
 *   - `visibility`    — inherited from the parent ("private" at root)
 *   - `isPublic`      — true when inherited visibility is "public"
 *   - `licenseCode`   — inherited when the parent is non-private or shared
 *   - `sharedWith`    — userIds the parent is shared with
 *   - `courseRootId`  — inherited from the parent
 *
 * Throws `InvalidRequestError` (assigned placement) or prisma's `NotFoundError`
 * (parent missing / not owned / soft-deleted / wrong type).
 */
export async function prepareNewChild({
  ownerId,
  parentId,
}: {
  ownerId: Uint8Array;
  parentId: Uint8Array | null;
}): Promise<{
  sortIndex: Awaited<ReturnType<typeof getNextSortIndexForParent>>;
  parentType: ContentType | null;
  isPublic: boolean;
  visibility: Visibility;
  licenseCode: string | null | undefined;
  sharedWith: Uint8Array[];
  courseRootId: Uint8Array | null;
}> {
  const sortIndex = await getNextSortIndexForParent(ownerId, parentId);

  let parentType: ContentType | null = null;
  let isPublic = false;
  let visibility: Visibility = "private";
  let licenseCode: string | null | undefined = undefined;
  let sharedWith: Uint8Array[] = [];
  let courseRootId: Uint8Array | null = null;

  if (parentId !== null) {
    const parent = await prisma.content.findUniqueOrThrow({
      where: {
        id: parentId,
        type: { in: ["folder", "sequence", "select"] },
        isDeletedOn: null,
        ownerId,
      },
      select: {
        type: true,
        isPublic: true,
        visibility: true,
        licenseCode: true,
        sharedWith: { select: { userId: true } },
        isAssignmentRoot: true,
        courseRootId: true,
        parent: { select: { isAssignmentRoot: true } },
      },
    });

    if (parent.isAssignmentRoot || parent.parent?.isAssignmentRoot) {
      throw new InvalidRequestError(
        "Cannot add content to an assigned activity",
      );
    }

    parentType = parent.type;
    courseRootId = parent.courseRootId;

    if (parent.visibility !== "private") {
      visibility = parent.visibility;
      isPublic = parent.visibility === "public";
      if (parent.licenseCode) {
        licenseCode = parent.licenseCode;
      }
    }

    if (parent.sharedWith.length > 0) {
      sharedWith = parent.sharedWith.map((cs) => cs.userId);
      if (parent.licenseCode) {
        licenseCode = parent.licenseCode;
      }
    }
  }

  return {
    sortIndex,
    parentType,
    isPublic,
    visibility,
    licenseCode,
    sharedWith,
    courseRootId,
  };
}
