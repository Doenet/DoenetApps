import { Trash } from "./Trash";

// Data page with no contrast coverage before this spec. The empty state
// exercises the page chrome and the muted empty-state message in both color
// modes via the CI matrix.
describe("Trash", { tags: ["@group4"] }, () => {
  it("renders the empty state with accessible contrast in both modes", () => {
    cy.mount(<Trash />, { loaderData: { content: [], deletionDates: [] } });
    cy.contains("No content in the trash right now.").should("be.visible");
    cy.checkAccessibility("body");
  });
});
