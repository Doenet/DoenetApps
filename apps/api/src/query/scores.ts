import { prisma } from "../model";
import { isEqualUUID } from "../utils/uuid";
import { Prisma } from "@prisma/client";
import { InvalidRequestError } from "../utils/error";
import {
  filterEditableRootAssignment,
  filterViewableRootAssignment,
  getIsAnonymous,
  getOwnerIsPremium,
  getScopedStudentCourseId,
} from "../utils/permissions";
import {
  isCachedLatestAttempt,
  isItemScores,
  ItemScores,
  LatestAttempt,
  ScoreData,
  UserInfo,
} from "../types";

// TODO: do we still save score and state if assignment isn't open?
// If not, how do we communicate that fact

/**
 * Save the `score` and `state` of assignment `contentId` for `loggedInUserId`.
 * The specified `attemptNumber` must be the latest attempt of `loggedInUserId`
 * (otherwise an `InvalidRequestError` is thrown).
 *
 * If `item` is specified, then also save the `score` and `state` of `itemNumber`,
 * or, if `itemNumber` not specified, then `shuffledItemNumber`,
 * throwing an `itemAttemptNumber` if neither specified.
 * The specified `itemAttemptNumber` must be the latest attempt of `loggedInUserId`
 * (otherwise an `InvalidRequestError` is thrown).
 * The `shuffledItemNumber` is the possibly reordered list number for `itemNumber`.
 * `shuffledItemOrder` is the array of all items, in original order, of `{shuffledItemNumber, docId}` of that item,
 * where `docId` is the contentId of the document rendered for the item.
 *
 * Calculates new resulting scores, caches them, and returns them.
 * See the return of {@link calculateScoreAndCacheResults}
 */
export async function saveScoreAndState({
  contentId,
  loggedInUserId,
  attemptNumber,
  score,
  state,
  item,
  shuffledItemOrder,
  variant,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
  attemptNumber: number;
  score: number | null;
  state: string;
  item?: {
    itemNumber?: number;
    shuffledItemNumber?: number;
    itemAttemptNumber: number;
    score: number;
    state: string;
  };
  shuffledItemOrder?: {
    shuffledItemNumber: number;
    docId: Uint8Array;
    variant: number;
  }[];
  variant: number;
}) {
  let itemNumber = 0;
  if (item) {
    // check item number first to throw error before any database changes are made
    itemNumber =
      item.itemNumber ??
      shuffledItemOrder!.findIndex(
        (x) => x.shuffledItemNumber === item.shuffledItemNumber,
      ) + 1;

    if (itemNumber === 0) {
      throw new InvalidRequestError(
        "A valid itemNumber or shuffledItemNumber must be supplied",
      );
    }

    if (score !== null) {
      throw new InvalidRequestError(
        "If an item is supplied, then the overall score cannot be supplied",
      );
    }
  } else if (score === null) {
    throw new InvalidRequestError(
      "If an item is not supplied, then the overall score must be supplied",
    );
  }

  async function getMaxAttemptNumber() {
    const assignment = await prisma.content.findUniqueOrThrow({
      where: {
        id: contentId,
      },
      select: {
        contentStates: {
          distinct: ["contentId", "userId"],
          where: { userId: loggedInUserId },
          orderBy: { attemptNumber: "desc" },
          select: { attemptNumber: true },
        },
      },
    });

    const maxAttemptNumber = assignment.contentStates[0]?.attemptNumber ?? 0;
    return maxAttemptNumber;
  }

  let maxAttemptNumber = await getMaxAttemptNumber();

  if (maxAttemptNumber === 0) {
    await createNewAttempt({
      contentId,
      variant,
      state,
      loggedInUserId,
      shuffledItemOrder,
    });

    maxAttemptNumber = await getMaxAttemptNumber();
  }

  if (attemptNumber !== maxAttemptNumber) {
    throw new InvalidRequestError(
      "Cannot save score and state to non-maximal attempt number",
    );
  }

  // invalidate cached score
  await prisma.assignmentScores.upsert({
    where: { contentId_userId: { contentId, userId: loggedInUserId } },
    create: {
      contentId,
      userId: loggedInUserId,
      cachedScore: null,
      cachedBestAttemptNumber: 1,
      cachedItemScores: null,
      cachedLatestAttempt: null,
    },
    update: {
      cachedScore: null,
      cachedBestAttemptNumber: 1,
      cachedItemScores: null,
      cachedLatestAttempt: null,
    },
  });

  if (item) {
    // Before actually update any score/state data, make sure have a valid itemAttemptNumber
    const maxItemResult = await prisma.contentItemState.aggregate({
      where: {
        contentId,
        userId: loggedInUserId,
        contentAttemptNumber: attemptNumber,
        itemNumber,
      },
      _max: {
        itemAttemptNumber: true,
      },
    });

    const maxItemAttemptNumber = maxItemResult._max.itemAttemptNumber ?? 0;

    if (
      item.itemAttemptNumber !== maxItemAttemptNumber &&
      !(item.itemAttemptNumber === 1 && maxItemAttemptNumber === 0)
    ) {
      throw new InvalidRequestError(
        "Cannot save score and state to non-maximal item attempt number",
      );
    }

    const { shuffledItemNumber, docId } = shuffledItemOrder![itemNumber - 1];

    // perform all score/state updates for activity and item in a single transaction
    await prisma.contentState.update({
      where: {
        contentId_userId_attemptNumber: {
          contentId,
          userId: loggedInUserId,
          attemptNumber,
        },
      },
      data: {
        score,
        state,
        contentItemStates: {
          update: {
            where: {
              contentId_userId_contentAttemptNumber_itemNumber_itemAttemptNumber:
                {
                  contentId,
                  userId: loggedInUserId,
                  contentAttemptNumber: attemptNumber,
                  itemNumber,
                  itemAttemptNumber: item!.itemAttemptNumber,
                },
            },
            data: {
              score: item.score,
              state: item.state,
              shuffledItemNumber,
              docId,
            },
          },
        },
      },
    });
  } else {
    // no items, update activity score/state
    await prisma.contentState.update({
      where: {
        contentId_userId_attemptNumber: {
          contentId,
          userId: loggedInUserId,
          attemptNumber,
        },
      },
      data: {
        score,
        state,
      },
    });
  }

  return await calculateScoreAndCacheResults({
    contentId,
    loggedInUserId,
  });
}

