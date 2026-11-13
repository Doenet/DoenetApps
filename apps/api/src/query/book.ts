import { Prisma } from "@prisma/client";
import { prisma } from "../model";
import {
  filterEditableContent,
  filterExcludeAssignments,
  filterViewableContent,
  getIsEditor,
  viewableContentWhere,
} from "../utils/permissions";

/** The content types that appear in a book's table of contents. */
const TOC_TYPES = ["folder", "singleDoc", "sequence", "select"] as const;
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
 * Throws (404) if `bookId` is not a book the viewer can see.
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
  const isEditor = loggedInUserId ? await getIsEditor(loggedInUserId) : false;

  const book = await prisma.content.findFirstOrThrow({
    where: {
      id: bookId,
      type: "folder",
      bookSettings: { isNot: null },
      ...filterViewableContent(loggedInUserId, isEditor),
    },
    select: { id: true, name: true, ownerId: true },
  });

  const viewable = loggedInUserId
    ? viewableContentWhere(loggedInUserId, isEditor)
    : Prisma.sql`content.isDeletedOn IS NULL AND content.visibility <> 'private'`;

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
  visit(book.id);

  return {
    book: { contentId: book.id, name: book.name, ownerId: book.ownerId },
    entries,
  };
}
