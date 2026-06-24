describe("Scroll Reset on Navigation", { tags: ["@group2"] }, function () {
  it("resets scroll position when navigating to a different page", () => {
    cy.loginAsTestUser();

    // Create content so the activities page has items to display
    cy.createContent({ name: "Activity 1", doenetML: "Hello!" });
    cy.createContent({ name: "Activity 2", doenetML: "World!" });

    cy.getUserInfo().then((user) => {
      // Use a narrow viewport height so the page is scrollable with just a few items
      cy.viewport(1000, 300);

      cy.visit(`/activities/${user.userId}`);

      // Wait for content to load
      cy.get('[data-test="Activities"]').should("exist");

      // Verify the main container is scrollable
      cy.get('[data-test="Main Content"]').should(($el) => {
        expect($el[0].scrollHeight).to.be.greaterThan($el[0].clientHeight);
      });

      // Scroll down in the main content area
      cy.get('[data-test="Main Content"]').scrollTo("bottom");

      // Verify we scrolled down
      cy.get('[data-test="Main Content"]').should(($el) => {
        expect($el[0].scrollTop).to.be.greaterThan(0);
      });

      // Navigate to Explore
      cy.get('[data-test="Explore"]').click();
      cy.url().should("include", "/explore");

      // Scroll position should be reset to top after navigation
      cy.get('[data-test="Main Content"]').should(($el) => {
        expect($el[0].scrollTop).to.equal(0);
      });
    });
  });
});
