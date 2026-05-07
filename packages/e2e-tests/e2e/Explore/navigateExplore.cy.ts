describe("Navigate Explore Tests", { tags: ["@group3"] }, function () {
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
