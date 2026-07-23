import { About } from "./About";

// About reads `{ user }` from the site outlet context; mount it via the
// outletContext option. No contrast coverage before this spec — the color-mode
// CI matrix runs checkAccessibility (incl. axe color-contrast) in both modes.
describe("About", { tags: ["@group4"] }, () => {
  const user = {
    userId: "user-1",
    isAnonymous: false,
    isAuthor: true,
    firstNames: "Test",
    lastNames: "User",
    email: "test.user@example.com",
  };

  it("renders (signed in) with accessible contrast in both color modes", () => {
    cy.mount(<About />, { outletContext: { user } });
    cy.contains("About Doenet").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders (signed out) with accessible contrast in both color modes", () => {
    cy.mount(<About />, { outletContext: { user: undefined } });
    cy.contains("About Doenet").should("be.visible");
    cy.checkAccessibility("body");
  });
});
