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
    }),
    /**
     * Every folder and page the viewer may see, depth first in the order the
     * author arranged them, so the next page is the next non-folder entry.
     * Images and content in folders the viewer can't see are left out.
     */
    entries: z.array(bookTocEntrySchema),
  }),
});
