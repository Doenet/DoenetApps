import { Prisma } from "@prisma/client";
import { Content } from "../types";
import {
  filterViewableContent,
  getIsEditor,
  viewableContentWhere,
} from "../utils/permissions";
import { prisma } from "../model";
import { processContent, returnContentSelect } from "../utils/contentStructure";
import { getSingleLibraryRelations, maskLibraryUserInfo } from "./curate";
import { isEqualUUID } from "../utils/uuid";
import { getRemixSources } from "./remix";
import { recordContentView } from "./popularity";

export async function getActivityViewerData({
  contentId,
  loggedInUserId = new Uint8Array(16),
}: {
  contentId: Uint8Array;
  loggedInUserId?: Uint8Array;
}) {
  const isEditor = await getIsEditor(loggedInUserId);

  const activity = await getContent({
    contentId,
    loggedInUserId,
    isEditor,
    includeOwnerDetails: true,
    includeClassifications: true,
  });

  if (!isEqualUUID(loggedInUserId, activity.ownerId)) {
    await recordContentView(contentId, loggedInUserId);
  }

  const { remixSources } = await getRemixSources({
    contentId,
    loggedInUserId,
    isEditor,
  });

  // Replace library owner info with source owner info
  activity.owner = await maskLibraryUserInfo({
    contentId: activity.contentId,
    owner: activity.owner!,
  });

  const curatedSourceUsers = await Promise.all(
    remixSources.map(
      async (remix) =>
        await maskLibraryUserInfo({
          contentId: remix.originContent.contentId,
          owner: remix.originContent.owner,
        }),
    ),
  );
  for (let i = 0; i < remixSources.length; i++) {
    remixSources[i].originContent.owner = curatedSourceUsers[i];
  }

  const libraryRelations = await getSingleLibraryRelations({
    contentId,
    loggedInUserId,
  });

  return {
    activity,
    remixSources,
    libraryRelations,
  };
}

/**
 * Get the content structure for `contentId`, recursing to all descendants
 * to populate the `children` field of it and its descendants.
 *
 *  If `skipPermissionCheck` is `true`, then we assume the calling function
 *  already determined that `loggedInUserId` has access and we skip the check that is viewable.
 */
export async function getContent({
  contentId,
  loggedInUserId,
  includeAssignInfo = false,
  includeClassifications = false,
  includeShareDetails = false,
  includeOwnerDetails = false,
  includeRepeatInProblemSet = false,
  isEditor = false,
  skipPermissionCheck = false,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
  includeAssignInfo?: boolean;
  includeClassifications?: boolean;
  includeShareDetails?: boolean;
  includeOwnerDetails?: boolean;
  includeRepeatInProblemSet?: boolean;
  isEditor?: boolean;
  skipPermissionCheck?: boolean;
}) {
  let permissionCheck;
  if (skipPermissionCheck) {
    permissionCheck = { isDeletedOn: null };
  } else {
    permissionCheck = {
      AND: [
        filterViewableContent(loggedInUserId, isEditor),
        { type: { not: "folder" as const } },
      ],
    };
  }

  // 1. verify that `loggedInUserId` can view content
  await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ...permissionCheck,
    },
    select: { id: true },
  });

  // 2. get an ordered list of all the content inside `contentId`
  const matches = await prisma.$queryRaw<
    {
      id: Uint8Array;
      parentId: Uint8Array;
    }[]
  >(Prisma.sql`
    WITH RECURSIVE content_tree(id, parentId, sortIndex) AS (
    SELECT id, parentId, sortIndex FROM content
    WHERE parentId = ${contentId}
      ${skipPermissionCheck ? Prisma.sql`AND content.isDeletedOn IS NULL` : Prisma.sql`AND ${viewableContentWhere(loggedInUserId, isEditor)}`}
    UNION ALL
    SELECT content.id, content.parentId, content.sortIndex FROM content
    INNER JOIN content_tree AS ct
    ON content.parentId = ct.id
    WHERE 
      ${skipPermissionCheck ? Prisma.sql`content.isDeletedOn IS NULL` : Prisma.sql`${viewableContentWhere(loggedInUserId, isEditor)}`}
  )
  SELECT id, parentId from content_tree
    ORDER BY
      parentId, sortIndex
`);

  // 3. get all the details on content and its descendants

  const contentSelect = returnContentSelect({
    includeAssignInfo,
    includeClassifications,
    includeShareDetails,
    includeOwnerDetails,
    includeRepeatInProblemSet,
  });

  const preliminaryList = await prisma.content.findMany({
    where: {
      id: { in: [contentId, ...matches.map((m) => m.id)] },
    },
    select: contentSelect,
    orderBy: [{ parentId: "asc" }, { sortIndex: "asc" }],
  });

  // 4. piece together all those details into a tree of the form given by `Content`
  const idx = preliminaryList.findIndex((c) => isEqualUUID(c.id, contentId));
  const activity = processContent(
    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    preliminaryList[idx],
    loggedInUserId,
  );

  preliminaryList.splice(idx, 1);

  function findDescendants(id: Uint8Array) {
    const children: Content[] = [];
    for (let i = 0; i < preliminaryList.length; i++) {
      if (isEqualUUID(preliminaryList[i].parent!.id, id)) {
        //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
        children.push(processContent(preliminaryList[i], loggedInUserId));
        preliminaryList.splice(i, 1);
        i--;
      }
    }

    for (const child of children) {
      if (child.type !== "singleDoc") {
        child.children = findDescendants(child.contentId);
      }
    }

    return children;
  }

  if (activity.type !== "singleDoc") {
    activity.children = findDescendants(activity.contentId);
  }

  return activity;
}

/**
 * Get content for `contentId` as though one were not logged in,
 * i.e., only showing public content.
 * Calls `getContent` with a blank `loggedInUserId`.
 */
export async function getPublicContent({
  contentId,
}: {
  contentId: Uint8Array;
}) {
  const activity = await getContent({
    contentId,
    loggedInUserId: new Uint8Array(16),
  });

  return { activity };
}

/**
 * Attempts to find public content that has a content revision with `cid`.
 */
export async function getPublicContentByCid({ cid }: { cid: string }) {
  const content = await prisma.contentRevisions.findFirstOrThrow({
    where: {
      cid,
      content: { isDeletedOn: null, isPublic: true, type: { not: "folder" } },
    },
    select: {
      contentId: true,
      source: true,
      doenetmlVersion: { select: { fullVersion: true } },
      content: { select: { type: true, name: true } },
    },
  });

  return {
    activity: {
      contentId: content.contentId,
      doenetML: content.source,
      doenetmlVersion: content.doenetmlVersion,
      type: content.content.type,
      name: content.content.name,
    },
  };
}
