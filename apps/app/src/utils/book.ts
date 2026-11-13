import type { OperationResponse } from "@doenet-tools/shared";
import { api } from "../api/client";

/** One folder or page in a book's table of contents, in reading order. */
export type BookTocEntry = OperationResponse<"getBookToc">["entries"][number];

export function isPage(entry: BookTocEntry) {
  return entry.type !== "folder";
}

/** The book's pages, in reading order. */
export function bookPages(entries: BookTocEntry[]) {
  return entries.filter(isPage);
}

/** The pages before and after `pageId` (null at either end, or if absent). */
export function neighborPages(entries: BookTocEntry[], pageId: string) {
  const pages = bookPages(entries);
  const i = pages.findIndex((p) => p.contentId === pageId);
  if (i === -1) {
    return { previous: null, next: null };
  }
  return {
    previous: i > 0 ? pages[i - 1] : null,
    next: i < pages.length - 1 ? pages[i + 1] : null,
  };
}

/**
 * The folders containing `contentId`, outermost first (the book itself is not
 * included). Empty if `contentId` is a top-level entry or not in the book.
 */
export function ancestorFolders(entries: BookTocEntry[], contentId: string) {
  const byId = new Map(entries.map((e) => [e.contentId, e]));
  const chain: BookTocEntry[] = [];
  let entry = byId.get(contentId);
  while (entry) {
    const parent = byId.get(entry.parentId);
    if (!parent) break;
    chain.unshift(parent);
    entry = parent;
  }
  return chain;
}

export type BookTocNode = BookTocEntry & { children: BookTocNode[] };

/** The entries as a tree, for the table of contents. */
export function bookTocTree(entries: BookTocEntry[], bookId: string) {
  const nodes = new Map<string, BookTocNode>();
  const roots: BookTocNode[] = [];
  for (const entry of entries) {
    nodes.set(entry.contentId, { ...entry, children: [] });
  }
  // Entries come depth first, so a parent is always created before its child.
  for (const entry of entries) {
    const node = nodes.get(entry.contentId)!;
    if (entry.parentId === bookId) {
      roots.push(node);
    } else {
      nodes.get(entry.parentId)?.children.push(node);
    }
  }
  return roots;
}

/**
 * The page to open when a book is opened without one: the page this browser
 * last read in the book, if it is still in the book, else the first page.
 */
export function startingPage(
  entries: BookTocEntry[],
  lastReadId: string | null,
) {
  const pages = bookPages(entries);
  return pages.find((p) => p.contentId === lastReadId) ?? pages[0] ?? null;
}

const lastReadKey = (bookId: string) => `doenet-book-last-page:${bookId}`;

/** The page this browser last read in `bookId`, if remembered. */
export function getLastReadPage(bookId: string): string | null {
  try {
    return window.localStorage.getItem(lastReadKey(bookId));
  } catch {
    return null;
  }
}

/** Remember `pageId` as the page last read in `bookId` (best effort). */
export function setLastReadPage(bookId: string, pageId: string) {
  try {
    window.localStorage.setItem(lastReadKey(bookId), pageId);
  } catch {
    // Storage may be unavailable (private browsing); resuming is a nicety.
  }
}

/** The URL of a page in reading mode. */
export function bookPageUrl(bookId: string, pageId?: string) {
  return pageId ? `/book/${bookId}/${pageId}` : `/book/${bookId}`;
}

/** A book that some content can be read in (see `findContainingBook`). */
export type ContainingBook = NonNullable<
  OperationResponse<"getContainingBook">["book"]
>;

/**
 * The nearest book that `contentId` (a page or folder) can be read in, or
 * null. Never throws: a failed lookup just means no link to reading mode.
 */
export async function findContainingBook(
  contentId: string,
): Promise<ContainingBook | null> {
  try {
    return (await api("getContainingBook", { contentId })).book;
  } catch {
    return null;
  }
}
