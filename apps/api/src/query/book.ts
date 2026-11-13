import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { InvalidRequestError } from "../utils/error";
import { isEqualUUID } from "../utils/uuid";
import { prisma } from "../model";
import {
  filterEditableContent,
  filterExcludeAssignments,
  filterViewableContent,
  getIsEditor,
  viewableContentWhere,
} from "../utils/permissions";

/** The content types that are pages of a book. */
const PAGE_TYPES = ["singleDoc", "sequence", "select"] as const;
type PageType = (typeof PAGE_TYPES)[number];
/** The content types that appear in a book's table of contents. */
const TOC_TYPES = ["folder", ...PAGE_TYPES] as const;
type TocType = (typeof TOC_TYPES)[number];

/**
 * Mark the folder `contentId` as a book (`isBook: true`), which lets it be
 * read in reading mode, or unmark it. Only someone who can edit the folder may
 * do this, and not on content in an assignment.
 *
 * Throws (404) if `contentId` isn't such a folder.
 */
export async function setIsBook({
  contentId,
  isBook,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  isBook: boolean;
  loggedInUserId: Uint8Array;
}) {
  const isEditor = await getIsEditor(loggedInUserId);
  await prisma.content.findFirstOrThrow({
    where: {
      id: contentId,
      type: "folder",
      AND: [
        filterEditableContent(loggedInUserId, isEditor),
        filterExcludeAssignments,
      ],
    },
    select: { id: true },
  });

  if (isBook) {
    await prisma.bookSettings.upsert({
      where: { contentId },
      create: { contentId },
      update: {},
    });
  } else {
    await prisma.bookSettings.deleteMany({ where: { contentId } });
  }
}

/**
 * The table of contents of the book `bookId`: every folder and page in it that
 * `loggedInUserId` (or a guest) may view, depth first in the author's order.
 *
 * Sequences (problem sets) and selects (question banks) are pages: their
 * contents are not listed. Images are left out. A folder the viewer can't see
 * hides everything inside it.
 *
 * A folder the viewer can see that isn't marked as a book comes back with
 * `isBook: false` and no entries. Throws (404) if `bookId` is not a folder the
 * viewer can see.
 *
 * Makes at most three queries: the viewer's editor status, the book, and one
 * recursive query for the whole tree.
 */
export async function getBookToc({
  bookId,
  loggedInUserId,
}: {
  bookId: Uint8Array;
  loggedInUserId?: Uint8Array;
}) {
  const { book, viewable } = await findViewableBookFolder({
    bookId,
    loggedInUserId,
  });
  if (!book.isBook) {
    return { book, entries: [] };
  }

  const rows = await prisma.$queryRaw<
    {
      id: Uint8Array;
      name: string;
      type: string;
      parentId: Uint8Array;
      sortIndex: bigint;
      depth: bigint | number;
    }[]
  >(Prisma.sql`
    WITH RECURSIVE tree(id, type, depth) AS (
      SELECT content.id, content.type, 1 FROM content
      WHERE content.parentId = ${bookId}
        AND content.isAssignmentRoot = FALSE
        AND ${viewable}
      UNION ALL
      SELECT content.id, content.type, tree.depth + 1 FROM content
      INNER JOIN tree ON content.parentId = tree.id AND tree.type = 'folder'
      WHERE content.isAssignmentRoot = FALSE
        AND ${viewable}
    )
    SELECT content.id, content.name, content.type, content.parentId,
      content.sortIndex, tree.depth
    FROM tree INNER JOIN content ON content.id = tree.id
    WHERE content.type IN (${Prisma.join([...TOC_TYPES])})
  `);

  // Order depth first: each folder's children by sortIndex, then theirs.
  const key = (id: Uint8Array) => Buffer.from(id).toString("hex");
  const children = new Map<string, typeof rows>();
  for (const row of rows) {
    const k = key(row.parentId);
    if (!children.has(k)) children.set(k, []);
    children.get(k)!.push(row);
  }
  for (const list of children.values()) {
    list.sort((a, b) =>
      a.sortIndex < b.sortIndex ? -1 : a.sortIndex > b.sortIndex ? 1 : 0,
    );
  }

  const entries: {
    contentId: Uint8Array;
    name: string;
    type: TocType;
    parentId: Uint8Array;
    depth: number;
  }[] = [];
  const visit = (parentId: Uint8Array) => {
    for (const row of children.get(key(parentId)) ?? []) {
      entries.push({
        contentId: row.id,
        name: row.name,
        type: row.type as TocType,
        parentId: row.parentId,
        depth: Number(row.depth),
      });
      if (row.type === "folder") {
        visit(row.id);
      }
    }
  };
  visit(book.contentId);

  return { book, entries };
}