/**
 * Create a new attempt of assignment `contentId` for `loggedInUserId`, assuming `code` matches.
 *
 * The behavior depends on whether or not `itemNumber` is specified and it must correspond to the assignment mode and type as follows:
 * - If the assignment mode is "formative" and the type is not "singleDoc", then `itemNumber` must be supplied,
 *   and the result will be to create a new attempt of just that item.
 * - If the assignment mode is "summative" or the type is "singleDoc", then `itemNumber` must not be supplied,
 *   and the result will bee to create an new attempt of the entire activity from the given `variant` and `state`.
 *   (`state` is needed only for non-singleDocs, as it contains information about the item attempt numbers.)
 *
 * If the presence of `itemNumber` does not match the assignment mode/type, then an `InvalidRequestError` is thrown.
 *
 * If `shuffledItemOrder` is specified, then:
 * - if `itemNumber` is not specified, create new item attempts for all items using the fields `shuffledItemNumber`, `docId`, and `variant`
 *   the `shuffledItemOrder`  array.
 *   as given by `shuffledItemOrder`.
 * - if `itemNumber` is specified, then look on values of `shuffledItemNumber`, `docId`, and `variant`
 *   from the `shuffledItemOrder` to create the new item attempt just for that item.
 *
 * If `itemNumber` is specified but not `shuffledItemOrder`, then an `InvalidRequestError` is thrown.
 *
 * Calculates new resulting scores, caches them, and returns them.
 * See the return of {@link calculateScoreAndCacheResults}
 */
