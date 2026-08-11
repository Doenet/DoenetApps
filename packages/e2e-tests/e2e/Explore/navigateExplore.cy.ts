describe("Navigate Explore Tests", { tags: ["@group3"] }, function () {
  it("shows helpful message and switch button when curated tab has no matches but community does", () => {
    cy.loginAsTestUser({ isEditor: true });

    const code = Date.now().toString();

    // Create public (community) content that is NOT published to the library
    cy.createContent({
      name: `CommunityOnly${code}`,
      doenetML: "Community only content",
      makePublic: true,
    }).then(() => {
      cy.visit(`/explore?q=CommunityOnly${code}`);

      // Curated tab should be active with 0 results
      cy.get('[data-test="Curated Tab"]').should(
        "have.attr",
        "aria-selected",
        "true",
      );

      // Should show message mentioning community matches, not just "No Matches Found!"
      cy.get('[data-test="Curated Empty With Community Results"]').should(
        "be.visible",
      );
      cy.get('[data-test="Curated Empty With Community Results"]').should(
        "contain.text",
        "No Curated Matches Found!",
      );
      cy.get('[data-test="Curated Empty With Community Results"]').should(
        "contain.text",
        "Community",
      );

      // Clicking the switch button should go to the Community tab
      cy.get('[data-test="Switch To Community Tab"]').click();
      cy.get('[data-test="Community Tab"]').should(
        "have.attr",
        "aria-selected",
        "true",
      );
      cy.get('[data-test="Curated Tab"]').should(
        "have.attr",
        "aria-selected",
        "false",
      );
    });
  });

  it("remember explore's current tab", () => {
    cy.loginAsTestUser({ isEditor: true });

    // make sure library contains at least one item
    cy.createContent({
      name: "Hello!",
      doenetML: "Initial content",
      makePublic: true,
      publishInLibrary: true,
    }).then(() => {
      cy.visit(`/explore`);

      // initially curated tab is selected
      cy.get('[data-test="Curated Tab"]').should(
        "have.attr",
        "aria-selected",
        "true",
      );
      cy.get('[data-test="Community Tab"]').should(
        "have.attr",
        "aria-selected",
        "false",
      );

      // select community tab
      cy.get('[data-test="Community Tab"]').click();
      cy.get('[data-test="Community Tab"]').should(
        "have.attr",
        "aria-selected",
        "true",
      );
      cy.get('[data-test="Curated Tab"]').should(
        "have.attr",
        "aria-selected",
        "false",
      );

      // Navigate away and click Explore again
      // Community tab should still be selected
      cy.get('[data-test="Home"]').click();
      cy.get('[data-test="Explore"]').click();

      cy.get('[data-test="Community Tab"]').should(
        "have.attr",
        "aria-selected",
        "true",
      );
      cy.get('[data-test="Curated Tab"]').should(
        "have.attr",
        "aria-selected",
        "false",
      );

      // search for name and select author tab
      cy.get('[data-test="Search"]').type("Test{enter}");

      cy.get('[data-test="Authors Tab"]').click();
      cy.get('[data-test="Authors Tab"]').should(
        "have.attr",
        "aria-selected",
        "true",
      );
      cy.get('[data-test="Community Tab"]').should(
        "have.attr",
        "aria-selected",
        "false",
      );

      // Navigate away and click back button
      // Query should still be active and authors tab should still be selected
      cy.get('[data-test="Home"]').click();
      cy.go("back");

      cy.get('[data-test="Authors Tab"]').should(
        "have.attr",
        "aria-selected",
        "true",
      );

      // Navigate away and click Explore again
      // The query, and hence the author tab, should be gone, which means curated tab should be open
      cy.get('[data-test="Home"]').click();
      cy.get('[data-test="Explore"]').click();

      cy.get('[data-test="Curated Tab"]').should(
        "have.attr",
        "aria-selected",
        "true",
      );
      cy.get('[data-test="Authors Tab"]').should(
        "have.attr",
        "aria-selected",
        "false",
      );
    });
  });
});
