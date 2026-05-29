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
 *   - `isPublic`      — inherited from the parent (false at root)
 *   - `licenseCode`   — inherited when the parent is public or shared
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
  isPublic: boolean;
  licenseCode: string | null | undefined;
  sharedWith: Uint8Array[];
  courseRootId: Uint8Array | null;
}> {
  const sortIndex = await getNextSortIndexForParent(ownerId, parentId);

  let isPublic = false;
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
        isPublic: true,
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

    courseRootId = parent.courseRootId;

    if (parent.isPublic) {
      isPublic = true;
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

  return { sortIndex, isPublic, licenseCode, sharedWith, courseRootId };
}
