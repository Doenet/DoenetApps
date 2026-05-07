describe("Search results Tests", { tags: ["@group3"] }, function () {
  // We removed the hamburger menu on the search page
  it.skip("classifications shown in search", () => {
    cy.loginAsTestUser();
    const code = Date.now().toString();

    cy.createContent({
      name: `Classifications${code}!`,
      doenetML: "Hi!",
      makePublic: true,
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
    }).then(() => {
      cy.visit(`/explore?q=Classifications${code}`);

      cy.get('[data-test="Search Results For"]').should(
        "contain.text",
        `Classifications${code}`,
      );

      cy.get('[data-test="Community Tab"]').click();

      cy.get(
        '[data-test="Community Results"] [data-test="Content Card"] [data-test="Card Menu Button"]',
      ).click();

      cy.get(
        '[data-test="Community Results"] [data-test="Content Card"] [data-test="Document Information"]',
      )
        .eq(0)
        .click();

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
});
