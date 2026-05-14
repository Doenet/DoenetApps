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

    cy.get('[data-test="Share Button"]').should(
      "have.attr",
      "aria-label",
      "Open sharing settings. Current access: Public. Warning: public content does not meet requirements.",
    );
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
