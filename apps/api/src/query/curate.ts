import { LibraryEventType, LibraryStatus } from "@prisma/client";
import { prisma } from "../model";
import { Content, LibraryComment, LibraryRelations, UserInfo } from "../types";
import { fromUUID, isEqualUUID } from "../utils/uuid";
import { createContent, getAllDoenetmlVersions } from "./activity";
import { copyContent } from "./copy_move";
import {
  filterEditableActivity,
  filterViewableActivity,
  getIsEditor,
  mustBeEditor,
} from "../utils/permissions";
import {
  getMyContentOrLibraryContent,
  searchMyContentOrLibraryContent,
} from "./content_list";
import { processContent, returnContentSelect } from "../utils/contentStructure";
import { getAllCategories } from "./classification";
import { getAllLicenses } from "./license";
import { InvalidRequestError } from "../utils/error";

export async function getLibraryAccountId() {
  const library = await prisma.users.findFirstOrThrow({
    where: {
      isLibrary: true,
    },
    select: {
      userId: true,
    },
  });
  const libraryId = library!.userId;
  return libraryId;
}

/**
 * Convert content ids that the given user cannot see into `null`. Does not affect visible ids.
 *
 * Three cases:
 * 1. `contentId` is null --> return id is null
 * 2. `contentId` is non-null but invisible --> return id is null
 * 3. `contentId` is non-null and visible --> return id equals `contentId`
 */
async function redactInvisibleContentIds({
  contentIds: contentIds,
  loggedInUserId,
  isEditor,
}: {
  contentIds: Uint8Array[];
  loggedInUserId: Uint8Array;
  isEditor: boolean;
}) {
  const visibleIdsList = (
    await prisma.content.findMany({
      where: {
        id: { in: contentIds },
        ...filterViewableActivity(loggedInUserId, isEditor),
      },
      select: { id: true },
    })
  ).map((v) => fromUUID(v.id));
  const visibleIds = new Set(visibleIdsList);

  const results: Map<Uint8Array, Uint8Array | null> = new Map();
  for (const id of contentIds) {
    results.set(id, visibleIds.has(fromUUID(id)) ? id : null);
  }
  return results;
}

/**
 * Replace library content's UserInfo with the source author instead of the library account.
 * If the content is not owned by the library, this function does nothing.
 */