export async function createNewAttempt({
  contentId,
  variant,
  state,
  loggedInUserId,
  itemNumber,
  shuffledItemNumber,
  shuffledItemOrder,
}: {
  contentId: Uint8Array;
  variant: number;
  state: string | null;
  loggedInUserId: Uint8Array;
  itemNumber?: number;
  shuffledItemNumber?: number;
  shuffledItemOrder?: {
    shuffledItemNumber: number;
    docId: Uint8Array;
    variant: number;
  }[];
}) {
  // Make sure user has permission to view this assignment
  const scopedCourseId = await getScopedStudentCourseId(loggedInUserId);
  const isAnonymous = await getIsAnonymous(loggedInUserId);
  const ownerIsPremium = await getOwnerIsPremium(contentId);

  const assignment = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ...filterViewableRootAssignment({
        loggedInUserId,
        courseRootIdOfScopedUser: scopedCourseId,
        isAnonymous,
        ownerIsPremium,
      }),
    },
    select: {
      mode: true,
      maxAttempts: true,
      type: true,
      courseRootId: true,
      contentStates: {
        distinct: ["contentId", "userId"],
        where: { userId: loggedInUserId },
        orderBy: { attemptNumber: "desc" },
        select: { attemptNumber: true },
      },
    },
  });

  const maxAttemptNumber = assignment.contentStates[0]?.attemptNumber ?? 0;

  if (assignment.mode === "formative" && assignment.type !== "singleDoc") {
    if (shuffledItemOrder === undefined) {
      throw new InvalidRequestError(
        "Cannot create attempts of formative assessments without specifying shuffledItemOrder",
      );
    }

    if (itemNumber === undefined && shuffledItemNumber === undefined) {
      if (maxAttemptNumber > 0) {
        throw new InvalidRequestError(
          "Formative assessments do not support creating new attempts of entire activity",
        );
      }
    } else {
      // We are creating a new attempt of just one item for a formative assessment

      if (maxAttemptNumber === 0) {
        throw new InvalidRequestError(
          "Cannot create a new attempt of an item when the initial attempt has not yet been created",
        );
      }

      if (itemNumber === undefined) {
        // We specified the item with shuffledItemNumber rather than item number.
        // Determine the item number from shuffledItemOrder
        itemNumber =
          shuffledItemOrder.findIndex(
            (x) => x.shuffledItemNumber === shuffledItemNumber,
          ) + 1;

        if (itemNumber === 0) {
          throw new InvalidRequestError(
            "An invalid shuffledItemNumber was supplied",
          );
        }
      }

      if (itemNumber > shuffledItemOrder.length) {
        throw new InvalidRequestError("An invalid itemNumber was supplied");
      }
    }
  } else if (itemNumber !== undefined || shuffledItemNumber !== undefined) {
    throw new InvalidRequestError(
      "Summative assessments and single documents do not support creating new attempts of single items",
    );
  }

  // invalidate cached score
  await prisma.assignmentScores.upsert({
    where: { contentId_userId: { contentId, userId: loggedInUserId } },
    create: {
      contentId,
      userId: loggedInUserId,
      cachedScore: null,
      cachedBestAttemptNumber: 1,
      cachedItemScores: null,
      cachedLatestAttempt: null,
    },
    update: {
      cachedScore: null,
      cachedBestAttemptNumber: 1,
      cachedItemScores: null,
      cachedLatestAttempt: null,
    },
  });

  if (itemNumber === undefined) {
    // create a new attempt of the entire activity,
    // optionally with related records for items (if shuffledItemOrder if given)

    if (
      assignment.maxAttempts > 0 &&
      maxAttemptNumber >= assignment.maxAttempts
    ) {
      throw new InvalidRequestError(
        "Cannot create new attempt; maximum number of attempts exceeded",
      );
    }

    await prisma.contentState.create({
      data: {
        contentId,
        userId: loggedInUserId,
        variant,
        attemptNumber: maxAttemptNumber + 1,
        score: shuffledItemOrder ? null : 0,
        state,
        contentItemStates: {
          create: shuffledItemOrder?.map(
            ({ shuffledItemNumber, docId, variant }, idx) => ({
              itemNumber: idx + 1,
              itemAttemptNumber: 1,
              shuffledItemNumber,
              docId,
              variant,
            }),
          ),
        },
      },
    });
  } else {
    // create a new attempt of just item `itemNumber` or `shuffleItemNumber`

    const maxResItem = await prisma.contentItemState.aggregate({
      where: {
        contentId,
        userId: loggedInUserId,
        contentAttemptNumber: maxAttemptNumber,
        itemNumber,
      },
      _max: {
        itemAttemptNumber: true,
      },
    });

    const maxItemAttemptNumber = maxResItem._max.itemAttemptNumber;

    if (maxItemAttemptNumber === null) {
      throw new InvalidRequestError(
        "Cannot create a new attempt of an item that doesn't exist",
      );
    }

    if (
      assignment.maxAttempts > 0 &&
      maxItemAttemptNumber >= assignment.maxAttempts
    ) {
      throw new InvalidRequestError(
        "Cannot create new attempt of item; maximum number of attempts exceeded",
      );
    }

    await prisma.contentState.update({
      where: {
        contentId_userId_attemptNumber: {
          contentId,
          userId: loggedInUserId,
          attemptNumber: maxAttemptNumber,
        },
      },
      data: {
        state,
        contentItemStates: {
          create: {
            itemNumber,
            itemAttemptNumber: maxItemAttemptNumber + 1,
            ...shuffledItemOrder![itemNumber - 1],
          },
        },
      },
    });
  }

  return await calculateScoreAndCacheResults({
    contentId,
    loggedInUserId,
  });
}

