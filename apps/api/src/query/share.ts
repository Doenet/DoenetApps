import { Prisma } from "@prisma/client";
import { prisma } from "../model";
import {
  filterEditableContent,
  filterExcludeAssignments,
} from "../utils/permissions";
import { isEqualUUID } from "../utils/uuid";
import { InvalidRequestError } from "../utils/error";
import { getDescendantIds } from "./activity";
import { UserInfoWithEmail } from "../types";

/**
 * Set the `isPublic` flag on a content `id` along with all of its children.
 * Recurses to grandchildren/subfolders.
 * Skips assignments since they cannot be made public.
 *
 * If parent is public, however, it does not allow the content to be set to private.
 */
export async function setContentIsPublic({
  contentId,
  loggedInUserId,
  isPublic,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
  isPublic: boolean;
}) {
  const visibility = isPublic ? "public" : "private";

  // select content to make sure it is exists and is editable by loggedInUserId
  const content = await prisma.content.findUniqueOrThrow({
    where: { id: contentId, ...filterEditableContent(loggedInUserId) },
    select: { parent: { select: { isPublic: true } } },
  });

  if (!isPublic) {
    if (content.parent !== null && content.parent.isPublic) {
      throw new InvalidRequestError(
        "Content has a public parent -- cannot make it private.",
      );
    }
  }

  const descendantIds = await getDescendantIds(contentId);

  // Update share timestamp for those whose share status is changing
  const updateTimestamp = prisma.content.updateMany({
    where: {
      id: { in: [contentId, ...descendantIds] },
      isPublic: !isPublic,
      ...filterExcludeAssignments,
    },
    data: { publiclySharedAt: isPublic ? new Date() : null },
  });

  // Make public/private
  const updateContent = prisma.content.updateMany({
    where: {
      id: { in: [contentId, ...descendantIds] },
      ...filterExcludeAssignments,
    },
    data: { isPublic, visibility },
  });

  // Note: updateTimestamp first because it checks `isPublic` status
  await prisma.$transaction([updateTimestamp, updateContent]);

  return { isPublic, visibility };
}

export async function unshareContent({
  contentId,
  loggedInUserId,
  userId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
  userId: Uint8Array;
}) {
  await modifyContentSharedWith({
    action: "unshare",
    contentId,
    loggedInUserId,
    users: [userId],
  });

  return { userId }; // Return the userId that was unshared
}

/**
 * Modify who this content `id` (and all its recursive children content) is shared with.
 * The `users` parameter will either be added or removed from the 'shared' list, depending on which action you choose.
 */
export async function modifyContentSharedWith({
  action,
  contentId,
  loggedInUserId,
  users,
}: {
  action: "share" | "unshare";
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
  users: Uint8Array[];
}) {
  // Check contentId exists and is editable by loggedInUserId
  await prisma.content.findUniqueOrThrow({
    where: { id: contentId, ...filterEditableContent(loggedInUserId) },
    select: { id: true },
  });

  // If unsharing, make sure content doesn't have a parent shared with any of the users
  if (action === "unshare") {
    const content = await prisma.content.findUniqueOrThrow({
      where: { id: contentId, ...filterEditableContent(loggedInUserId) },
      select: {
        parent: { select: { sharedWith: { select: { userId: true } } } },
      },
    });

    if (content.parent !== null) {
      const parentSharedWith = content.parent.sharedWith.map((s) => s.userId);
      for (const userId of users) {
        if (parentSharedWith.find((u) => isEqualUUID(u, userId))) {
          throw new InvalidRequestError(
            "Content has a parent shared with user -- cannot stop sharing with that user.",
          );
        }
      }
    }
  }

  const descendantIds = await getDescendantIds(contentId, {
    excludeAssignments: true,
  });
  const contentShareIds = [contentId, ...descendantIds];

  const contentShares = users.flatMap((userId) =>
    contentShareIds.map((contentShareId) => ({
      userId,
      // `contentSharedId` is the specific content being shared, not the original `contentId`
      contentId: contentShareId,
      // `isRootShare` is true if this is the original content being shared
      // If it's not root, leave it as it is (false will be default if creating new record)
      isRootShare: isEqualUUID(contentId, contentShareId) ? true : undefined,
    })),
  );

  if (action === "share") {
    // Share

    // Update or create each record
    // It would be nice if we could do this in bulk, but Prisma doesn't support upsertMany yet
    for (const contentShare of contentShares) {
      await prisma.contentShares.upsert({
        where: {
          contentId_userId: {
            userId: contentShare.userId,
            contentId: contentShare.contentId,
          },
        },
        update: contentShare,
        create: contentShare,
      });
    }
  } else {
    // Unshare
    await prisma.contentShares.deleteMany({
      where: {
        OR: contentShares,
      },
    });
  }
}

export async function shareContentWithEmail({
  contentId,
  loggedInUserId,
  email,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
  email: string;
}): Promise<UserInfoWithEmail> {
  let user: UserInfoWithEmail;

  try {
    user = await prisma.users.findUniqueOrThrow({
      where: { email, isAnonymous: false },
      select: { userId: true, email: true, firstNames: true, lastNames: true },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      throw new InvalidRequestError("User with email not found");
    } else {
      throw e;
    }
  }

  if (isEqualUUID(user.userId, loggedInUserId)) {
    throw new InvalidRequestError("Cannot share with self");
  }

  await modifyContentSharedWith({
    action: "share",
    contentId: contentId,
    loggedInUserId,
    users: [user.userId],
  });

  return user;
}
