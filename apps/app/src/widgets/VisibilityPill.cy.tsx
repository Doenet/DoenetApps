import { VisibilityPill } from "./Card";

describe("VisibilityPill", { tags: ["@group4"] }, () => {
  // The Unlisted/Public pills used fixed light fills (blue.50 / green.50) that
  // don't flip, rendering as a light pill in dark mode. Assert the pill
  // background tracks the active color mode. (Contrast passes either way since
  // the text is also fixed, so a luminance check — not checkContrast — is what
  // catches this.)
  (["unlisted", "public"] as const).forEach((visibility) => {
    it(`renders a ${visibility} pill background that matches the color mode`, () => {
      cy.mount(<VisibilityPill visibility={visibility} />);

      cy.get('[data-test="Visibility Pill"]').then(($pill) => {
        const bg = window.getComputedStyle($pill[0]).backgroundColor;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        const [r, g, b] = m![1].split(",").map((p) => parseFloat(p.trim()));
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const isDark = Cypress.env("colorMode") === "dark";
        expect(
          luminance,
          `pill luminance ${luminance.toFixed(2)} for ${isDark ? "dark" : "light"} mode (bg ${bg})`,
        ).to.be[isDark ? "below" : "above"](0.5);
      });
    });
  });

  it("keeps every visibility pill label readable", () => {
    (["private", "unlisted", "public"] as const).forEach((visibility) => {
      cy.mount(<VisibilityPill visibility={visibility} />);
      cy.get('[data-test="Visibility Pill"]').should("be.visible");
      cy.checkContrast('[data-test="Visibility Pill"]');
    });
  });
});
