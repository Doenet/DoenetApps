import { getLibraryAccountId, getMultipleLibraryRelations } from "./curate";
import { prisma } from "../model";
import {
  filterEditableContent,
  filterViewableContent,
  getEarliestRecoverableDate,
  mustBeEditor,
} from "../utils/permissions";
import { processContent, returnContentSelect } from "../utils/contentStructure";
import { Content } from "../types";
import { getAllCategories } from "./classification";
import { sanitizeQuery } from "../utils/search";
import { Prisma } from "@prisma/client";
import {
  returnClassificationJoins,
  returnClassificationMatchClauses,
} from "../utils/classificationsCategories";
import { fromUUID, isEqualUUID } from "../utils/uuid";
import { getAllDoenetmlVersions } from "./activity";
import { getAllLicenses } from "./license";
import { recordRecentContent } from "./recent";
import { recordContentView } from "./popularity";

export async function getMyContent({
  ownerId,
  parentId,
  loggedInUserId,
}: {
  ownerId: Uint8Array;
  parentId: Uint8Array | null;
  loggedInUserId?: Uint8Array;
}) {
  if (!loggedInUserId || !isEqualUUID(ownerId, loggedInUserId)) {
    return { notMe: true as const };
  }
  return await getMyContentOrLibraryContent({
    parentId,
    loggedInUserId,
    isLibrary: false,
  });
}

/**
 * NOTE: This function does not nicely handle invalid permissions. Use {@link getMyContent} or {@link getCurationFolderContent} instead for API calls - they both call this function.
 */
export async function getMyContentOrLibraryContent({
  parentId,
  loggedInUserId,
  isLibrary,
}: {
  parentId: Uint8Array | null;
  loggedInUserId: Uint8Array;
  isLibrary: boolean;
}) {
  const ownerId = isLibrary ? await getLibraryAccountId() : loggedInUserId;

  let parent: Content | null = null;

  if (parentId !== null) {
    // if ask for a parent, make sure it exists and is owned by logged in user
    const preliminaryParent = await prisma.content.findUniqueOrThrow({
      where: {
        id: parentId,
        ...filterEditableContent(ownerId, false),
      },
      select: returnContentSelect({ includeShareDetails: true }),
    });

    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    parent = processContent(preliminaryParent);
  }

  const additionalFilter = isLibrary
    ? {
        OR: [
          {
            isPublic: true,
          },
          {
            type: "folder" as const,
          },
        ],
      }
    : {};

  const preliminaryContent = await prisma.content.findMany({
    where: {
      ownerId,
      isDeletedOn: null,
      parentId,
      ...additionalFilter,
    },
    select: returnContentSelect({
      includeAssignInfo: true,
      includeShareDetails: true,
      includeClassifications: true,
    }),
    orderBy: { sortIndex: "asc" },
  });

  //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
  const content: Content[] = preliminaryContent.map(processContent);

  const contentIds = content.map((c) => c.contentId);
  const libraryRelations = await getMultipleLibraryRelations({
    contentIds,
    loggedInUserId,
  });

  //TODO: Does this API need to provide this extra data?
  const { allCategories } = await getAllCategories();
  const { allDoenetmlVersions } = await getAllDoenetmlVersions();
  const { allLicenses } = await getAllLicenses();

  if (parentId !== null && !isLibrary) {
    await recordRecentContent(loggedInUserId, "edit", parentId);
  }

  return {
    content,
    parent,
    libraryRelations,
    allCategories,
    allDoenetmlVersions,
    allLicenses,
    notMe: false as const,
  };
}

export async function searchMyContent({
  ownerId,
  parentId,
  loggedInUserId,
  query,
}: {
  ownerId: Uint8Array;
  parentId: Uint8Array | null;
  loggedInUserId?: Uint8Array;
  query: string;
}) {
  if (!loggedInUserId || !isEqualUUID(ownerId, loggedInUserId)) {
    return { notMe: true as const };
  }
  return await searchMyContentOrLibraryContent({
    parentId,
    loggedInUserId,
    query,
    inLibrary: false,
  });
}

/**
 * NOTE: This function does not nicely handle invalid permissions. Use {@link searchMyContent} or {@link searchCurationContent} instead for API calls - they both call this function.
 */
