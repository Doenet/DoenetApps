describe("Explore Category Filter Tests", { tags: ["@group3"] }, function () {
  it("category filters in the URL apply without fetching the categories first", () => {
    cy.loginAsTestUser();
    const code = Date.now().toString();

    cy.createContent({
      name: `Interactive${code}`,
      doenetML: `Filter${code}`,
      makePublic: true,
      categories: { isInteractive: true },
    });
    cy.createContent({
      name: `Video${code}`,
      doenetML: `Filter${code}`,
      makePublic: true,
      categories: { containsVideo: true },
    });

    // The Explore loader gets the categories with the results
    cy.intercept("GET", "/api/info/getAllCategories").as("getAllCategories");

    // Search, filtered by a category, alongside non-category parameters
    cy.visit(`/explore?q=Filter${code}&isInteractive`);

    cy.get('[data-test="Search Results For"]').should(
      "contain.text",
      `Filter${code}`,
    );
    cy.get('[aria-label="Clear filter: Interactive"]').should("be.visible");

    cy.get('[data-test="Community Tab"]').click();
    cy.get('[data-test="Searched Content List"]').should(
      "contain.text",
      `Interactive${code}`,
    );
    cy.get('[data-test="Searched Content List"]').should(
      "not.contain.text",
      `Video${code}`,
    );

    // Clearing the filter navigates without it and shows both results
    cy.get('[aria-label="Clear filter: Interactive"]').click();
    cy.url().should("not.contain", "isInteractive");
    cy.get('[aria-label="Clear filter: Interactive"]').should("not.exist");
    cy.get('[data-test="Searched Content List"]').should(
      "contain.text",
      `Video${code}`,
    );
    cy.get('[data-test="Searched Content List"]').should(
      "contain.text",
      `Interactive${code}`,
    );

    // Browse, filtered by a category
    cy.visit(`/explore?containsVideo`);
    cy.get('[aria-label="Clear filter: Video"]').should("be.visible");
    cy.get('[aria-label="Clear filter: Interactive"]').should("not.exist");

    cy.get("@getAllCategories.all").should("have.length", 0);
  });
});
