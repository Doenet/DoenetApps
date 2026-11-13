import {
  ancestorFolders,
  bookPages,
  bookTocTree,
  neighborPages,
  startingPage,
} from "./book";
import { sampleBookId, sampleEntries } from "./book.testData";

describe("book utilities", { tags: ["@group3"] }, () => {
  it("lists pages in reading order, skipping folders", () => {
    expect(bookPages(sampleEntries).map((p) => p.contentId)).to.deep.equal([
      "preface",
      "s11",
      "s12",
      "ps",
      "appendix",
    ]);
  });

  it("finds the previous and next page across folders", () => {
    const at = (id: string) => {
      const { previous, next } = neighborPages(sampleEntries, id);
      return [previous?.contentId ?? null, next?.contentId ?? null];
    };
    expect(at("preface")).to.deep.equal([null, "s11"]);
    expect(at("s11")).to.deep.equal(["preface", "s12"]);
    expect(at("ps")).to.deep.equal(["s12", "appendix"]);
    expect(at("appendix")).to.deep.equal(["ps", null]);
    expect(at("not-in-book")).to.deep.equal([null, null]);
  });

  it("finds a page's folders, outermost first", () => {
    const ids = (id: string) =>
      ancestorFolders(sampleEntries, id).map((f) => f.contentId);
    expect(ids("s12")).to.deep.equal(["part1", "ch1"]);
    expect(ids("ps")).to.deep.equal(["part1"]);
    expect(ids("preface")).to.deep.equal([]);
  });

  it("builds the tree", () => {
    const tree = bookTocTree(sampleEntries, sampleBookId);
    expect(tree.map((n) => n.contentId)).to.deep.equal([
      "preface",
      "part1",
      "appendix",
    ]);
    expect(tree[1].children.map((n) => n.contentId)).to.deep.equal([
      "ch1",
      "ps",
    ]);
    expect(tree[1].children[0].children.map((n) => n.name)).to.deep.equal([
      "1.1",
      "1.2",
    ]);
  });

  it("resumes at the last page read, if it is still in the book", () => {
    expect(startingPage(sampleEntries, "s12")?.contentId).to.equal("s12");
    expect(startingPage(sampleEntries, "gone")?.contentId).to.equal("preface");
    expect(startingPage(sampleEntries, null)?.contentId).to.equal("preface");
    expect(startingPage([], null)).to.equal(null);
  });
});
