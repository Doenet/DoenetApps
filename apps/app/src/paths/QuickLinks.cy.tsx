import { QuickLinks } from "./QuickLinks";

// QuickLinks reads `{ user }` from the site outlet context; mount it via the
// outletContext option. No contrast coverage before this spec — the color-mode
// CI matrix runs checkAccessibility (incl. axe color-contrast) in both modes.
describe("QuickLinks", { tags: ["@group4"] }, () => {
  const user = {
    userId: "user-1",
    isAnonymous: false,
    isAuthor: true,
    firstNames: "Test",
    lastNames: "User",
    email: "test.user@example.com",
  };

  it("renders with accessible contrast in both color modes", () => {
    cy.mount(<QuickLinks />, { outletContext: { user } });
    cy.contains("Authoring resources").should("be.visible");
    cy.checkAccessibility("body");
  });
});
