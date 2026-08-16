describe("Activity Viewer Tests", { tags: ["@group1"] }, function () {
  it("can view content list of problem set when not logged in", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({
      name: "Public Problem Set",
      contentType: "sequence",
      makePublic: true,
    }).then((sequenceId) => {
      cy.createContent({
        name: "Doc Inside Problem Set",
        contentType: "singleDoc",
        parentId: sequenceId,
        doenetML: "Hello from inside!",
      });

      // Log out so we visit as an anonymous/unauthenticated user
      cy.clearCookies();

      cy.visit(`/activityViewer/${sequenceId}`);

      // The activity name should render
      cy.get('[data-test="Activity Name"]').should(
        "contain.text",
        "Public Problem Set",
      );

      // Click the "Edit Mode Button" (shows "See source code" / "See list")
      cy.get('[data-test="Edit Mode Button"]').click();

      // The activities list should appear without crashing
      cy.get('[data-test="Activities"]').should("exist");

      // The doc inside the problem set should be listed
      cy.get('[data-test="Activities"]').should(
        "contain.text",
        "Doc Inside Problem Set",
      );

      // The "Add" button should NOT be visible (read-only for non-logged-in users)
      cy.get('[data-test="New Button"]').should("not.exist");
    });
  });

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
