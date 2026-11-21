import { BookBanner } from "./BookBanner";

const book = { contentId: "book", name: "Sample Book" };

describe("BookBanner", { tags: ["@group3"] }, () => {
  it("links a page to the same page in reading mode", () => {
    cy.mount(
      <BookBanner
        book={book}
        contentId="page"
        label="This activity is a page of the book"
      />,
    );
    cy.contains("This activity is a page of the book Sample Book.");
    cy.contains("a", "Read it in the book").should(
      "have.attr",
      "href",
      "/book/book/page",
    );
    cy.checkAccessibility("body");
  });

  it("opens the book itself at the start", () => {
    cy.mount(
      <BookBanner
        book={book}
        contentId="book"
        label="This folder is the book"
      />,
    );
    cy.contains("a", "Read as book").should("have.attr", "href", "/book/book");
    cy.checkAccessibility("body");
  });
});
