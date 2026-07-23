import { SignIn } from "./SignIn";

// Sign-in page (username/password + Google button). No contrast coverage before
// this spec; the color-mode CI matrix runs checkAccessibility (incl. axe
// color-contrast) in both modes. The Google logo uses brand-mandated fixed
// fills by design, which sit on their own white button.
describe("SignIn", { tags: ["@group4"] }, () => {
  it("renders with accessible contrast in both color modes", () => {
    cy.mount(<SignIn />);
    cy.contains("Sign in with Google").should("be.visible");
    cy.checkAccessibility("body");
  });
});