/**
 * Load the state and score for `attemptNumber` of assignment `contentId` by `requestedUserId`,
 * defaulting to `loggedInUserId` if `requestedUserId` is not specified.
 * If `attemptNumber` is not specified, load state from the latest attempt.
 *
 * If `requestedUserId` is specified to be different from `loggedInUserId`,
 * the state will be loaded only if `loggedInUserId` is the owner of `contentId`.
 *
 * Also loads any item state and score from the latest `itemAttemptNumber` associated with `attemptNumber`,
 * ordered by their `shuffledItemNumber`.
 *
 * Returns:
 * - loadedState: `true` if succeeded in loading state
 * If `loadedState` is `true`, then also returns:
 * - attemptNumber: the attempt number for which the state was loaded
 * - score: the user's score on this attempt
 * - state: the user's state for this attempt, or `null` if no state
 * - items: an array of `itemNumber`, `shuffledItemNumber`, `itemAttemptNumber`, `score`, and `state`
 *   ordered by `shuffledItemNumber`.
 */
export async function loadState({
  contentId,
  requestedUserId,
  loggedInUserId,
  attemptNumber,
}: {
  contentId: Uint8Array;
  requestedUserId?: Uint8Array;
  loggedInUserId: Uint8Array;
  attemptNumber?: number;
}) {
  const stateUserId = requestedUserId ?? loggedInUserId;

  try {
    await prisma.content.findUniqueOrThrow({
      where: {
        id: contentId,
        // if getting data for other person, you must be the owner
        ownerId: isEqualUUID(stateUserId, loggedInUserId)
          ? undefined
          : loggedInUserId,
        isDeletedOn: null,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return { loadedState: false as const };
    } else {
      throw e;
    }
  }

  let contentState;
  if (attemptNumber) {
    try {
      contentState = await prisma.contentState.findUniqueOrThrow({
        where: {
          contentId_userId_attemptNumber: {
            contentId,
            userId: stateUserId,
            attemptNumber,
          },
        },
        select: {
          attemptNumber: true,
          state: true,
          score: true,
          variant: true,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return { loadedState: false as const };
      } else {
        throw e;
      }
    }
  } else {
    // If `attemptNumber` is not specified, attempt to load the latest attempt.

    const lastAttemptState = await prisma.contentState.findMany({
      where: { contentId, userId: stateUserId },
      orderBy: { attemptNumber: "desc" },
      distinct: ["contentId", "userId"],
      select: {
        attemptNumber: true,
        state: true,
        score: true,
        variant: true,
      },
    });

    if (lastAttemptState.length !== 1) {
      return { loadedState: false as const };
    }

    contentState = lastAttemptState[0];
  }

  const itemState = await prisma.contentItemState.findMany({
    where: {
      contentId,
      userId: stateUserId,
      contentAttemptNumber: contentState.attemptNumber,
    },
    distinct: ["contentId", "userId", "contentAttemptNumber", "itemNumber"],
    orderBy: [{ shuffledItemNumber: "asc" }, { itemAttemptNumber: "desc" }],
    select: {
      itemNumber: true,
      itemAttemptNumber: true,
      shuffledItemNumber: true,
      state: true,
      score: true,
      variant: true,
      docId: true,
    },
  });

  if (itemState.length > 0) {
    // If have items, the `score` field on `contentState` is ignored.
    // Instead, we calculate the score as the average of the items.

    const score =
      itemState.reduce((a, c) => a + (c?.score ?? 0), 0) / itemState.length;

    contentState.score = score;
  }

  return {
    loadedState: true as const,
    ...contentState,
    items: itemState,
  };
}

/**
 * Load the state and score for one item of `contentAttemptNumber` of assignment `contentId` by `requestedUserId`,
 * defaulting to `loggedInUserId` if `requestedUserId` is not specified.
 * If `contentAttemptNumber` is not specified, load state from the last attempt.
 *
 * The item returned is determined by `itemNumber`, if defined, else `shuffledItemNumber`,
 * loading for item number 1 if neither was supplied.
 * Item state from `itemAttemptNumber` is loaded, defaulting to loading state from the last item attempt if not specified.
 *
 * If `requestedUserId` is specified to be different from `loggedInUserId`,
 * the state will be loaded only if `loggedInUserId` is the owner of `contentId`.
 *
 * Returns:
 * - loadedState: `true` if succeeded in loading state
 * If `loadedState` is `true`, then also returns:
 * - contentAttemptNumber: the attempt number of the activity for which the state was loaded
 * - itemAttemptNumber: the attempt number of the item for which state was loaded
 * - itemNumber: the (original, unshuffled) item number of the item for which state was loaded
 * - shuffledItemNumber: the potentially shuffled item number of the order the student viewed
 * - score: the user's score on this attempt of the item
 * - state: the user's state for this attempt of the item, or `null` if no state
 */
export async function loadItemState({
  contentId,
  requestedUserId,
  loggedInUserId,
  contentAttemptNumber,
  itemNumber,
  shuffledItemNumber,
  itemAttemptNumber,
}: {
  contentId: Uint8Array;
  requestedUserId?: Uint8Array;
  loggedInUserId: Uint8Array;
  contentAttemptNumber?: number;
  itemNumber?: number;
  shuffledItemNumber?: number;
  itemAttemptNumber?: number;
}) {
  const stateUserId = requestedUserId ?? loggedInUserId;

  if (itemNumber === undefined) {
    if (shuffledItemNumber === undefined) {
      // if both item numbers are undefined, get itemNumber 1
      itemNumber = 1;
    }
  } else if (shuffledItemNumber !== undefined) {
    // if both item numbers are defined, just use itemNumber
    shuffledItemNumber = undefined;
  }

  // it attemptNumber was not supplied, find the maximum attempt number, defaulting to 1 if not attempts taken
  if (contentAttemptNumber === undefined) {
    const maxResult = await prisma.contentState.aggregate({
      where: {
        contentId,
        userId: loggedInUserId,
      },
      _max: {
        attemptNumber: true,
      },
    });

    contentAttemptNumber = maxResult._max.attemptNumber ?? 1;
  }

  const contentStateWhere = {
    assignment: {
      // if getting data for other person, you must be the owner
      ownerId: isEqualUUID(stateUserId, loggedInUserId)
        ? undefined
        : loggedInUserId,
      isDeletedOn: null,
    },
  };

  const select = {
    contentAttemptNumber: true,
    itemAttemptNumber: true,
    itemNumber: true,
    shuffledItemNumber: true,
    state: true,
    score: true,
    variant: true,
    docId: true,
  };

  let itemState;

  if (itemAttemptNumber) {
    try {
      if (itemNumber === undefined) {
        itemState = await prisma.contentItemState.findUniqueOrThrow({
          where: {
            contentId_userId_contentAttemptNumber_shuffledItemNumber_itemAttemptNumber:
              {
                contentId,
                userId: stateUserId,
                contentAttemptNumber: contentAttemptNumber,
                shuffledItemNumber: shuffledItemNumber!,
                itemAttemptNumber,
              },
            contentState: contentStateWhere,
          },
          select,
        });
      } else {
        itemState = await prisma.contentItemState.findUniqueOrThrow({
          where: {
            contentId_userId_contentAttemptNumber_itemNumber_itemAttemptNumber:
              {
                contentId,
                userId: stateUserId,
                contentAttemptNumber: contentAttemptNumber,
                itemNumber,
                itemAttemptNumber,
              },
            contentState: contentStateWhere,
          },
          select,
        });
      }
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return { loadedState: false as const };
      } else {
        throw e;
      }
    }
  } else {
    // If `itemAttemptNumber` is not specified, attempt to load the latest attempt.

    const lastAttemptState = await prisma.contentItemState.findMany({
      where: {
        contentId,
        userId: stateUserId,
        contentAttemptNumber: contentAttemptNumber,
        itemNumber,
        shuffledItemNumber,
        contentState: contentStateWhere,
      },
      orderBy: { itemAttemptNumber: "desc" },
      distinct: ["contentId", "userId"],
      select,
    });

    if (lastAttemptState.length !== 1) {
      return { loadedState: false as const };
    }

    itemState = lastAttemptState[0];
  }

  return {
    loadedState: true as const,
    ...itemState,
  };
}

/**
 * Calculate the overall score, item scores if they exist, and latest scores of `requestedUserId` for assignment `contentId`.
 * If `requestedUserId` is not specified, default to `loggedInUserId`.
 * Cache the results and return them.
 *
 * If `requestedUserId` is specified to be different from `loggedInUserId`,
 * will thrown an error if `loggedInUserId` is not the owner of `contentId`.
 *
 * Returns a promise resolving to the object with the fields:
 * - calculatedScore: `true` if the scores were successfully calculated
 * If `calculatedSore` is `true`, then also returns the fields:
 * - score: the total score of the user on the assignment.
 * - bestAttemptNumber: the content attempt number where `score` was achieved
 * - itemScores: if the assignment has items, then the scores of the items that lead to `score`.
 *   `itemScores` is an array of the item's `score` and its `itemNumber`, ordered by `shuffledItemNumber`.
 * - latestAttempt: an object giving the scores for the latest attempt
 *
 * `latestAttempt` has the fields:
 * - attemptNumber: the latest activity-wide attempt number
 * - score: the score achieved on the latest attempt
 * - itemScores: if the assignment has items, then this array has each item's `score`, `itemNumber`, and `itemAttemptNumber`,
 *   for the last attempt on the item, ordered by `shuffledItemNumber`
 */
export async function calculateScoreAndCacheResults({
  contentId,
  requestedUserId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  requestedUserId?: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  const scoreUserId = requestedUserId ?? loggedInUserId;

  // if getting data for other person, you must be the owner
  const forMyself = isEqualUUID(scoreUserId, loggedInUserId);

  const assignment = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ownerId: forMyself ? undefined : loggedInUserId,
      isDeletedOn: null,
    },
    select: {
      mode: true,
      contentStates: {
        where: { userId: scoreUserId },
        distinct: ["contentId", "userId"],
        orderBy: { attemptNumber: "desc" },
        select: {
          attemptNumber: true,
        },
      },
    },
  });

  const mode = assignment.mode;
  if (assignment.contentStates.length !== 1) {
    return { calculatedScore: false as const };
  }

  const latestAttemptNumber = assignment.contentStates[0].attemptNumber;

  // Get the score for each attempt
  // For each attempt, also calculate the latest score for each item
  const scoreByAttemptPrelim = await prisma.contentState.findMany({
    where: { contentId, userId: scoreUserId },
    orderBy: { attemptNumber: "asc" },
    select: {
      score: true,
      contentItemStates: {
        distinct: ["contentId", "userId", "shuffledItemNumber"],
        orderBy: [{ shuffledItemNumber: "asc" }, { itemAttemptNumber: "desc" }],
        select: {
          itemNumber: true,
          itemAttemptNumber: true,
          score: true,
        },
      },
    },
  });

  if (scoreByAttemptPrelim.length === 0) {
    return { calculatedScore: false as const };
  }

  // If we have items, then the score in the database should be null.
  // Replace that score with the average over items
  const scoreByAttempt = scoreByAttemptPrelim.map((sba) => {
    let score = sba.score;
    if (score === null) {
      score =
        sba.contentItemStates.reduce((a, c) => a + c.score, 0) /
        sba.contentItemStates.length;
    }
    return {
      ...sba,
      score,
    };
  });

  // In most cases, the score is the maximum over all attempts.
  // (We'll change it for a formative assessment with items, below.)
  let score = Math.max(...scoreByAttempt.map((sba) => sba.score));
  // break ties by selecting the latest attempt number
  const bestAttemptNumber =
    scoreByAttempt.map((sba) => sba.score).lastIndexOf(score) + 1;

  // The array itemScores represents the items that lead to the actual score.
  // For summative, it is the scores from the attempt that gave the maximum score.
  // For formative, it is the maximum score for that item over all attempts.
  let itemScores: ItemScores = [];

  if (scoreByAttempt[0].contentItemStates.length > 0) {
    if (mode === "summative") {
      // For summative, find the items from the attempt that gave the maximum score
      itemScores = scoreByAttempt[bestAttemptNumber - 1].contentItemStates;
    } else {
      // For formative, determine the maximum score on each item over all attempts.

      if (latestAttemptNumber !== 1) {
        throw Error(
          "Invalid data encountered. Should have only one attempt for a formative assessment with items",
        );
      }

      itemScores = await prisma.contentItemState.findMany({
        where: { contentId, userId: scoreUserId },
        distinct: ["contentId", "userId", "itemNumber"],
        orderBy: [
          { shuffledItemNumber: "asc" },
          { score: "desc" },
          { itemAttemptNumber: "desc" }, // break ties by selecting the latest item attempt number
        ],
        select: {
          itemNumber: true,
          score: true,
          itemAttemptNumber: true,
        },
      });

      // Since we have a formative assessment with items,
      // score instead is the average of the maximum score from each item (over all item attempts)
      score = itemScores.reduce((a, c) => a + c.score, 0) / itemScores.length;
    }
  }

  // Next, calculate the score from just the latest attempt number
  const latestAttemptScore = scoreByAttempt[scoreByAttempt.length - 1];
  const latestItemScores = latestAttemptScore.contentItemStates;

  let latestScore = latestAttemptScore.score;
  if (latestItemScores.length > 0) {
    // for all assessments with items, the score for the latest attempt is the average of the latest item scores
    latestScore =
      latestItemScores.reduce((a, c) => a + c.score, 0) /
      latestItemScores.length;
  }

  const latestAttempt = {
    attemptNumber: latestAttemptNumber,
    score: latestScore,
    itemScores: latestItemScores,
  };

  // cache the score information in the assignment scores table
  await prisma.assignmentScores.update({
    where: { contentId_userId: { contentId, userId: scoreUserId } },
    data: {
      cachedScore: score,
      cachedBestAttemptNumber: bestAttemptNumber,
      cachedItemScores:
        itemScores.length > 0 ? JSON.stringify(itemScores) : null,
      cachedLatestAttempt: JSON.stringify(latestAttempt),
    },
  });

  return {
    calculatedScore: true as const,
    score,
    bestAttemptNumber,
    itemScores,
    latestAttempt,
  };
}

/**
 * Get the overall score, item scores if they exist, and latest scores of `requestedUserId` for assignment `contentId`.
 * If `requestedUserId` is not specified, default to `loggedInUserId`.
 *
 * Used cached results, if available, otherwise calculate the results and cache them.
 *
 * If `requestedUserId` is specified to be different from `loggedInUserId`,
 * the score will be loaded only if `loggedInUserId` is the owner of `contentId`.
 *
 * Returns: See the return of {@link calculateScoreAndCacheResults}
 */
export async function getScore({
  contentId,
  requestedUserId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  requestedUserId?: Uint8Array;
  loggedInUserId: Uint8Array;
}): Promise<ScoreData> {
  const scoreUserId = requestedUserId ?? loggedInUserId;

  // verify have access
  await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      // if getting data for other person, you must be the owner
      ownerId: isEqualUUID(scoreUserId, loggedInUserId)
        ? undefined
        : loggedInUserId,
      isDeletedOn: null,
    },
  });

  // attempt to get data from cache
  const cachedData = await prisma.assignmentScores.findUnique({
    where: { contentId_userId: { contentId, userId: scoreUserId } },
    select: {
      cachedScore: true,
      cachedBestAttemptNumber: true,
      cachedItemScores: true,
      cachedLatestAttempt: true,
    },
  });

  if (cachedData !== null) {
    if (
      cachedData.cachedScore !== null &&
      cachedData.cachedLatestAttempt !== null
    ) {
      let itemScores: ItemScores = [];
      if (cachedData.cachedItemScores !== null) {
        const cachedItems = JSON.parse(cachedData.cachedItemScores);
        if (isItemScores(cachedItems)) {
          itemScores = cachedItems;
        }
      }
      const cachedLatest = JSON.parse(cachedData.cachedLatestAttempt);
      if (isCachedLatestAttempt(cachedLatest)) {
        return {
          calculatedScore: true as const,
          score: cachedData.cachedScore,
          bestAttemptNumber: cachedData.cachedBestAttemptNumber,
          itemScores,
          latestAttempt: cachedLatest,
        };
      }
    }
  }

  return await calculateScoreAndCacheResults({
    contentId,
    requestedUserId,
    loggedInUserId,
  });
}

