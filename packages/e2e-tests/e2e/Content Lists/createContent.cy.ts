describe("Create Content Tests", { tags: ["@group3"] }, function () {
  it("create new content of each type", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();
    cy.get('[data-test="New Button"]').should("be.visible");

    cy.get(`[data-test="Content Card"]`).should("not.exist");

    cy.log("create document");
    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add Document Button"]').click();
    cy.get('[data-test="Editable Title"]').should(
      "have.text",
      "Untitled Document",
    );
    cy.get('[data-test="Editable Title"]').type("Document 1{enter}");

    cy.iframe().find(".doenet-viewer").should("exist");

    cy.go("back");
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");

    cy.log("create problem set");
    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add Problem Set Button"]').click();
    cy.get('[data-test="Editable Title"]').should(
      "have.text",
      "Untitled Problem Set",
    );
    cy.get('[data-test="Editable Title"]').type("Problem Set 1{enter}");
    cy.go("back");
    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set 1");

    cy.log("create folder");
    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add Folder Button"]').click();
    cy.get('[data-test="New Content Input"]').should(
      "have.value",
      "Untitled Folder",
    );
    cy.get('[data-test="New Content Input"]').type("Folder 1{enter}");
    cy.get(`[data-test="Content Card"]`).should("have.length", 3);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set 1");
    cy.get(`[data-test="Content Card"]`)
      .eq(2)
      .should("contain.text", "Folder 1");
  });
});
