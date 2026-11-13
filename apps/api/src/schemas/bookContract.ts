import { z } from "zod";
import { defineOperation } from "../contract";
import { uuidSchema } from "./uuid";
import { uuidWire } from "./sharedResponseSchemas";

export const setIsBookOperation = defineOperation({
  name: "setIsBook",
  method: "post",
  path: "/book/setIsBook",
  auth: "required",
  summary:
    "Mark a folder as a book, which can then be read in reading mode, or unmark it",
  request: z.object({
    contentId: uuidSchema,
    isBook: z.boolean(),
  }),
  response: z.object({
    /** Whether the folder is now a book. */
    isBook: z.boolean(),
  }),
});

const bookTocEntrySchema = z
  .object({
    contentId: uuidWire,
    name: z.string(),
    /** `folder` for a part or chapter; anything else is a page. */
    type: z.enum(["folder", "singleDoc", "sequence", "select"]),
    /** The folder this entry is in; the book itself for top-level entries. */
    parentId: uuidWire,
    /** 1 for the book's direct children, 2 for theirs, and so on. */
    depth: z.number().int(),
  })
  .meta({ id: "BookTocEntry" });

export const getBookTocOperation = defineOperation({
  name: "getBookToc",
  method: "get",
  path: "/book/getBookToc/:bookId",
  auth: "optional",
  summary:
    "The table of contents of a book: its folders and pages in reading order",
  request: z.object({
    bookId: uuidSchema,
  }),
  response: z.object({
    book: z.object({
      contentId: uuidWire,
      name: z.string(),
      ownerId: uuidWire,
      /**
       * Whether the folder is marked as a book. A folder the viewer can see
       * that isn't a book comes back with `isBook: false` and no entries, so
       * reading mode can offer to make it one.
       */
      isBook: z.boolean(),
      /** Whether the viewer may edit the folder (and so mark or unmark it). */
      canEdit: z.boolean(),
    }),
    /**
     * Every folder and page the viewer may see, depth first in the order the
     * author arranged them, so the next page is the next non-folder entry.
     * Images and content in folders the viewer can't see are left out.
     */
    entries: z.array(bookTocEntrySchema),
  }),
});

export const getBookPageOperation = defineOperation({
  name: "getBookPage",
  method: "get",
  path: "/book/getBookPage/:bookId/:pageId",
  auth: "optional",
  summary: "One page of a book, for reading mode",
  request: z.object({
    bookId: uuidSchema,
    pageId: uuidSchema,
  }),
  response: z.object({
    contentId: uuidWire,
    name: z.string(),
    type: z.enum(["singleDoc", "sequence", "select"]),
    /** The page's DoenetML; null for a problem set or question bank. */
    doenetML: z.string().nullable(),
    /** The DoenetML version to render it with; null when `doenetML` is. */
    doenetmlVersion: z.string().nullable(),
  }),
});

export const getContainingBookOperation = defineOperation({
  name: "getContainingBook",
  method: "get",
  path: "/book/getContainingBook/:contentId",
  auth: "optional",
  summary:
    "The nearest book containing a page or folder (or the folder itself, if it is a book), for linking to reading mode",
  request: z.object({
    contentId: uuidSchema,
  }),
  response: z.object({
    /**
     * Null unless the content can be read in a book: it is a folder or page
     * in a book's folder tree (or a book itself), and the viewer can see the
     * book and every folder between them.
     */
    book: z
      .object({
        contentId: uuidWire,
        name: z.string(),
      })
      .nullable(),
  }),
});