export async function maskLibraryUserInfo({
  contentId,
  owner,
}: {
  contentId: Uint8Array;
  owner: UserInfo;
}) {
  const libraryId = await getLibraryAccountId();
  if (isEqualUUID(owner.userId, libraryId)) {
    const user = await prisma.content.findUniqueOrThrow({
      where: {
        id: contentId,
      },
      select: {
        libraryActivityInfo: {
          select: {
            source: {
              select: {
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

    const maskInfo = user.libraryActivityInfo!.source.owner;
    const newOwner = {
      ...owner,
      // Mask info replaces original user info
      ...maskInfo,
      isMaskForLibrary: true,
    };
    return newOwner;
  } else {
    return owner;
  }
}

/**
 * Depending on user's access privileges, this function will hide some information. See type `LibraryRelations` for details.
 */
export async function getMultipleLibraryRelations({
  contentIds,
  loggedInUserId = new Uint8Array(16),
}: {
  contentIds: Uint8Array[];
  loggedInUserId?: Uint8Array;
}): Promise<LibraryRelations[]> {
  const isEditor = await getIsEditor(loggedInUserId);

  // ======== Relation: Me to Revised =========

  const meRelations: {
    [index: string]: {
      status: LibraryStatus;
      activityContentId: Uint8Array | null;
      reviewRequestDate?: Date;
      primaryEditor?: UserInfo;
      iAmPrimaryEditor?: boolean;
    };
  } = {};

  const infos = await prisma.libraryActivityInfos.findMany({
    where: {
      sourceId: { in: contentIds },
      source: {
        ...filterViewableActivity(loggedInUserId, isEditor),
      },
    },
    select: {
      sourceId: true,
      status: true,
      contentId: true,
      ownerRequested: true,
      requestedOn: true,
      primaryEditor: {
        select: {
          userId: true,
          firstNames: true,
          lastNames: true,
        },
      },
    },
  });

  if (infos) {
    const isOwnerList = await prisma.content.findMany({
      where: {
        id: { in: contentIds },
        ownerId: loggedInUserId,
      },
      select: { id: true },
    });

    // Set of original content ids that this user owns
    const isOwnerOf = new Set(isOwnerList.map((v) => fromUUID(v.id)));

    const redactFor = await redactInvisibleContentIds({
      contentIds: infos.map((v) => v.contentId),
      loggedInUserId,
      isEditor,
    });

    for (const info of infos) {
      const isPublished = info.status === LibraryStatus.PUBLISHED;
      const isOwner = isOwnerOf.has(fromUUID(info.sourceId));

      const redactedId = redactFor.get(info.contentId)!;

      // Three possible conditions for this relation to be visible.
      // 1. Curated activity is published
      // 2. You are editor
      // 3. You are owner and you suggested the review
      if (isPublished || isEditor || (isOwner && info.ownerRequested)) {
        meRelations[fromUUID(info.sourceId)] = {
          // activityContentId: revisedIds[i],
          activityContentId: redactedId,
          status: info.status,
        };

        if (isEditor || (isOwner && info.ownerRequested)) {
          meRelations[fromUUID(info.sourceId)].reviewRequestDate =
            info.requestedOn;
        }
      }
    }
  }

  // ======== Relation: Source to Me =========

  const sourceRelations: {
    [index: string]: {
      status: LibraryStatus;
      sourceContentId: Uint8Array | null;
      ownerRequested?: boolean;
      reviewRequestDate?: Date;
      primaryEditor?: UserInfo;
      iAmPrimaryEditor?: boolean;
    };
  } = {};

  const sourceInfos = await prisma.libraryActivityInfos.findMany({
    where: {
      contentId: { in: contentIds },
      activity: {
        ...filterViewableActivity(loggedInUserId, isEditor),
      },
    },
    select: {
      contentId: true,
      status: true,
      sourceId: true,
      ownerRequested: true,
      requestedOn: true,
      primaryEditor: {
        select: {
          userId: true,
          firstNames: true,
          lastNames: true,
        },
      },
    },
  });

  if (sourceInfos) {
    const redactFor = await redactInvisibleContentIds({
      contentIds: sourceInfos.map((v) => v.sourceId),
      loggedInUserId,
      isEditor,
    });

    for (const sourceInfo of sourceInfos) {
      const key = fromUUID(sourceInfo.contentId);

      sourceRelations[key] = {
        sourceContentId: redactFor.get(sourceInfo.sourceId)!,
        status: sourceInfo.status,
      };
      if (isEditor) {
        // Only editors can see if owner requested review and the date requested on
        sourceRelations[key].ownerRequested = sourceInfo.ownerRequested;
        sourceRelations[key].reviewRequestDate = sourceInfo.requestedOn;

        const primaryEditor = sourceInfo.primaryEditor;
        if (primaryEditor) {
          sourceRelations[key].primaryEditor = primaryEditor;
          sourceRelations[key].iAmPrimaryEditor = isEqualUUID(
            loggedInUserId,
            primaryEditor.userId,
          );
        } else {
          sourceRelations[key].iAmPrimaryEditor = false;
        }
      }
    }
  }

  const libraryRelations: LibraryRelations[] = contentIds.map((id) => {
    const source = sourceRelations[fromUUID(id)];
    const me = meRelations[fromUUID(id)];

    const thisRelation: LibraryRelations = {};
    if (source) {
      thisRelation.source = source;
    }
    if (me) {
      thisRelation.activity = me;
    }
    return thisRelation;
  });

  return libraryRelations;
}

export async function getSingleLibraryRelations({
  contentId,
  loggedInUserId = new Uint8Array(16),
}: {
  contentId: Uint8Array;
  loggedInUserId?: Uint8Array;
}) {
  return (
    await getMultipleLibraryRelations({
      contentIds: [contentId],
      loggedInUserId,
    })
  )[0];
}

/**
 * Add activity with id `contentId` to the list of `pending` activities.
 * If the activity has not been suggested before, this function creates a private remix inside the library account.
 * If suggesting this activity is meaningless (already `pending`, `under_review`, or `published`), this function does nothing.
 * @param contentId - must be existing public activity
 * @param loggedInUserId
 */
export async function suggestToBeCurated({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  // Don't allow anonymous users to suggest curation
  await prisma.users.findUniqueOrThrow({
    where: {
      userId: loggedInUserId,
      isAnonymous: false,
    },
    select: {
      userId: true,
    },
  });

  const content = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      AND: [
        filterViewableActivity(loggedInUserId, false),
        {
          isPublic: true,
          // for now, only allow single docs
          type: "singleDoc",
        },
      ],
    },
    select: {
      ownerId: true,
      librarySourceInfo: {
        select: {
          status: true,
          contentId: true,
        },
      },
    },
  });
  const ownerRequested = content
    ? isEqualUUID(loggedInUserId, content.ownerId)
    : false;

  // If this activity is already pending or under review, we won't update the database,
  // but we will still return the corresponding contentIdInLibrary.

  let contentIdInLibrary = content.librarySourceInfo?.contentId;

  if (contentIdInLibrary === undefined) {
    const libraryId = await getLibraryAccountId();

    const { newContentIds } = await copyContent({
      contentIds: [contentId],
      loggedInUserId: libraryId,
      parentId: null,
    });

    contentIdInLibrary = newContentIds[0];
    await prisma.libraryActivityInfos.create({
      data: {
        sourceId: contentId,
        contentId: contentIdInLibrary,
        status: LibraryStatus.PENDING,
        ownerRequested,
        requestedOn: new Date(),
        events: {
          create: {
            dateTime: new Date(),
            eventType: LibraryEventType.SUGGEST_REVIEW,
            userId: loggedInUserId,
          },
        },
      },
    });
  } else if (content.librarySourceInfo?.status === LibraryStatus.REJECTED) {
    await prisma.libraryActivityInfos.update({
      where: {
        sourceId: contentId,
      },
      data: {
        ownerRequested,
        primaryEditorId: null,
        requestedOn: new Date(),
        status: LibraryStatus.PENDING,
        events: {
          create: {
            eventType: LibraryEventType.SUGGEST_REVIEW,
            dateTime: new Date(),
            userId: loggedInUserId,
          },
        },
      },
    });
  }

  return { contentIdInLibrary };
}

/**
 * Claim ownership of an activity in the library. This marks you as the primary editor.
 * If the activity was `pending`, it changes to `under_review`.
 * If there was an existing primary editor, you replace them.
 * @param contentId - id of the library-owned remix, not the source content id
 * @param loggedInUserId - must be editor
 */
export async function claimOwnershipOfReview({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  await mustBeEditor(loggedInUserId);

  const activity = await prisma.libraryActivityInfos.findUniqueOrThrow({
    where: {
      contentId,
      OR: [
        {
          primaryEditorId: null,
        },
        {
          NOT: {
            primaryEditorId: loggedInUserId,
          },
        },
      ],
    },
    select: {
      status: true,
    },
  });

  const newStatus =
    activity.status === LibraryStatus.PENDING
      ? LibraryStatus.UNDER_REVIEW
      : activity.status;

  await prisma.libraryActivityInfos.update({
    where: {
      contentId,
    },
    data: {
      primaryEditorId: loggedInUserId,
      status: newStatus,
      events: {
        create: {
          eventType: LibraryEventType.TAKE_OWNERSHIP,
          userId: loggedInUserId,
          dateTime: new Date(),
        },
      },
    },
  });
}

/**
 * Make library activity public and log event.
 * @param contentId - activity in library account with status `under_review`
 * @param loggedInUserId - must be editor and primary editor
 * @todo notify owner
 */
export async function publishActivityToLibrary({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  await mustBeEditor(loggedInUserId);
  await prisma.content.update({
    where: {
      id: contentId,
      AND: [
        {
          libraryActivityInfo: {
            status: LibraryStatus.UNDER_REVIEW,
            primaryEditorId: loggedInUserId,
          },
          license: {
            isNot: null,
          },
        },
        filterEditableActivity(loggedInUserId, true),
      ],
    },
    data: {
      // Publish
      isPublic: true,
      visibility: "public",
      libraryActivityInfo: {
        update: {
          // Update status
          status: LibraryStatus.PUBLISHED,
          // Log publication
          events: {
            create: {
              eventType: LibraryEventType.PUBLISH,
              dateTime: new Date(),
              userId: loggedInUserId,
            },
          },
        },
      },
    },
  });
}

/**
 * Return library activity to `under_review` category and log event.
 * @param contentId - must be existing published (public) activity in library account
 * @param loggedInUserId - must be editor and primary editor
 */
export async function unpublishActivityFromLibrary({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  await mustBeEditor(loggedInUserId);
  await prisma.content.update({
    where: {
      id: contentId,
      AND: [
        {
          isPublic: true,
          libraryActivityInfo: {
            status: LibraryStatus.PUBLISHED,
            primaryEditorId: loggedInUserId,
          },
        },
        filterEditableActivity(loggedInUserId, true),
      ],
    },
    data: {
      isPublic: false,
      visibility: "private",
      libraryActivityInfo: {
        update: {
          status: LibraryStatus.UNDER_REVIEW,
          events: {
            create: {
              eventType: LibraryEventType.UNPUBLISH,
              dateTime: new Date(),
              userId: loggedInUserId,
            },
          },
        },
      },
    },
  });
}

/**
 * Reject activity's request for curation and log event.
 * @param contentId - activity in library account with status `under_review`
 * @param loggedInUserId - must be editor and primary editor
 */
export async function rejectActivity({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  await mustBeEditor(loggedInUserId);
  await prisma.libraryActivityInfos.update({
    where: {
      contentId,
      status: LibraryStatus.UNDER_REVIEW,
      primaryEditorId: loggedInUserId,
    },
    data: {
      status: LibraryStatus.REJECTED,
      events: {
        create: {
          eventType: LibraryEventType.REJECT,
          userId: loggedInUserId,
          dateTime: new Date(),
        },
      },
    },
  });
}

/**
 * Post a comment to chat between activity author and editors.
 * @param contentId - source id for author, revised id for editor
 * @param loggedInUserId - must be author or primary editor
 */
export async function addComment({
  contentId,
  loggedInUserId,
  comment,
  asEditor = false,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
  comment: string;
  asEditor?: boolean;
}) {
  if (comment.trim() === "") {
    throw new InvalidRequestError("Comment cannot be blank");
  }

  if (asEditor) {
    await mustBeEditor(loggedInUserId);
  }
  await prisma.libraryActivityInfos.update({
    where: {
      sourceId: asEditor ? undefined : contentId,
      contentId: asEditor ? contentId : undefined,
      primaryEditorId: asEditor ? loggedInUserId : undefined,
      source: {
        ownerId: asEditor ? undefined : loggedInUserId,
      },
      OR: [
        {
          ownerRequested: true,
        },
        {
          status: LibraryStatus.PUBLISHED,
        },
      ],
    },
    data: {
      events: {
        create: {
          eventType: LibraryEventType.ADD_COMMENT,
          userId: loggedInUserId,
          dateTime: new Date(),
          comment,
        },
      },
    },
  });
}

/**
 * Get a list of all comments about this library review
 * @param contentId - source id for author, revised id for editor
 * @param loggedInUserId - must be author or an editor
 */
export async function getComments({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}): Promise<LibraryComment[]> {
  const {
    owner: { isLibrary },
  } = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
    },
    select: {
      owner: {
        select: {
          isLibrary: true,
        },
      },
    },
  });

  if (isLibrary) {
    await mustBeEditor(loggedInUserId);
  } else {
    // Must be owner
    await prisma.content.findUniqueOrThrow({
      where: { id: contentId, ownerId: loggedInUserId },
      select: { id: true },
    });
  }

  const results = await prisma.libraryEvents.findMany({
    where: {
      eventType: LibraryEventType.ADD_COMMENT,
      info: {
        contentId: isLibrary ? contentId : undefined,
        sourceId: isLibrary ? undefined : contentId,
      },
    },
    select: {
      comment: true,
      dateTime: true,
      user: {
        select: {
          userId: true,
          firstNames: true,
          lastNames: true,
        },
      },
    },
  });

  const resultsWithIsMe = results.map((v) => {
    return {
      ...v,
      comment: v.comment!,
      isMe: isEqualUUID(v.user.userId, loggedInUserId),
    };
  });

  return resultsWithIsMe;
}

export async function getCurationFolderContent({
  parentId,
  loggedInUserId,
}: {
  parentId: Uint8Array | null;
  loggedInUserId: Uint8Array;
}) {
  return await getMyContentOrLibraryContent({
    parentId,
    loggedInUserId,
    isLibrary: true,
  });
}

export async function searchCurationFolderContent({
  parentId,
  loggedInUserId,
  query,
}: {
  parentId: Uint8Array | null;
  loggedInUserId: Uint8Array;
  query: string;
}) {
  return await searchMyContentOrLibraryContent({
    parentId,
    loggedInUserId,
    query,
    inLibrary: true,
  });
}

export async function createCurationFolder({
  loggedInUserId,
  name,
  parentId,
}: {
  name: string;
  loggedInUserId: Uint8Array;
  parentId: Uint8Array | null;
}) {
  await createContent({
    loggedInUserId,
    name,
    contentType: "folder",
    parentId,
    inLibrary: true,
  });
}

/**
 * Get all pending curation requests, sorted by submission date oldest to newest.
 * Must be editor to call function.
 */
export async function getCurationQueue({
  loggedInUserId,
}: {
  loggedInUserId: Uint8Array;
}) {
  await mustBeEditor(loggedInUserId);

  async function getLibraryContentWithStatus({
    status,
    cap,
  }: {
    status: LibraryStatus;
    cap?: number;
  }): Promise<[Content[], LibraryRelations[]]> {
    const results = await prisma.libraryEvents.findMany({
      where: {
        info: {
          status,
          activity: {
            ...filterViewableActivity(loggedInUserId, true),
          },
        },
      },
      orderBy: {
        dateTime: "desc",
      },
      select: {
        info: {
          select: {
            activity: {
              select: returnContentSelect({
                includeOwnerDetails: true,
                includeClassifications: true,
              }),
            },
          },
        },
      },
      distinct: "infoId",
      take: cap ?? undefined,
    });

    const content: Content[] = results
      .map((result) => result.info.activity)
      //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
      .map(processContent);
    const library = await getMultipleLibraryRelations({
      contentIds: content.map((c) => c.contentId),
      loggedInUserId,
    });

    // Replace library owner info with source owner info
    const curatedUsers = await Promise.all(
      content.map(
        async (c) =>
          await maskLibraryUserInfo({
            contentId: c.contentId,
            owner: c.owner!,
          }),
      ),
    );
    for (let i = 0; i < content.length; i++) {
      content[i].owner = curatedUsers[i];
    }

    console.assert(
      content.length === library.length,
      "Content length %i should be equal to library relations length %i",
      content.length,
      library.length,
    );

    return [content, library];
  }

  const [pendingContent, pendingLibraryRelations] =
    await getLibraryContentWithStatus({ status: LibraryStatus.PENDING });

  const [underReviewContent, underReviewLibraryRelations] =
    await getLibraryContentWithStatus({ status: LibraryStatus.UNDER_REVIEW });

  const [rejectedContent, rejectedLibraryRelations] =
    await getLibraryContentWithStatus({
      status: LibraryStatus.REJECTED,
      cap: 100,
    });

  const [publishedContent, publishedLibraryRelations] =
    await getLibraryContentWithStatus({
      status: LibraryStatus.PUBLISHED,
      cap: 100,
    });

  const { allCategories } = await getAllCategories();
  const { allDoenetmlVersions } = await getAllDoenetmlVersions();
  const { allLicenses } = await getAllLicenses();

  return {
    pendingContent,
    pendingLibraryRelations,
    underReviewContent,
    underReviewLibraryRelations,
    rejectedContent,
    rejectedLibraryRelations,
    publishedContent,
    publishedLibraryRelations,
    allCategories,
    allDoenetmlVersions,
    allLicenses,
  };
}
