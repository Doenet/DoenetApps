import { Prisma } from "@prisma/client";
import { prisma } from "../model";
import { isEqualUUID } from "./uuid";
import { DateTime } from "luxon";
import { InvalidRequestError } from "./error";

/**
 * Assert user is editor
 */
export async function mustBeEditor(
  userId: Uint8Array,
  message = "You must be an community editor to take this action",
) {
  const isEditor = await getIsEditor(userId);
  if (!isEditor) {
    throw new InvalidRequestError(message);
  }
}

/**
 * Query whether user is editor or not.
 */
export async function getIsEditor(userId: Uint8Array) {
  const user = await prisma.users.findUnique({
    where: { userId },
    select: { isEditor: true },
  });
  let isEditor = false;
  if (user) {
    isEditor = user.isEditor;
  }
  return isEditor;
}

export async function getScopedStudentCourseId(userId: Uint8Array) {
  const user = await prisma.users.findUnique({
    where: { userId },
    select: { scopedToClassId: true },
  });
  let courseId = null;
  if (user) {
    courseId = user.scopedToClassId;
  }
  return courseId;
}

export async function getIsAnonymous(userId: Uint8Array) {
  const user = await prisma.users.findUnique({
    where: { userId },
    select: { isAnonymous: true },
  });
  let isAnonymous = false;
  if (user) {
    isAnonymous = user.isAnonymous;
  }
  return isAnonymous;
}

export async function getOwnerIsPremium(contentId: Uint8Array) {
  const owner = await prisma.users.findFirst({
    where: {
      content: {
        some: {
          id: contentId,
        },
      },
    },
    select: { isPremium: true },
  });

  const isPremium = owner?.isPremium ?? false;
  return isPremium;
}

/**
 * Query whether content is owned by the library (is a curated activity) or not.
 *
 * The curated remix returns true, the original author-owned version returns false.
 */
export async function isInLibrary(contentId: Uint8Array) {
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
  return isLibrary;
}

/**
 * Use this in Prisma's `where` clause to filter for only root assignments.
 * Use on table `contents`.
 */
const filterRootAssignment = {
  isAssignmentRoot: true,
  isDeletedOn: null,
};

/**
 * Filter Prisma's `where` clause to exclude assignment roots and their direct children.
 *
 * Assignments are shallow in the current content model, so excluding those two cases
 * excludes all assignment-owned content.
 *
 * Use on table `contents`.
 */
export const filterExcludeAssignments = {
  isAssignmentRoot: false,
  OR: [{ parent: null }, { parent: { isAssignmentRoot: false } }],
  isDeletedOn: null,
};

/**
 * Use this in Prisma's `where` clause to filter for only activities (exclude folders and assignments).
 * Use on table `contents`.
 */
const filterActivity = {
  AND: [
    { type: { not: "folder" as const }, isDeletedOn: null },
    filterExcludeAssignments,
  ],
};

/**
 * Filter Prisma's `where` clause to viewable activities for `loggedInUserId`
 *
 * For content to be viewable, one of these conditions must be true:
 * 1. `loggedInUserId` is the owner
 * 2. The content is public
 * 3. The content is shared with `loggedInUserId`
 * 4. `loggedInUserId` is an editor and the content is in the library.
 *
 * For content to be an activity, it must not be a folder and must not be attached to an assignment.
 *
 * NOTE: This function does not verify editor privileges. You must pass in the correct `isEditor` flag.
 */
export function filterViewableActivity(
  loggedInUserId?: Uint8Array,
  isEditor: boolean = false,
) {
  return {
    AND: [filterViewableContent(loggedInUserId, isEditor), filterActivity],
  };
}

/**
 * Filter Prisma's `where` clause to viewable root assignments for `loggedInUserId`
 *
 * If `loggedInUserId` is scoped to a course, then an assignment is viewable if it is in that course.
 *
 * If `loggedInUserId` is not scoped to a course, then an assignment is viewable if any of these are true:
 * 1. `loggedInUserId` is anonymous and the assignment is an open one-off assignment
 * 2. The assignment owner is premium and the assignment is an open one-off assignment
 * 3. `loggedInUserId` has score data for this assignment
 * 4. `loggedInUserId` is the owner
 *
 * For content to be a root assignment, it must be attached to an entry in the assignments table.
 */
