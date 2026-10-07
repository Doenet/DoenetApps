import { GetInvolved } from "./GetInvolved";

// Static content page with no contrast coverage before this spec. The
// color-mode CI matrix runs it in both light and dark, so checkAccessibility
// (which includes axe's color-contrast rule) exercises both modes.
describe("GetInvolved", { tags: ["@group4"] }, () => {
  it("renders with accessible contrast in both color modes", () => {
    cy.mount(<GetInvolved />);
    cy.contains("Get involved with Doenet").should("be.visible");
    cy.checkAccessibility("body");
  });
});