/**
 * One page of the book `bookId`, for reading mode: a document, problem set or
 * question bank that sits in the book's folder tree (directly or in folders
 * within it), all of which the viewer may see. Problem sets and question
 * banks come back without DoenetML; reading mode links to them instead.
 *
 * Throws (404) unless `bookId` is a book the viewer can see and `pageId` is
 * such a page in it.
 *
 * Makes at most four queries: editor status, the book, one recursive query up
 * the page's folders, and the page.
 */
export async function getBookPage({
  bookId,
  pageId,
  loggedInUserId,
}: {
  bookId: Uint8Array;
  pageId: Uint8Array;
  loggedInUserId?: Uint8Array;
}) {
  const { book, viewable } = await findViewableBookFolder({
    bookId,
    loggedInUserId,
  });
  if (!book.isBook) {
    throw new InvalidRequestError("Not a book", StatusCodes.NOT_FOUND);
  }

  // Walk up from the page through folders the viewer can see; the page is in
  // the book if the walk reaches it.
  const reached = await prisma.$queryRaw<{ id: Uint8Array }[]>(Prisma.sql`
    WITH RECURSIVE up(id, parentId, steps) AS (
      SELECT content.id, content.parentId, 0 FROM content
      WHERE content.id = ${pageId}
        AND content.type IN (${Prisma.join([...PAGE_TYPES])})
        AND content.isAssignmentRoot = FALSE
        AND ${viewable}
      UNION ALL
      SELECT content.id, content.parentId, up.steps + 1 FROM content
      INNER JOIN up ON content.id = up.parentId
      WHERE up.id <> ${bookId}
        AND up.steps < 100
        AND content.type = 'folder'
        AND ${viewable}
    )
    SELECT id FROM up WHERE id = ${bookId} AND steps > 0
  `);
  if (reached.length === 0) {
    throw new InvalidRequestError(
      "Page not found in book",
      StatusCodes.NOT_FOUND,
    );
  }

  const page = await prisma.content.findUniqueOrThrow({
    where: { id: pageId },
    select: {
      id: true,
      name: true,
      type: true,
      source: true,
      doenetmlVersion: { select: { fullVersion: true } },
    },
  });
  const isDoc = page.type === "singleDoc";
  return {
    contentId: page.id,
    name: page.name,
    type: page.type as PageType,
    doenetML: isDoc ? (page.source ?? "") : null,
    doenetmlVersion: isDoc ? (page.doenetmlVersion?.fullVersion ?? null) : null,
  };
}

/**
 * The folder `bookId` if `loggedInUserId` (or a guest) may view it, whether it
 * is marked as a book, and whether the viewer may edit it; plus the SQL
 * condition for content the viewer may see, for the tree queries.
 *
 * Throws (404) if `bookId` is not a folder the viewer can see.
 */
async function findViewableBookFolder({
  bookId,
  loggedInUserId,
}: {
  bookId: Uint8Array;
  loggedInUserId?: Uint8Array;
}) {
  const isEditor = loggedInUserId ? await getIsEditor(loggedInUserId) : false;

  const folder = await prisma.content.findFirstOrThrow({
    where: {
      id: bookId,
      type: "folder",
      ...filterViewableContent(loggedInUserId, isEditor),
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: { select: { isLibrary: true } },
      bookSettings: { select: { contentId: true } },
    },
  });

  const canEdit =
    loggedInUserId !== undefined &&
    (isEqualUUID(folder.ownerId, loggedInUserId) ||
      (isEditor && folder.owner.isLibrary));

  const viewable = loggedInUserId
    ? viewableContentWhere(loggedInUserId, isEditor)
    : Prisma.sql`content.isDeletedOn IS NULL AND content.visibility <> 'private'`;

  return {
    book: {
      contentId: folder.id,
      name: folder.name,
      ownerId: folder.ownerId,
      isBook: folder.bookSettings !== null,
      canEdit,
    },
    viewable,
  };
}