export function filterViewableRootAssignment({
  loggedInUserId,
  courseRootIdOfScopedUser,
  isAnonymous,
  ownerIsPremium,
}: {
  loggedInUserId: Uint8Array;
  courseRootIdOfScopedUser: Uint8Array | null;
  isAnonymous: boolean;
  ownerIsPremium: boolean;
}) {
  // TODO: if owner is premium, allow regular accounts to take assignment in course
  // TODO: Once we change the user-roster relationship to be many-to-many (to allow premium instructors to roster regular accounts), make this logic clearer!
  // Suggestion: first determine if assignment is in course or not

  if (courseRootIdOfScopedUser === null) {
    const studentCondition =
      isAnonymous || ownerIsPremium
        ? {
            // TODO - confirm this works with timezone stuff
            assignmentOpenOn: {
              lte: DateTime.now().toISO(),
            },
            assignmentClosedOn: {
              gte: DateTime.now().toISO(),
            },
            courseRootId: null,
          }
        : {};

    return {
      AND: [
        filterRootAssignment,
        {
          OR: [
            studentCondition,
            {
              assignmentScores: {
                some: {
                  userId: loggedInUserId,
                },
              },
            },
            {
              ownerId: loggedInUserId,
            },
          ],
          isDeletedOn: null,
        },
      ],
    };
  } else {
    return {
      AND: [
        filterRootAssignment,
        {
          courseRootId: courseRootIdOfScopedUser,
          isDeletedOn: null,
        },
      ],
    };
  }
}

/**
 * Filter Prisma's `where` clause to viewable content for `loggedInUserId`.
 * Includes activities, folders, and assignments.
 *
 * For content to be viewable, one of these conditions must be true:
 * 1. `loggedInUserId` is the owner
 * 2. The content is public
 * 3. The content is shared with `loggedInUserId`
 * 4. `loggedInUserId` is an editor and the content is in the library.
 *
 * NOTE: This function does not verify editor privileges. You must pass in the correct `isEditor` flag.
 */
export function filterViewableContent(
  loggedInUserId?: Uint8Array,
  isEditor: boolean = false,
) {
  const visibilityOptions: (
    | { ownerId: Uint8Array }
    | { isPublic: boolean }
    | { sharedWith: { some: { userId: Uint8Array } } }
    | { owner: { isLibrary: boolean } }
  )[] = [{ isPublic: true }];

  if (loggedInUserId) {
    visibilityOptions.push({ ownerId: loggedInUserId });
    visibilityOptions.push({
      sharedWith: { some: { userId: loggedInUserId } },
    });
    if (isEditor) {
      visibilityOptions.push({ owner: { isLibrary: true } });
    }
  }

  return {
    isDeletedOn: null,
    OR: visibilityOptions,
  };
}

/**
 * Return a MySQL cause to be added to a WHERE statement, filtering to content viewable by `loggedInUserId`.
 *
 * For content to be viewable, one of these conditions must be true:
 * 1. `loggedInUserId` is the owner
 * 2. The content is public
 * 3. The content is shared with `loggedInUserId`
 * 4. `loggedInUserId` is an editor and the content is in the library.
 *
 * NOTE: This function does not verify editor privileges. You must pass in the correct `isEditor` flag.
 */
export function viewableContentWhere(
  loggedInUserId: Uint8Array,
  isEditor: boolean = false,
) {
  let visibilityOptions = Prisma.sql`
      content.ownerId = ${loggedInUserId}
      OR content.isPublic = TRUE
      OR content.id IN (SELECT contentId FROM contentShares WHERE userId = ${loggedInUserId})
  `;

  if (isEditor) {
    visibilityOptions = Prisma.sql`
        ${visibilityOptions}
        OR (SELECT isLibrary FROM users WHERE userId = content.ownerId) = TRUE
        `;
  }

  const whereStatement = Prisma.sql`
    content.isDeletedOn IS NULL
    AND (
      ${visibilityOptions}
    )
  `;

  return whereStatement;
}

/**
 * Filter Prisma's `where` clause to editable activities by `loggedInUserId`
 *
 * For content to be editable, one of these conditions must be true:
 * 1. `loggedInUserId` is the owner
 * 2. `loggedInUserId` is an editor and the content is in the library.
 *
 * For content to be an activity, it must not be a folder or an assignment.
 *
 * NOTE: This function does not verify editor privileges. You must pass in the correct `isEditor` flag.
 */
