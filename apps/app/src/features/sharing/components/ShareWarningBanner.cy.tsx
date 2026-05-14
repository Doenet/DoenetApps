import { ShareWarningBanner } from "./ShareWarningBanner";

describe("ShareWarningBanner", { tags: ["@group3"] }, () => {
  it("does not render when hidden", () => {
    cy.mount(
      <ShareWarningBanner
        shouldShowPublicComplianceWarning={false}
        openModal={async () => {}}
      />,
    );

    cy.get('[data-test="Editor Share Warning"]').should("not.exist");
  });

  it("handles click and keyboard activation when visible", () => {
    cy.mount(
      <ShareWarningBanner
        shouldShowPublicComplianceWarning={true}
        openModal={cy.spy().as("onClick")}
      />,
    );

    cy.get('[data-test="Editor Share Warning"]')
      .should("contain.text", "Public content is out of compliance.")
      .click();

    cy.get("@onClick").should("have.been.calledOnce");

    cy.get('[data-test="Editor Share Warning"]').trigger("keydown", {
      key: "Enter",
    });

    cy.get("@onClick").should("have.been.calledTwice");
  });
});
