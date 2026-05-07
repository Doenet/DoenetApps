import { Prisma } from "@prisma/client";
import { prisma } from "../model";

/**
 * Record a user viewed this content. Only counts each user once per day.
 */
export async function recordContentView(
  contentId: Uint8Array,
  loggedInUserId: Uint8Array,
) {
  try {
    await prisma.contentViews.create({
      data: { contentId, userId: loggedInUserId },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        // if error was due to unique constraint failure,
        // then it was presumably due to a user viewing an activity
        // twice in one day, so we ignore the error
        return;
      }
    }
    throw e;
  }
}