export function filterEditableActivity(
  loggedInUserId: Uint8Array,
  isEditor: boolean = false,
) {
  return {
    AND: [filterActivity, filterEditableContent(loggedInUserId, isEditor)],
  };
}

/**
 * Filter Prisma's `where` clause to editable root assignments by `loggedInUserId`
 *
 * For content to be editable, one of these conditions must be true:
 * 1. `loggedInUserId` is the owner
 *
 * For content to be a root assignment, it must be attached to an entry in the assignments table.
 */
export function filterEditableRootAssignment(loggedInUserId: Uint8Array) {
  return {
    AND: [filterEditableContent(loggedInUserId), filterRootAssignment],
  };
}

/**
 * Filter Prisma's `where` clause to exclude uneditable content by `loggedInUserId`
 *
 * For content to be editable, one of these conditions must be true:
 * 1. `loggedInUserId` is the owner
 * 2. `loggedInUserId` is an editor and the content is in the library.
 *
 * NOTE: This function does not verify editor privileges. You must pass in the correct `isEditor` flag.
 */
export function filterEditableContent(
  loggedInUserId: Uint8Array,
  isEditor: boolean = false,
) {
  const editabilityOptions: (
    | { ownerId: Uint8Array }
    | { owner: { isLibrary: boolean } }
  )[] = [{ ownerId: loggedInUserId }];

  if (isEditor) {
    editabilityOptions.push({ owner: { isLibrary: true } });
  }
  return {
    isDeletedOn: null,
    OR: editabilityOptions,
  };
}

/**
 * Return a MySQL cause to be added to a WHERE statement, filtering to content editable by `loggedInUserId`.
 *
 * For content to be viewable, one of these conditions must be true:
 * 1. `loggedInUserId` is the owner
 * 2. `loggedInUserId` is an editor and the content is in the library.
 *
 * NOTE: This function does not verify editor privileges. You must pass in the correct `isEditor` flag.
 */
export function editableContentWhere(
  loggedInUserId: Uint8Array,
  isEditor: boolean = false,
) {
  let visibilityOptions = Prisma.sql`
      content.ownerId = ${loggedInUserId}
  `;

  if (isEditor) {
    visibilityOptions = Prisma.sql`
        ${visibilityOptions}
        OR (SELECT isLibrary FROM users WHERE userId = content.ownerId) = TRUE
        `;
  }

  const whereStatement = Prisma.sql`
    content.isDeletedOn IS NULL
    AND (
      ${visibilityOptions}
    )
  `;

  return whereStatement;
}

/**
 * Get edit and view permissions for this activity.
 *
 * For an activity to be editable, one of these conditions must be true:
 * 1. You are the owner
 * 2. You are an editor and the activity is in the library
 *
 * For an activity to be viewable, these conditions also work:
 *
 * 3. The activity is public
 * 4. The activity is shared with you
 *
 * @param contentId
 * @param loggedInUserId
 * @returns
 */
export async function checkActivityPermissions(
  contentId: Uint8Array,
  loggedInUserId: Uint8Array,
  isEditor: boolean,
): Promise<{
  editable: boolean;
  viewable: boolean;
  ownerId: Uint8Array | null;
}> {
  const viewable = await prisma.content.findUnique({
    where: {
      id: contentId,
      ...filterViewableActivity(loggedInUserId, isEditor),
    },
    select: {
      // We will use these fields to determine if it is editable
      owner: {
        select: {
          userId: true,
          isLibrary: true,
        },
      },
    },
  });

  if (!viewable) {
    return { editable: false, viewable: false, ownerId: null };
  }

  // For an activity to be editable, either
  // 1. You are the owner
  // 2. You are an editor and the activity is in the library
  if (
    isEqualUUID(viewable.owner.userId, loggedInUserId) ||
    (viewable.owner.isLibrary && isEditor)
  ) {
    return { editable: true, viewable: true, ownerId: viewable.owner.userId };
  } else {
    return { editable: false, viewable: true, ownerId: viewable.owner.userId };
  }
}

export function getEarliestRecoverableDate() {
  // Only return content deleted up to 30 days ago
  return DateTime.now().minus({ days: 30 });
}
