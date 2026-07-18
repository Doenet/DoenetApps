import { Button } from "@chakra-ui/react";

// The solid blue button (colorScheme="blue") is the site's primary action —
// New, Start writing, MenuButtons, etc. Its fill used to be a fixed blue.600 in
// both modes, which read as nearly the same blue as the fixed doenet.mainBlue
// section bands on the near-black dark-mode page. The fill is now mode-aware
// (buttonBlueBg): keep blue.600 in light mode, a brighter blue in dark mode.
describe("Solid blue Button", { tags: ["@group4"] }, () => {
  it("uses a brighter fill in dark mode than in light mode", () => {
    cy.mount(<Button colorScheme="blue">New</Button>);

    cy.contains("button", "New").then(($btn) => {
      const bg = window.getComputedStyle($btn[0]).backgroundColor;
      const m = bg.match(/rgba?\(([^)]+)\)/);
      const [r, g, b] = m![1].split(",").map((p) => parseFloat(p.trim()));
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const isDark = Cypress.env("colorMode") === "dark";
      // Simple (non-gamma) luminance, matching VisibilityPill.cy.tsx. blue.600
      // (light) computes to ~0.389; #2d75bc (dark) to ~0.419. Both are exact
      // (getComputedStyle returns the declared fill, not rendered pixels), so
      // asserting on either side of a midpoint threshold is deterministic.
      expect(
        luminance,
        `button luminance ${luminance.toFixed(3)} for ${isDark ? "dark" : "light"} mode (bg ${bg})`,
      ).to.be[isDark ? "above" : "below"](0.404);
    });
  });

  it("keeps white label text readable on the fill in both modes", () => {
    cy.mount(<Button colorScheme="blue">New</Button>);
    cy.contains("button", "New").should("be.visible");
    cy.checkContrast("button");
  });
});
