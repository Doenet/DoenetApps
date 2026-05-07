import { Prisma } from "@prisma/client";
import { prisma } from "../model";
import {
  filterEditableContent,
  filterViewableContent,
  getIsEditor,
} from "../utils/permissions";
import { getCidV1FromString } from "@doenet-tools/shared";

export async function getDoenetMLComparison({
  contentId,
  compareId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  compareId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  const isEditor = await getIsEditor(loggedInUserId);

  // verify content exists, is a document, and is editable by logged in user
  const activity = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ...filterEditableContent(loggedInUserId, isEditor),
      type: "singleDoc",
    },
    select: {
      source: true,
      doenetmlVersion: true,
      name: true,
    },
  });

  // verify compare content exists, is a document, and is viewable by logged in user
  await prisma.content.findUniqueOrThrow({
    where: {
      id: compareId,
      ...filterViewableContent(loggedInUserId, isEditor),
      type: "singleDoc",
    },
  });

  let compareRelation: "source" | "remix";
  let compareCidAtLastUpdate: string | null = null;
  let activityCompare;

  try {
    const origin = await prisma.contributorHistory.findUniqueOrThrow({
      where: {
        remixContentId_originContentId: {
          remixContentId: contentId,
          originContentId: compareId,
        },
      },
      select: {
        originContent: {
          select: {
            cid: true,
            content: {
              select: {
                source: true,
                doenetmlVersion: true,
                name: true,
                owner: {
                  select: {
                    userId: true,
                    firstNames: true,
                    lastNames: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    // found a record indicating `compareId` is the source
    compareRelation = "source";
    compareCidAtLastUpdate = origin.originContent.cid;
    activityCompare = origin.originContent.content;
    // compareSource = origin.originContent.content.source!;
    // compareDoenetmlVersion = origin.originContent.content.doenetmlVersion!;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      const remix = await prisma.contributorHistory.findUniqueOrThrow({
        where: {
          remixContentId_originContentId: {
            remixContentId: compareId,
            originContentId: contentId,
          },
        },
        select: {
          remixContent: {
            select: {
              cid: true,
              content: {
                select: {
                  source: true,
                  doenetmlVersion: true,
                  name: true,
                  owner: {
                    select: {
                      userId: true,
                      firstNames: true,
                      lastNames: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      // found a record indicating `compareId` is the remix
      compareRelation = "remix";
      compareCidAtLastUpdate = remix.remixContent.cid;
      activityCompare = remix.remixContent.content;
      //   compareSource = remix.remixContent.content.source!;
      //   compareDoenetmlVersion = remix.remixContent.content.doenetmlVersion!;
    } else {
      throw e;
    }
  }

  const compareCurrentCid = await getCidV1FromString(
    activityCompare.doenetmlVersion?.id.toString() +
      "|" +
      activityCompare.source,
  );

  const activityCurrentCid = await getCidV1FromString(
    activity.doenetmlVersion?.id.toString() + "|" + activity.source,
  );

  return {
    activity: {
      name: activity.name,
      contentId: contentId,
      doenetML: activity.source,
      doenetmlVersion: activity.doenetmlVersion,
    },
    activityCompare: {
      name: activityCompare.name,
      contentId: compareId,
      doenetML: activityCompare.source,
      doenetmlVersion: activityCompare.doenetmlVersion,
      owner: activityCompare.owner,
    },
    activityCompareChanged: compareCurrentCid !== compareCidAtLastUpdate,
    activityAtCompare: activityCurrentCid === compareCurrentCid,
    compareRelation,
  };
}
