describe("ScratchPad Tests", { tags: ["@group1"] }, function () {
  it("closes Load menu when clicking in iframe", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.visit("/scratchPad");

    cy.iframe().find(".doenet-viewer").should("exist");

    cy.get('[data-test="Load Button"]').click({ force: true });
    cy.get('[data-test="ScratchPad Load Menu List"]:visible')
      .contains("Multiple Choice Examples")
      .should("exist");
    cy.dismissMenuByOverlay({
      overlayTestId: "ScratchPad Menu Dismiss Overlay",
      menuListTestId: "ScratchPad Load Menu List",
      assertTooltipClosed: false,
    });
  });

  it("does not leave Help tooltip open after menu closes by iframe click", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.visit("/scratchPad");

    cy.iframe().find(".doenet-viewer").should("exist");

    cy.get('[aria-label="Help"]').click({ force: true });
    cy.get('[data-test="ScratchPad Help Menu List"]:visible')
      .contains("Documentation")
      .should("exist");
    cy.dismissMenuByOverlay({
      overlayTestId: "ScratchPad Menu Dismiss Overlay",
      menuListTestId: "ScratchPad Help Menu List",
    });
  });

  it("does not leave Help tooltip open after menu closes by outside click", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.visit("/scratchPad");

    cy.iframe().find(".doenet-viewer").should("exist");

    cy.get('[aria-label="Help"]').click({ force: true });
    cy.get('[data-test="ScratchPad Help Menu List"]:visible')
      .contains("Documentation")
      .should("exist");

    cy.get('[data-test="Load Button"]').should("be.visible").click();

    cy.get('[data-test="ScratchPad Help Menu List"]:visible').should(
      "not.exist",
    );
    cy.get('[role="tooltip"]:visible').should("not.exist");
    cy.checkAccessibility("body");
  });
});
