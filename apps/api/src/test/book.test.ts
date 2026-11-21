import { expect, test } from "vitest";
import { createTestUser, doc, fold, pset, setupTestContent } from "./utils";
import {
  getBookPage,
  getBookToc,
  getContainingBook,
  setIsBook,
} from "../query/book";
import { deleteContent } from "../query/activity";
import { moveContent } from "../query/copy_move";
import { setContentIsPublic, shareContentWithEmail } from "../query/share";
import { createImageContent } from "../media/imageContent";
import { fromUUID } from "../utils/uuid";

// A small book:
//   Book/
//     Preface
//     Part 1/
//       Chapter 1/
//         1.1, 1.2
//       Problem set (a sequence: a page, its contents not listed)
//     Appendix
async function setupBook(ownerId: Uint8Array) {
  const ids = await setupTestContent(ownerId, {
    Book: fold({
      Preface: doc("<p>preface</p>"),
      "Part 1": fold({
        "Chapter 1": fold({
          "1.1": doc("<p>1.1</p>"),
          "1.2": doc("<p>1.2</p>"),
        }),
        "Problem set": pset({ "PS problem": doc("<p>q</p>") }),
      }),
      Appendix: doc("<p>appendix</p>"),
    }),
  });
  // setupTestContent returns ids depth first, in the order above
  const [
    book,
    preface,
    part1,
    chapter1,
    s11,
    s12,
    problemSet,
    psProblem,
    appendix,
  ] = ids;
  return {
    book,
    preface,
    part1,
    chapter1,
    s11,
    s12,
    problemSet,
    psProblem,
    appendix,
  };
}

const names = (entries: { name: string; depth: number }[]) =>
  entries.map((e) => `${"  ".repeat(e.depth - 1)}${e.name}`);

test("a folder is not a book until marked, and can be unmarked", async () => {
  const { userId: ownerId } = await createTestUser();
  const { book } = await setupBook(ownerId);

  let toc = await getBookToc({ bookId: book, loggedInUserId: ownerId });
  expect(toc.book.isBook).eq(false);
  expect(toc.book.canEdit).eq(true);
  expect(toc.entries).toEqual([]);

  await setIsBook({ contentId: book, isBook: true, loggedInUserId: ownerId });
  // marking twice is harmless
  await setIsBook({ contentId: book, isBook: true, loggedInUserId: ownerId });
  toc = await getBookToc({ bookId: book, loggedInUserId: ownerId });
  expect(fromUUID(toc.book.contentId)).eq(fromUUID(book));
  expect(toc.book.name).eq("Book");
  expect(toc.book.isBook).eq(true);
  expect(toc.entries).toHaveLength(7);

  await setIsBook({ contentId: book, isBook: false, loggedInUserId: ownerId });
  toc = await getBookToc({ bookId: book, loggedInUserId: ownerId });
  expect(toc.book.isBook).eq(false);
  expect(toc.entries).toEqual([]);
});

test("the table of contents lists folders and pages depth first, in the author's order", async () => {
  const { userId: ownerId } = await createTestUser();
  const ids = await setupBook(ownerId);
  await setIsBook({
    contentId: ids.book,
    isBook: true,
    loggedInUserId: ownerId,
  });

  let toc = await getBookToc({ bookId: ids.book, loggedInUserId: ownerId });
  expect(names(toc.entries)).toEqual([
    "Preface",
    "Part 1",
    "  Chapter 1",
    "    1.1",
    "    1.2",
    "  Problem set",
    "Appendix",
  ]);
  expect(toc.entries.map((e) => e.type)).toEqual([
    "singleDoc",
    "folder",
    "folder",
    "singleDoc",
    "singleDoc",
    "sequence",
    "singleDoc",
  ]);
  const s12 = toc.entries[4];
  expect(fromUUID(s12.parentId)).eq(fromUUID(ids.chapter1));

  // Reordering follows sortIndex, not creation order.
  await moveContent({
    contentId: ids.s12,
    desiredPosition: 0,
    loggedInUserId: ownerId,
  });
  await moveContent({
    contentId: ids.appendix,
    desiredPosition: 0,
    loggedInUserId: ownerId,
  });
  toc = await getBookToc({ bookId: ids.book, loggedInUserId: ownerId });
  expect(names(toc.entries)).toEqual([
    "Appendix",
    "Preface",
    "Part 1",
    "  Chapter 1",
    "    1.2",
    "    1.1",
    "  Problem set",
  ]);
});

