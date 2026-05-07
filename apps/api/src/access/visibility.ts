import { Visibility } from "@prisma/client";
import { prisma } from "../model";
import { InvalidRequestError } from "../utils/error";
import { getDescendantIds } from "../query/activity";
import type { AccessPolicy } from "./types";
import { filterExcludeAssignments } from "../utils/permissions";
import { StatusCodes } from "http-status-codes";
import { isEqualUUID } from "../utils/uuid";

// Visibility levels ordered from most restrictive to least restrictive
const visibilityOrder: Record<Visibility, number> = {
  private: 0,
  unlisted: 1,
  public: 2,
};

/**
 * Updates the visibility of a content item and its descendants.
 *
 * Rules:
 * 1. Only the owner can change visibility
 * 2. Assignments cannot have their visibility changed (always private)
 * 3. A child cannot be less public than its parent
 * 4. Content within an assignment cannot have visibility changed
 */
export async function updateVisibility({
  loggedInUserId,
  contentId,
  visibility,
}: {
  loggedInUserId: Uint8Array;
  contentId: Uint8Array;
  visibility: Visibility;
}): Promise<AccessPolicy> {
  const content = await prisma.content.findFirst({
    where: { id: contentId, isDeletedOn: null },
    select: {
      ownerId: true,
      isAssignmentRoot: true,
      visibility: true,
      parent: {
        select: {
          isAssignmentRoot: true,
          visibility: true,
        },
      },
    },
  });

  if (!content || !isEqualUUID(content.ownerId, loggedInUserId)) {
    throw new InvalidRequestError("Content not found", StatusCodes.NOT_FOUND);
  }

  // Assignment content is shallow by design, so checking the root and immediate
  // parent is sufficient to exclude all assignment-owned content here.
  if (content.isAssignmentRoot || content.parent?.isAssignmentRoot) {
    throw new InvalidRequestError("Assignment visibility cannot be changed");
  }

  // Validate hierarchy: child cannot be less public than parent
  if (content.parent) {
    const parentLevel = visibilityOrder[content.parent.visibility];
    const newLevel = visibilityOrder[visibility];
    if (newLevel < parentLevel) {
      throw new InvalidRequestError(
        `Cannot set visibility to ${visibility} (less public than parent's ${content.parent.visibility})`,
      );
    }
  }

  const descendantIds = await getDescendantIds(contentId, {
    excludeAssignments: true,
  });

  const publiclySharedAt = visibility === "public" ? new Date() : null;

  // Update share timestamp for those whose share status is changing
  const updateTimestamp = prisma.content.updateMany({
    where: {
      id: { in: [contentId, ...descendantIds] },
      NOT: { visibility },
      ...filterExcludeAssignments,
    },
    data: { publiclySharedAt },
  });

  const updateContent = prisma.content.updateMany({
    where: {
      id: { in: [contentId, ...descendantIds] },
      ...filterExcludeAssignments,
    },
    data: {
      visibility,
      isPublic: visibility === "public", // legacy flag, remove eventually
    },
  });

  // Note: updateTimestamp first because it checks `visibility` status
  await prisma.$transaction([updateTimestamp, updateContent]);

  return { visibility };
}