export async function searchMyContentOrLibraryContent({
  parentId,
  loggedInUserId,
  query,
  inLibrary,
}: {
  parentId: Uint8Array | null;
  loggedInUserId: Uint8Array;
  query: string;
  inLibrary: boolean;
}) {
  let ownerId = loggedInUserId;
  if (inLibrary) {
    await mustBeEditor(loggedInUserId);
    ownerId = await getLibraryAccountId();
  }

  let parent: Content | null = null;

  if (parentId !== null) {
    // if ask for a parent, make sure it exists and is owned by logged in user
    const preliminaryParent = await prisma.content.findUniqueOrThrow({
      where: {
        id: parentId,
        ...filterEditableContent(ownerId),
      },
      select: returnContentSelect({ includeShareDetails: true }),
    });

    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    parent = processContent(preliminaryParent);
  }

  const query_as_prefixes = sanitizeQuery(query);

  const matches = await prisma.$queryRaw<
    {
      id: Uint8Array;
      relevance: number;
    }[]
  >(Prisma.sql`
  
    ${
      parentId !== null
        ? Prisma.sql`
        WITH RECURSIVE content_tree(id) AS (
        SELECT id FROM content
        WHERE parentId = ${parentId} AND ownerId = ${ownerId} AND isDeletedOn IS NULL
        UNION ALL
        SELECT content.id FROM content
        INNER JOIN content_tree AS ft
        ON content.parentId = ft.id
        WHERE content.isDeletedOn IS NULL
      )`
        : Prisma.empty
    }
    SELECT
      content.id,
      AVG((MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)*100) + 
      (MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)*100) +
      ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification: true, matchSubCategory: true, matchCategory: true, prependOperator: true, operator: "+" })} 
      ) as relevance
    FROM
      content
    ${returnClassificationJoins({ includeCategory: true, joinFromContent: true })}
    WHERE
      ${
        parentId !== null
          ? Prisma.sql`content.id IN (SELECT id from content_tree)`
          : Prisma.sql`content.ownerId = ${ownerId} AND content.isDeletedOn IS NULL`
      }
      AND
      (
        MATCH(content.name) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
        OR MATCH(content.source) AGAINST(${query_as_prefixes} IN BOOLEAN MODE)
        ${returnClassificationMatchClauses({ query_as_prefixes, matchClassification: true, matchSubCategory: true, matchCategory: true, prependOperator: true, operator: "OR" })} 
      )
    GROUP BY
      content.id
    ORDER BY
      relevance DESC
    LIMIT 100
    `);

  // TODO: combine queries

  // If any of the content is in a problem set, return the problem set instead
  const docsInProblemSets = await prisma.content.findMany({
    where: {
      id: { in: matches.map((m) => m.id) },
      type: "singleDoc",
      parent: {
        type: "sequence",
        ownerId,
      },
    },
    select: {
      id: true,
      parentId: true,
    },
  });

  /** Map content ids to either themselves or their enclosing problem set */
  const mappedIds = Object.fromEntries(
    matches.map((m) => {
      const docInPset = docsInProblemSets.find((d) => isEqualUUID(d.id, m.id));
      if (docInPset) {
        return [fromUUID(m.id), docInPset.parentId!];
      } else {
        return [fromUUID(m.id), m.id];
      }
    }),
  );

  const preliminaryResults = await prisma.content.findMany({
    where: {
      id: { in: Object.values(mappedIds) },
    },
    select: returnContentSelect({
      includeAssignInfo: true,
      includeShareDetails: true,
    }),
  });

  // Compute the relevance for all results.
  // If a problem set contains multiple matched items,
  // take the highest relevance of those items as the relevance of the problem set.
  const relevance: Record<string, number> = {};
  for (const m of matches) {
    const contentId = fromUUID(mappedIds[fromUUID(m.id)]);
    relevance[contentId] = Math.max(relevance[contentId] ?? 0, m.relevance);
  }

  const content: Content[] = preliminaryResults
    .sort((a, b) => relevance[fromUUID(b.id)] - relevance[fromUUID(a.id)])
    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    .map(processContent);

  const contentIds = content.map((c) => c.contentId);
  const libraryRelations = await getMultipleLibraryRelations({
    contentIds,
    loggedInUserId,
  });

  //TODO: Do we need this extra data in this API?
  const { allCategories } = await getAllCategories();
  const { allDoenetmlVersions } = await getAllDoenetmlVersions();
  const { allLicenses } = await getAllLicenses();

  return {
    content,
    parent,
    libraryRelations,
    allCategories,
    allDoenetmlVersions,
    allLicenses,
    notMe: false as const,
  };
}

/**
 * Get specific folder owned by someone else but shared either publicly or specifically with logged in user.
 */
