import { Curate } from "./Curate";

// Curation review page with no contrast coverage before this spec. It renders
// enclosed-colored Tabs (a component with no theme override — flagged as a
// dark-mode risk) plus per-status content lists. The empty fixture exercises the
// tabs and empty-state chrome in both color modes via the CI matrix.
describe("Curate", { tags: ["@group4"] }, () => {
  const empty = {
    pendingContent: [],
    pendingLibraryRelations: [],
    underReviewContent: [],
    underReviewLibraryRelations: [],
    rejectedContent: [],
    rejectedLibraryRelations: [],
    publishedContent: [],
    publishedLibraryRelations: [],
  };

  it("renders the review tabs with accessible contrast in both modes", () => {
    cy.mount(<Curate />, { loaderData: empty });
    cy.get('[data-test="Pending Tab"]').should("be.visible");
    cy.checkAccessibility("body");
  });
});
