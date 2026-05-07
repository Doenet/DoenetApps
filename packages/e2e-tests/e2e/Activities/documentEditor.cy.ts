describe("Document Editor Tests", { tags: ["@group1"] }, function () {
  it("correctly restore editor state after clicking view", () => {
    // test bug where document editor was not restoring itself with the correct state
    // after one switched to view mode and back

    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({
      name: "Hello!",
      doenetML: "Initial content",
    }).then((activityId) => {
      cy.visit(`/documentEditor/${activityId}/edit`);

      // Wait for viewer to display initial content
      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", `Initial content`);

      cy.iframe().find(".cm-activeLine").type("{enter}More!");
      cy.wait(100);

      // Switch to view mode
      cy.get(`[data-test="View Mode Button"]`).click();
      cy.wait(1000);

      // Verify editor is hidden
      cy.iframe().find(".cm-editor").should("not.exist");

      // Verify viewer shows updated content - separate queries
      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", `Initial content`);
      cy.iframe().find(".doenet-viewer").should("contain.text", `More!`);

      // Switch back to edit mode
      cy.get(`[data-test="Edit Mode Button"]`).click();
      cy.wait(100);

      // Verify editor is back - separate queries
      cy.iframe().find(".cm-editor").should("contain.text", "Initial content");
      cy.iframe().find(".cm-editor").should("contain.text", "More!");

      // Verify viewer still shows content - separate queries
      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", `Initial content`);
      cy.iframe().find(".doenet-viewer").should("contain.text", `More!`);
    });
  });

  it("closes Help menu when clicking in iframe and does not leave tooltip", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({
      name: "Editor Help Menu",
      doenetML: "<p>Hello document editor help menu</p>",
    }).then((activityId) => {
      cy.visit(`/documentEditor/${activityId}/edit`);

      cy.iframe().find(".doenet-viewer").should("exist");

      cy.get('[aria-label="Help"]').click({ force: true });
      cy.get('[data-test="Editor Header Help Menu List"]:visible')
        .contains("Documentation")
        .should("exist");
      cy.get('[aria-label="Help"]').should(
        "have.attr",
        "aria-expanded",
        "true",
      );
      cy.dismissMenuByOverlay({
        overlayTestId: "Editor Header Menu Dismiss Overlay",
        menuListTestId: "Editor Header Help Menu List",
      });
      cy.get('[aria-label="Help"]').should(
        "have.attr",
        "aria-expanded",
        "false",
      );
    });
  });

  it("does not leave Help tooltip open after outside click closes menu", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({
      name: "Editor Help Tooltip",
      doenetML: "<p>Hello document editor help tooltip</p>",
    }).then((activityId) => {
      cy.visit(`/documentEditor/${activityId}/edit`);

      cy.iframe().find(".doenet-viewer").should("exist");

      cy.get('[aria-label="Help"]').click({ force: true });
      cy.get('[data-test="Editor Header Help Menu List"]:visible')
        .contains("Documentation")
        .should("exist");

      cy.get('[data-test="Share Button"]').should("be.visible").click();

      cy.get('[aria-label="Help"]').should(
        "have.attr",
        "aria-expanded",
        "false",
      );
      cy.get('[data-test="Editor Header Help Menu List"]:visible').should(
        "not.exist",
      );
      cy.get('[role="tooltip"]:visible').should("not.exist");
      cy.checkAccessibility("body");
    });
  });
});
