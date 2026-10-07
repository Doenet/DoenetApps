import { ShareButton } from "./ShareButton";

describe("ShareButton", { tags: ["@group3"] }, () => {
  it("shows visibility-specific label and aria text", () => {
    cy.mount(
      <ShareButton
        optimisticVisibility="unlisted"
        shouldShowPublicComplianceWarning={false}
        isDisabled={false}
        openModal={cy.spy().as("onClick")}
      />,
    );

    cy.get('[data-test="Share Button"]')
      .should("contain.text", "Sharing settings")
      .and("contain.text", "Unlisted")
      .and(
        "have.attr",
        "aria-label",
        "Open sharing settings. Current access: Unlisted",
      )
      .click();

    cy.get("@onClick").should("have.been.calledOnce");
  });

  it("includes compliance warning text when issues are present", () => {
    cy.mount(
      <ShareButton
        optimisticVisibility="public"
        shouldShowPublicComplianceWarning={true}
        isDisabled={false}
        openModal={async () => {}}
      />,
    );

    cy.get('[data-test="Share Button"]')
      .should("contain.text", "Action required")
      .and(
        "have.attr",
        "aria-label",
        "Open sharing settings. Current access: Public. Action required: review sharing requirements for public content.",
      );
  });

  // The visibility pills used near-white fills (blue.50 / green.50 / gray.50)
  // that don't flip, rendering as a light pill in dark mode. Assert the pill
  // background tracks the active color mode instead of staying light.
  (["unlisted", "public", "private"] as const).forEach((visibility) => {
    it(`renders a ${visibility} pill background that matches the color mode`, () => {
      cy.mount(
        <ShareButton
          optimisticVisibility={visibility}
          shouldShowPublicComplianceWarning={false}
          isDisabled={false}
          openModal={cy.spy()}
        />,
      );

      cy.get('[data-test="Share Button"]').then(($btn) => {
        const bg = window.getComputedStyle($btn[0]).backgroundColor;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        const [r, g, b] = m![1].split(",").map((p) => parseFloat(p.trim()));
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const isDark = Cypress.env("colorMode") === "dark";
        // A dark pill has low luminance; a light pill has high luminance.
        expect(
          luminance,
          `pill luminance ${luminance.toFixed(2)} for ${isDark ? "dark" : "light"} mode (bg ${bg})`,
        ).to.be[isDark ? "below" : "above"](0.5);
      });
    });
  });

  it("respects disabled state", () => {
    cy.mount(
      <ShareButton
        optimisticVisibility="private"
        shouldShowPublicComplianceWarning={false}
        isDisabled={true}
        openModal={cy.spy().as("onClick")}
      />,
    );

    cy.get('[data-test="Share Button"]').should("be.disabled");
    cy.get("@onClick").should("not.have.been.called");
  });
});
