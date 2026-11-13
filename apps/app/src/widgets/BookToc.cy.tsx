import { BookToc } from "./BookToc";
import { sampleBookId, sampleEntries } from "../utils/book.testData";

describe("BookToc", { tags: ["@group3"] }, () => {
  it("expands the folders around the current page and marks it", () => {
    cy.mount(
      <BookToc
        bookId={sampleBookId}
        entries={sampleEntries}
        currentPageId="s12"
      />,
    );

    cy.get("nav[aria-label='Table of contents']").should("be.visible");
    cy.contains("a", "1.2")
      .should("have.attr", "aria-current", "page")
      .and("have.attr", "href", "/book/book/s12");
    cy.contains("a", "1.1").should("not.have.attr", "aria-current");
    cy.contains("button", "Part 1").should(
      "have.attr",
      "aria-expanded",
      "true",
    );
    cy.contains("button", "Chapter 1").should(
      "have.attr",
      "aria-expanded",
      "true",
    );
    cy.contains("a", "Preface").should("be.visible");
    cy.contains("a", "Appendix").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("collapses and expands a folder", () => {
    cy.mount(
      <BookToc
        bookId={sampleBookId}
        entries={sampleEntries}
        currentPageId="preface"
      />,
    );

    // nothing inside Part 1 is open while reading the preface
    cy.contains("button", "Part 1").should(
      "have.attr",
      "aria-expanded",
      "false",
    );
    cy.contains("a", "Problem set").should("not.exist");

    cy.contains("button", "Part 1").click();
    cy.contains("button", "Part 1").should(
      "have.attr",
      "aria-expanded",
      "true",
    );
    cy.contains("a", "Problem set").should("be.visible");
    cy.contains("a", "1.1").should("not.exist");

    cy.contains("button", "Chapter 1").click();
    cy.contains("a", "1.1").should("be.visible");
    cy.checkAccessibility("body");

    cy.contains("button", "Part 1").click();
    cy.contains("a", "1.1").should("not.exist");
  });
});
