// A small book for component tests of reading mode.
import type { BookTocEntry } from "./book";

// Book/
//   Preface
//   Part 1/
//     Chapter 1/
//       1.1
//       1.2
//     Problem set
//   Appendix
export const sampleBookId = "book";
export const sampleEntries: BookTocEntry[] = [
  {
    contentId: "preface",
    name: "Preface",
    type: "singleDoc",
    parentId: "book",
    depth: 1,
  },
  {
    contentId: "part1",
    name: "Part 1",
    type: "folder",
    parentId: "book",
    depth: 1,
  },
  {
    contentId: "ch1",
    name: "Chapter 1",
    type: "folder",
    parentId: "part1",
    depth: 2,
  },
  {
    contentId: "s11",
    name: "1.1",
    type: "singleDoc",
    parentId: "ch1",
    depth: 3,
  },
  {
    contentId: "s12",
    name: "1.2",
    type: "singleDoc",
    parentId: "ch1",
    depth: 3,
  },
  {
    contentId: "ps",
    name: "Problem set",
    type: "sequence",
    parentId: "part1",
    depth: 2,
  },
  {
    contentId: "appendix",
    name: "Appendix",
    type: "singleDoc",
    parentId: "book",
    depth: 1,
  },
];
