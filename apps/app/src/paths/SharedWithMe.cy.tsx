import { SharedWithMe } from "./SharedWithMe";

// Data page with no contrast coverage before this spec. The empty state
// exercises the page chrome and the muted empty-state message (a common
// low-contrast offender) in both color modes via the CI matrix.
describe("SharedWithMe", { tags: ["@group4"] }, () => {
  it("renders the empty state with accessible contrast in both modes", () => {
    cy.mount(<SharedWithMe />, {
      loaderData: { content: [], userId: "user-1" },
    });
    cy.contains("Nothing shared with you right now.").should("be.visible");
    cy.checkAccessibility("body");
  });
});
