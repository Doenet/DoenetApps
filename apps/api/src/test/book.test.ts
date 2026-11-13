import { expect, test } from "vitest";
import { createTestUser, doc, fold, pset, setupTestContent } from "./utils";
import { getBookToc, setIsBook } from "../query/book";
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
    _psProblem,
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
    appendix,
  };
}

const names = (entries: { name: string; depth: number }[]) =>
  entries.map((e) => `${"  ".repeat(e.depth - 1)}${e.name}`);

test("a folder is not a book until marked, and can be unmarked", async () => {
  const { userId: ownerId } = await createTestUser();
  const { book } = await setupBook(ownerId);

  await expect(
    getBookToc({ bookId: book, loggedInUserId: ownerId }),
  ).rejects.toThrow();

  await setIsBook({ contentId: book, isBook: true, loggedInUserId: ownerId });
  // marking twice is harmless
  await setIsBook({ contentId: book, isBook: true, loggedInUserId: ownerId });
  const toc = await getBookToc({ bookId: book, loggedInUserId: ownerId });
  expect(fromUUID(toc.book.contentId)).eq(fromUUID(book));
  expect(toc.book.name).eq("Book");

  await setIsBook({ contentId: book, isBook: false, loggedInUserId: ownerId });
  await expect(
    getBookToc({ bookId: book, loggedInUserId: ownerId }),
  ).rejects.toThrow();
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
  expect((await getBookToc({ bookId: ids.book })).entries).toHaveLength(7);
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

  await expect(getBookToc({ bookId: ids.book })).rejects.toThrow();
});