/**
 * Given that `contentId` is an assignment owned by `loggedInUserId`,
 * return all the scores that students have achieved on `contentId`.
 *
 * Uses cached values, if they exist, otherwise calculates the values.
 *
 * @returns a Promise that resolves to an object with fields
 * - mode: the assignment mode (formative or summative)
 * - scores: an array with one entry per student that has taken `contentId`.
 *
 * Each element of the scores array is an object with fields
 * - user: a `UserInfo` object for the student
 * - score: the total score of the user on the assignment.
 * - bestAttemptNumber: the content attempt number where `score` was achieved
 * - itemScores: if the assignment has items, then the scores of the items that lead to `score`.
 *   `itemScores` is an array of the item's `score` and its `itemNumber`, ordered by `shuffledItemNumber`.
 * - latestAttempt: an object giving the scores for the latest attempt
 *
 * See the return of {@link calculateScoreAndCacheResults} for more details on the score fields returned.
 */
export async function getScoresOfAllStudents({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  const { mode } = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ...filterEditableRootAssignment(loggedInUserId),
    },
    select: { mode: true },
  });

  // get cached scores
  const cachedScores = await prisma.assignmentScores.findMany({
    where: { contentId },
    orderBy: [{ user: { lastNames: "asc" } }, { user: { firstNames: "asc" } }],
    select: {
      user: {
        select: {
          firstNames: true,
          lastNames: true,
          userId: true,
          isAnonymous: true,
        },
      },
      cachedScore: true,
      cachedBestAttemptNumber: true,
      cachedItemScores: true,
      cachedLatestAttempt: true,
    },
  });

  const scores: {
    score: number;
    bestAttemptNumber: number;
    itemScores: ItemScores | null;
    latestAttempt: LatestAttempt | null;
    user: UserInfo;
  }[] = [];

  for (const scoreObj of cachedScores) {
    if (scoreObj.cachedScore === null) {
      const calcResults = await calculateScoreAndCacheResults({
        contentId,
        requestedUserId: scoreObj.user.userId,
        loggedInUserId,
      });

      if (calcResults.calculatedScore) {
        scores.push({
          score: calcResults.score,
          bestAttemptNumber: calcResults.bestAttemptNumber,
          itemScores: calcResults.itemScores,
          latestAttempt: calcResults.latestAttempt,
          user: scoreObj.user,
        });
      } else {
        throw Error("Invalid data. Could not calculate score for student");
      }
    } else {
      let itemScores: ItemScores = [];

      if (scoreObj.cachedItemScores !== null) {
        const cachedItems = JSON.parse(scoreObj.cachedItemScores);
        if (isItemScores(cachedItems)) {
          itemScores = cachedItems;
        }
      }

      let latestAttempt: LatestAttempt | null = null;
      if (scoreObj.cachedLatestAttempt !== null) {
        const cachedLatest = JSON.parse(scoreObj.cachedLatestAttempt);
        if (isCachedLatestAttempt(cachedLatest)) {
          latestAttempt = cachedLatest;
        }
      }

      const { isAnonymous, ...user } = scoreObj.user;

      scores.push({
        score: scoreObj.cachedScore,
        bestAttemptNumber: scoreObj.cachedBestAttemptNumber,
        itemScores,
        latestAttempt,
        user,
      });
    }
  }

  return {
    mode,
    scores,
  };
}
