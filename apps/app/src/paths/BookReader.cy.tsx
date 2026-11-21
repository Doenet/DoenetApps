import { BookReader, PageNav } from "./BookReader";
import { sampleBookId, sampleEntries } from "../utils/book.testData";

const book = {
  contentId: sampleBookId,
  name: "Sample Book",
  ownerId: "owner",
  isBook: true,
  canEdit: false,
};

describe("BookReader", { tags: ["@group3"] }, () => {
  it("links to the previous and next pages", () => {
    cy.mount(
      <PageNav bookId={sampleBookId} entries={sampleEntries} pageId="s12" />,
    );
    cy.get("nav[aria-label='Pages']").within(() => {
      cy.contains("a", "1.1").should("have.attr", "href", "/book/book/s11");
      cy.contains("a", "Problem set").should(
        "have.attr",
        "href",
        "/book/book/ps",
      );
    });
    cy.checkAccessibility("body");
  });

  it("has no previous link on the first page", () => {
    cy.mount(
      <PageNav
        bookId={sampleBookId}
        entries={sampleEntries}
        pageId="preface"
      />,
    );
    cy.get("a[rel='prev']").should("not.exist");
    cy.get("a[rel='next']").should("contain.text", "1.1");
  });

  it("shows a problem-set page with the contents, breadcrumb and navigation", () => {
    cy.viewport(1200, 800);
    cy.mount(<BookReader />, {
      loaderData: {
        kind: "page",
        toc: { book, entries: sampleEntries },
        page: {
          contentId: "ps",
          name: "Problem set",
          type: "sequence",
          doenetML: null,
          doenetmlVersion: null,
        },
      },
    });

    cy.contains("a", "Problem set").should("have.attr", "aria-current", "page");
    cy.get("nav[aria-label='breadcrumb']").should("contain.text", "Part 1");
    cy.contains("This page is a problem set");
    cy.contains("a", "Open Problem set").should(
      "have.attr",
      "href",
      "/activityViewer/ps",
    );
    cy.get("a[rel='prev']").should("contain.text", "1.2");
    cy.get("a[rel='next']").should("contain.text", "Appendix");
    // readers who can't edit the book get no owner menu
    cy.get("[data-test='Book Owner Menu']").should("not.exist");
    cy.checkAccessibility("body");
  });

  it("puts the contents in a drawer on narrow screens", () => {
    cy.viewport(400, 800);
    cy.mount(<BookReader />, {
      loaderData: {
        kind: "page",
        toc: { book: { ...book, canEdit: true }, entries: sampleEntries },
        page: {
          contentId: "ps",
          name: "Problem set",
          type: "sequence",
          doenetML: null,
          doenetmlVersion: null,
        },
      },
    });

    cy.get("nav[aria-label='Table of contents']").should("not.be.visible");
    cy.get("[data-test='Book Contents Button']").click();
    cy.get("[role='dialog']").within(() => {
      cy.contains("Sample Book");
      cy.contains("a", "Problem set").should(
        "have.attr",
        "aria-current",
        "page",
      );
    });
    cy.checkAccessibility("body");
  });

  it("offers to make a folder into a book, if the reader can edit it", () => {
    cy.mount(<BookReader />, {
      loaderData: {
        kind: "notBook",
        toc: {
          book: { ...book, isBook: false, canEdit: true },
          entries: [],
        },
      },
    });
    cy.contains("isn't set up to be read as a book");
    cy.get("[data-test='Make Book Button']").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("says who can make it a book, if the reader can't", () => {
    cy.mount(<BookReader />, {
      loaderData: {
        kind: "notBook",
        toc: { book: { ...book, isBook: false }, entries: [] },
      },
    });
    cy.contains("Only the folder's owner can make it a book.");
    cy.get("[data-test='Make Book Button']").should("not.exist");
  });
});
