describe("Create Assignment Tests", { tags: ["@group1"] }, function () {
  it("verify bug fixed from creating assignment", () => {
    cy.loginAsTestUser();

    cy.createContent({
      name: "Problem 1",
      contentType: "singleDoc",
      doenetML: `<m>x + x =</m> <answer name="ans">2x</answer>`,
    }).then((contentId) => {
      cy.visit(`/documentEditor/${contentId}/settings`);

      cy.get('[data-test="Create Assignment"]').click();
      cy.get('[data-test="Confirm Create Assignment"]').click();

      // Save in My Activities
      cy.get('[data-test="Execute MoveCopy Button"]').click();

      cy.get('[data-test="Execute MoveCopy Button"]').should("not.exist");

      // wait a moment and make sure that we don't have error page
      // (checking for a bug where used a fetcher twice)
      cy.wait(200);

      cy.get('[data-test="unlimited-attempts-switch"]').should("be.visible");
    });
  });
});