test("deleted content and images are left out", async () => {
  const { userId: ownerId } = await createTestUser();
  const ids = await setupBook(ownerId);
  await setIsBook({
    contentId: ids.book,
    isBook: true,
    loggedInUserId: ownerId,
  });

  await createImageContent({
    loggedInUserId: ownerId,
    parentId: ids.chapter1,
    name: "figure.png",
    mimeType: "image/png",
    sizeBytes: 1,
  });
  await deleteContent({ contentId: ids.part1, loggedInUserId: ownerId });

  const toc = await getBookToc({ bookId: ids.book, loggedInUserId: ownerId });
  expect(names(toc.entries)).toEqual(["Preface", "Appendix"]);
});

test("others can read a book only when they can view it", async () => {
  const { userId: ownerId } = await createTestUser();
  const { userId: otherId } = await createTestUser();
  const { userId: friendId, email: friendEmail } = await createTestUser();
  const ids = await setupBook(ownerId);
  await setIsBook({
    contentId: ids.book,
    isBook: true,
    loggedInUserId: ownerId,
  });

  // private: only the owner
  await expect(
    getBookToc({ bookId: ids.book, loggedInUserId: otherId }),
  ).rejects.toThrow();
  await expect(getBookToc({ bookId: ids.book })).rejects.toThrow();

  // shared: the person it is shared with sees the whole book
  await shareContentWithEmail({
    contentId: ids.book,
    loggedInUserId: ownerId,
    email: friendEmail!,
  });
  const shared = await getBookToc({
    bookId: ids.book,
    loggedInUserId: friendId,
  });
  expect(shared.entries).toHaveLength(7);
  await expect(
    getBookToc({ bookId: ids.book, loggedInUserId: otherId }),
  ).rejects.toThrow();

  // public: everyone, signed in or not
  await setContentIsPublic({
    contentId: ids.book,
    loggedInUserId: ownerId,
    isPublic: true,
  });
  expect(
    (await getBookToc({ bookId: ids.book, loggedInUserId: otherId })).entries,
  ).toHaveLength(7);
  const guestToc = await getBookToc({ bookId: ids.book });
  expect(guestToc.entries).toHaveLength(7);
  expect(guestToc.book.canEdit).eq(false);
  expect(shared.book.canEdit).eq(false);
});

test("only the owner can mark a book, and only a folder", async () => {
  const { userId: ownerId } = await createTestUser();
  const { userId: otherId } = await createTestUser();
  const ids = await setupBook(ownerId);
  await setContentIsPublic({
    contentId: ids.book,
    loggedInUserId: ownerId,
    isPublic: true,
  });

  // someone who can view but not edit the folder
  await expect(
    setIsBook({ contentId: ids.book, isBook: true, loggedInUserId: otherId }),
  ).rejects.toThrow();

  // a page or a problem set is not a folder
  await expect(
    setIsBook({
      contentId: ids.preface,
      isBook: true,
      loggedInUserId: ownerId,
    }),
  ).rejects.toThrow();
  await expect(
    setIsBook({
      contentId: ids.problemSet,
      isBook: true,
      loggedInUserId: ownerId,
    }),
  ).rejects.toThrow();

  // the folder stayed a plain folder
  expect((await getBookToc({ bookId: ids.book })).book.isBook).eq(false);
});

