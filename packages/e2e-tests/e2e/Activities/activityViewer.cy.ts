describe("Activity Viewer Tests", { tags: ["@group1"] }, function () {
  it("classifications shown in activity viewer", () => {
    cy.loginAsTestUser();
    cy.createContent({
      name: "Classifications!",
      doenetML: "Hi!",
      classifications: [
        {
          systemShortName: "HS/C Math",
          category: "Algebra",
          subCategory: "Factoring",
          code: "Alg.FA.2",
        },
        {
          systemShortName: "CC Math",
          category: "HS",
          subCategory:
            "Seeing Structure in Expressions. Write expressions in equivalent forms to solve problems.",
          code: "A.SSE.3 a.",
        },
      ],
    }).then((contentId) => {
      cy.visit(`/activityViewer/${contentId}`);

      cy.get('[data-test="Classifications Footer"]').should(
        "contain.text",
        "Alg.FA.2",
      );
      cy.get('[data-test="Classifications Footer"]').should(
        "contain.text",
        "A.SSE.3 a.",
      );
      cy.get('[data-test="Classifications Footer"]').click();

      cy.get('[data-test="Classification 1"]').should(
        "contain.text",
        "Alg.FA.2",
      );
      cy.get('[data-test="Classification 2"]').should(
        "contain.text",
        "A.SSE.3 a.",
      );

      cy.get('[data-test="Close Settings Button"]').click();
      cy.get('[data-test="Classification 1"]').should("not.exist");

      cy.get('[data-test="Info Button"]').click();

      cy.get('[data-test="Classifications"]').click();
      cy.get('[data-test="Classification 1"]').should(
        "contain.text",
        "Alg.FA.2",
      );
      cy.get('[data-test="Classification 2"]').should(
        "contain.text",
        "A.SSE.3 a.",
      );
    });
  });

  it("closes Add To menu when clicking in iframe and does not leave tooltip", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({
      name: "Activity Viewer Menu Dismiss",
      doenetML: "<p>Hello from activity viewer</p>",
    }).then((contentId) => {
      cy.visit(`/activityViewer/${contentId}`);

      cy.iframe().find(".doenet-viewer").should("exist");

      cy.get('[data-test="Add To"]').click();
      cy.get('[data-test="Add Content To Menu List"]:visible')
        .contains("My Activities")
        .should("exist");
      cy.dismissMenuByOverlay({
        overlayTestId: "ActivityViewer Menu Dismiss Overlay",
        menuListTestId: "Add Content To Menu List",
      });
    });
  });

  it("does not leave Add To tooltip open after outside click closes menu", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({
      name: "Activity Viewer Tooltip Dismiss",
      doenetML: "<p>Hello from activity viewer tooltip test</p>",
    }).then((contentId) => {
      cy.visit(`/activityViewer/${contentId}`);

      cy.iframe().find(".doenet-viewer").should("exist");

      cy.get('[data-test="Add To"]').click();
      cy.get('[data-test="Add Content To Menu List"]:visible')
        .contains("My Activities")
        .should("exist");

      cy.get('[data-test="Info Button"]').click();

      cy.get('[data-test="Add Content To Menu List"]:visible').should(
        "not.exist",
      );
      cy.get('[role="tooltip"]:visible').should("not.exist");
      cy.checkAccessibility("body");
    });
  });
});
