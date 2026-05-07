import { ContentType, Prisma } from "@prisma/client";
import { prisma } from "../model";
import { DateTime } from "luxon";

/**
 * Record the fact that `contentId` was edited/viewed by `loggedInUserId`.
 *
 * Used for creating a list of recent content with {@link getRecentContent}.
 */
export async function recordRecentContent(
  loggedInUserId: Uint8Array,
  mode: "edit" | "view",
  contentId: Uint8Array,
) {
  await prisma.recentContent.upsert({
    where: {
      userId_mode_contentId: { userId: loggedInUserId, mode, contentId },
    },
    update: { accessed: DateTime.now().toJSDate() },
    create: { userId: loggedInUserId, mode, contentId },
  });
}

/**
 * Get a list of the 5 most recent items recorded by {@link recordRecentContent}
 * that were edited/viewed by `loggedInUserId`,
 * optionally filtered to just the content types of `restrictToTypes`.
 */
export async function getRecentContent({
  loggedInUserId,
  mode,
  restrictToTypes,
}: {
  loggedInUserId: Uint8Array;
  mode: "edit" | "view";
  restrictToTypes?: ContentType[];
}) {
  const results = await prisma.recentContent.findMany({
    where: {
      userId: loggedInUserId,
      mode,
      content: { isDeletedOn: null },
      OR: restrictToTypes?.map((t) => ({ content: { type: t } })),
    },
    select: {
      content: {
        select: {
          id: true,
          name: true,
          type: true,
          parent: { select: { id: true, type: true } },
        },
      },
    },
    take: 5,
    orderBy: { accessed: "desc" },
  });
  return results.map((r) => ({
    contentId: r.content.id,
    name: r.content.name,
    type: r.content.type,
    parent: r.content.parent
      ? { contentId: r.content.parent.id, type: r.content.parent.type }
      : null,
  }));
}

/**
 * Delete all but the most recent 100 recentContent records for each user.
 *
 * Get `getRecentContent` retrieves the most recent 10,
 * possibly filtered by content type,
 * so this query could remove items that would have been retrieved in `getRecentContent`
 * if the viewed types were unbalanced.
 *
 * Note: this query seem pretty slow even on a test database, so not sure if it is workable in production.
 * We could alternatively just purge records older than some given date.
 */
export async function purgeOldRecentContent() {
  await prisma.$executeRaw(Prisma.sql`
      DELETE rc FROM recentContent as rc
      WHERE accessed < (
        SELECT ac FROM (
          SELECT accessed ac from recentContent as rc2
          WHERE rc2.userid = rc.userId
          ORDER BY accessed DESC
          LIMIT 1 OFFSET 99
        ) as sub
      )`);
}
