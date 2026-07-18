import { ScoreSummaryChart } from "./ScoreSummaryChart";

describe("ScoreSummaryChart", { tags: ["@group4"] }, () => {
  const data = [
    { score: 0, count: 2 },
    { score: 0.5, count: 5 },
    { score: 1, count: 3 },
  ];

  // Recharts axis/label/grid previously used library-default grays (~#666 text)
  // that don't respond to the color mode, so on the dark page the axis text read
  // as dim, sub-AA gray. The colors are now driven from the textMuted/border
  // tokens; assert the rendered axis text tracks the mode.
  it("renders axis tick text in a color that matches the color mode", () => {
    cy.mount(<ScoreSummaryChart data={data} />);

    cy.get(".recharts-cartesian-axis-tick-value")
      .first()
      .then(($t) => {
        const fill = window.getComputedStyle($t[0]).fill;
        const m = fill.match(/rgba?\(([^)]+)\)/);
        const [r, g, b] = m![1].split(",").map((p) => parseFloat(p.trim()));
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const isDark = Cypress.env("colorMode") === "dark";
        // Light axis #4a5568 (luminance ~0.33); dark axis #a8a8a8 (~0.66).
        expect(
          luminance,
          `axis fill ${fill} (luminance ${luminance.toFixed(2)}) for ${isDark ? "dark" : "light"} mode`,
        ).to.be[isDark ? "above" : "below"](0.5);
      });
  });

  it("keeps the axis labels readable in both modes", () => {
    cy.mount(<ScoreSummaryChart data={data} />);
    cy.contains(".recharts-label", "Score").should("be.visible");
    cy.contains(".recharts-label", "Number of students").should("be.visible");
  });
});
