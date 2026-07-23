import { Events } from "./Events";

// Static content page with no contrast coverage before this spec; the color-mode
// CI matrix runs checkAccessibility (incl. axe color-contrast) in both modes.
describe("Events", { tags: ["@group4"] }, () => {
  it("renders with accessible contrast in both color modes", () => {
    cy.mount(<Events />);
    cy.contains("Virtual office hours").should("be.visible");
    cy.checkAccessibility("body");
  });
});
