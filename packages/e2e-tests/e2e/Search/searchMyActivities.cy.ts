describe("Search My Activities Tests", { tags: ["@group3"] }, function () {
  it("test search button", () => {
    cy.loginAsTestUser();

    cy.createContent({
      name: `A document to search`,
      doenetML: "An eagle flies over the river.",
    });

    cy.createContent({
      name: "A problem set to search",
      contentType: "sequence",
      classifications: [
        {
          systemShortName: "HS/C Math",
          category: "Algebra",
          subCategory: "Factoring",
          code: "Alg.FA.2",
        },
      ],
    }).then((contentId) => {
      cy.createContent({
        name: "The first problem",
        doenetML: "A bird soars above the mountains.",
        parentId: contentId,
      });
      cy.createContent({
        name: "The second problem",
        doenetML: "The fish swims in the lake.",
        parentId: contentId,
      });
    });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    // Make sure bug where didn't search didn't activate on first enter press is fixed
    cy.get('[data-test="Search Input"]').type("fish{enter}");
    cy.get('[data-test="Content Card"]').should("have.length", 1);
    cy.get('[data-test="Content Card"]')
      .first()
      .contains("problem set to search");

    // Make sure bug where search didn't activate on first click is fixed
    cy.get('[data-test="Search Input"]').clear().type("eagle");
    cy.get('[data-test="Search Button"]').click();
    cy.get('[data-test="Content Card"]').should("have.length", 1);
    cy.get('[data-test="Content Card"]').first().contains("document to search");
  });
});
