import { WelcomeBanner } from "./WelcomeBanner";

describe("WelcomeBanner", { tags: ["@group4"] }, () => {
  it("has readable link/text contrast in both modes", () => {
    cy.mount(<WelcomeBanner />);
    cy.contains("Welcome to the new Doenet!").should("be.visible");
    cy.checkContrast('[role="note"]');
  });

  it("uses a banner background that matches the color mode", () => {
    // The banner was a fixed light-blue band (doenet.lightBlue) that stayed
    // light in dark mode; assert the background now tracks the mode.
    cy.mount(<WelcomeBanner />);
    cy.get('[role="note"]').then(($b) => {
      const bg = window.getComputedStyle($b[0]).backgroundColor;
      const m = bg.match(/rgba?\(([^)]+)\)/);
      const [r, g, b] = m![1].split(",").map((p) => parseFloat(p.trim()));
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const isDark = Cypress.env("colorMode") === "dark";
      expect(
        luminance,
        `banner luminance ${luminance.toFixed(2)} for ${isDark ? "dark" : "light"} mode (bg ${bg})`,
      ).to.be[isDark ? "below" : "above"](0.5);
    });
  });
});