test("getBookPage returns a page of the book, and nothing outside it", async () => {
  const { userId: ownerId } = await createTestUser();
  const { userId: otherId } = await createTestUser();
  const ids = await setupBook(ownerId);
  await setIsBook({
    contentId: ids.book,
    isBook: true,
    loggedInUserId: ownerId,
  });

  // a page nested in folders
  const page = await getBookPage({
    bookId: ids.book,
    pageId: ids.s12,
    loggedInUserId: ownerId,
  });
  expect(page.name).eq("1.2");
  expect(page.type).eq("singleDoc");
  expect(page.doenetML).eq("<p>1.2</p>");
  expect(page.doenetmlVersion).toBeTypeOf("string");

  // a problem set is a page, without DoenetML
  const ps = await getBookPage({
    bookId: ids.book,
    pageId: ids.problemSet,
    loggedInUserId: ownerId,
  });
  expect(ps.type).eq("sequence");
  expect(ps.doenetML).toBeNull();

  // not pages: a folder, the book itself, a document inside a problem set
  for (const pageId of [ids.chapter1, ids.book, ids.psProblem]) {
    await expect(
      getBookPage({ bookId: ids.book, pageId, loggedInUserId: ownerId }),
    ).rejects.toThrow();
  }

  // a document outside the book
  const [outside] = await setupTestContent(ownerId, {
    Elsewhere: doc("<p>x</p>"),
  });
  await expect(
    getBookPage({ bookId: ids.book, pageId: outside, loggedInUserId: ownerId }),
  ).rejects.toThrow();

  // a page in a deleted folder
  await deleteContent({ contentId: ids.chapter1, loggedInUserId: ownerId });
  await expect(
    getBookPage({ bookId: ids.book, pageId: ids.s11, loggedInUserId: ownerId }),
  ).rejects.toThrow();

  // someone who can't see the book
  await expect(
    getBookPage({
      bookId: ids.book,
      pageId: ids.preface,
      loggedInUserId: otherId,
    }),
  ).rejects.toThrow();
  await expect(
    getBookPage({ bookId: ids.book, pageId: ids.preface }),
  ).rejects.toThrow();

  // once public, guests can read it
  await setContentIsPublic({
    contentId: ids.book,
    loggedInUserId: ownerId,
    isPublic: true,
  });
  expect(
    (await getBookPage({ bookId: ids.book, pageId: ids.preface })).doenetML,
  ).eq("<p>preface</p>");

  // but not after it stops being a book
  await setIsBook({
    contentId: ids.book,
    isBook: false,
    loggedInUserId: ownerId,
  });
  await expect(
    getBookPage({ bookId: ids.book, pageId: ids.preface }),
  ).rejects.toThrow();
});

test("getContainingBook finds the nearest book a page or folder is in", async () => {
  const { userId: ownerId } = await createTestUser();
  const { userId: otherId } = await createTestUser();
  const ids = await setupBook(ownerId);
  const bookOf = async (contentId: Uint8Array, loggedInUserId?: Uint8Array) => {
    const { book } = await getContainingBook({ contentId, loggedInUserId });
    return book ? fromUUID(book.contentId) : null;
  };

  // not a book yet
  expect(await bookOf(ids.s11, ownerId)).toBeNull();

  await setIsBook({
    contentId: ids.book,
    isBook: true,
    loggedInUserId: ownerId,
  });
  const book = fromUUID(ids.book);
  expect(await bookOf(ids.s11, ownerId)).eq(book); // a nested page
  expect(await bookOf(ids.chapter1, ownerId)).eq(book); // a folder in it
  expect(await bookOf(ids.book, ownerId)).eq(book); // the book itself
  expect(await bookOf(ids.problemSet, ownerId)).eq(book); // a problem set
  expect(await bookOf(ids.psProblem, ownerId)).toBeNull(); // inside a problem set

  const name = (
    await getContainingBook({ contentId: ids.s11, loggedInUserId: ownerId })
  ).book?.name;
  expect(name).eq("Book");

  // the nearest book wins
  await setIsBook({
    contentId: ids.part1,
    isBook: true,
    loggedInUserId: ownerId,
  });
  expect(await bookOf(ids.s11, ownerId)).eq(fromUUID(ids.part1));
  expect(await bookOf(ids.preface, ownerId)).eq(book);

  // only for readers who can see it
  expect(await bookOf(ids.preface, otherId)).toBeNull();
  expect(await bookOf(ids.preface)).toBeNull();
  await setContentIsPublic({
    contentId: ids.book,
    loggedInUserId: ownerId,
    isPublic: true,
  });
  expect(await bookOf(ids.preface)).eq(book);

  // a page in a deleted folder is no longer in the book
  await deleteContent({ contentId: ids.part1, loggedInUserId: ownerId });
  expect(await bookOf(ids.s11, ownerId)).toBeNull();
});