export async function getSharedContent({
  ownerId,
  parentId,
  loggedInUserId = new Uint8Array(16),
}: {
  ownerId: Uint8Array;
  parentId: Uint8Array | null;
  loggedInUserId?: Uint8Array;
}) {
  let parent: Content | null = null;

  if (parentId !== null) {
    // if ask for a parent, make sure it exists and is viewable by logged in user
    const preliminaryParent = await prisma.content.findUniqueOrThrow({
      where: {
        ownerId,
        id: parentId,
        type: "folder",
        // Note: don't use viewable filter, as we require it to be public/shared even if owned by loggedInUserId
        isDeletedOn: null,

        OR: [
          { isPublic: true },
          { sharedWith: { some: { userId: loggedInUserId } } },
        ],
      },
      select: returnContentSelect({}),
    });

    // If parent is not public or not shared with me,
    // make it look like it doesn't have a parent.
    if (
      !(
        preliminaryParent.parent &&
        (preliminaryParent.parent.isPublic ||
          preliminaryParent.parent.sharedWith.findIndex((cs) =>
            isEqualUUID(cs.userId, loggedInUserId),
          ) !== -1)
      )
    ) {
      preliminaryParent.parent = null;
    }

    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    parent = processContent(preliminaryParent, loggedInUserId);
  }

  const preliminarySharedContent = await prisma.content.findMany({
    where: {
      ownerId,
      parentId: parentId,
      // Note: don't use viewable filter, as we require it to be public/shared even if owned by loggedInUserId
      isDeletedOn: null,
      OR: [
        { isPublic: true },
        { sharedWith: { some: { userId: loggedInUserId } } },
      ],
    },
    select: returnContentSelect({ includeOwnerDetails: true }),
    orderBy: { sortIndex: "asc" },
  });

  // If looking in the base folder,
  // also include orphaned shared content,
  // i.e., shared content that is inside a non-shared parent.
  // That way, users can navigate to all of the owner's shared content
  // when start at the base folder
  if (parentId === null) {
    const orphanedSharedContent = await prisma.content.findMany({
      where: {
        ownerId,
        parent: {
          AND: [
            { isPublic: false },
            { sharedWith: { none: { userId: loggedInUserId } } },
          ],
        },
        // Note: don't use viewable filter, as we require it to be public/shared even if owned by loggedInUserId
        isDeletedOn: null,
        OR: [
          { isPublic: true },
          { sharedWith: { some: { userId: loggedInUserId } } },
        ],
      },
      select: returnContentSelect({ includeOwnerDetails: true }),
      orderBy: { sortIndex: "asc" },
    });
    preliminarySharedContent.push(...orphanedSharedContent);
  }

  const publicContent = preliminarySharedContent.map((content) =>
    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    processContent(content, loggedInUserId),
  );

  if (parent && !isEqualUUID(loggedInUserId, parent.ownerId)) {
    await recordContentView(parent.contentId, loggedInUserId);
  }

  return {
    content: publicContent,
    parent,
  };
}

export async function getMyTrash({
  loggedInUserId,
}: {
  loggedInUserId: Uint8Array;
}) {
  const preliminaryContent = await prisma.content.findMany({
    where: {
      ownerId: loggedInUserId,
      deletionRootId: null,
      isDeletedOn: {
        not: null,
        gte: getEarliestRecoverableDate().toJSDate(),
      },
    },
    select: {
      ...returnContentSelect({
        includeClassifications: true,
        includeAssignInfo: true,
      }),
      isDeletedOn: true,
    },
    orderBy: { isDeletedOn: "desc" },
  });

  const deletionDates = preliminaryContent.map((c) => c.isDeletedOn!);
  const content = preliminaryContent.map((content) =>
    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    processContent(content, loggedInUserId),
  );

  return { deletionDates, content };
}

/**
 * Get content that others have shared specifically with me.
 * Sorted by share date, starting with most recent share.
 * Doesn't include inner content which has been implicitly shared with me, such as a document inside a shared folder.
 */
export async function getSharedWithMe({
  loggedInUserId,
}: {
  loggedInUserId: Uint8Array;
}) {
  // Fetch the share timestamps for these content items for the logged in user
  const shares = await prisma.contentShares.findMany({
    where: {
      userId: loggedInUserId,
      isRootShare: true,
      content: filterViewableContent(loggedInUserId),
    },
    select: {
      content: {
        select: returnContentSelect({ includeOwnerDetails: true }),
      },
    },
    orderBy: { sharedOn: "desc" },
  });

  const sharedWithMeContent = shares.map((share) => {
    //@ts-expect-error: Prisma is incorrectly generating types (https://github.com/prisma/prisma/issues/26370)
    return processContent(share.content, loggedInUserId);
  });

  return { content: sharedWithMeContent };
}
