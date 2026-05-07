describe("Create Folders Tests", { tags: ["@group3"] }, function () {
  it("create and share folder", () => {
    const code = Date.now().toString();
    const scrappyEmail = `scrappy${code}@doo.com`;
    const scoobyEmail = `scooby${code}@doo.com`;

    // create scrappy account so can share content with it
    cy.loginAsTestUser({
      email: scrappyEmail,
      firstNames: "Scrappy",
      lastNames: "Doo",
      isAuthor: true,
    });

    cy.loginAsTestUser({
      email: scoobyEmail,
      firstNames: "Scooby",
      lastNames: "Doo",
      isAuthor: true,
    });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();
    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add Folder Button"]').click();
    cy.get('[data-test="New Content Input"]').type("My new folder{enter}");
    cy.get('[data-test="Content Card"]').click();

    cy.get('[data-test="Folder Title"]').should(
      "contain.text",
      "My new folder",
    );

    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add Folder Button"]').click();
    cy.get('[data-test="New Content Input"]').type(
      `Private folder${code}{enter}`,
    );

    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add Folder Button"]').click();
    cy.get('[data-test="New Content Input"]').type(
      `Shared folder${code}{enter}`,
    );

    cy.get('[data-test="Content Card"]').eq(1).click();
    cy.get('[data-test="Folder Title"]').should(
      "contain.text",
      `Shared folder${code}`,
    );

    cy.get('[data-test="Share Folder Button"]').click();
    cy.get('[data-test="Email address"]').type(`${scrappyEmail}{enter}`);
    cy.get('[data-test="Share Table"] tbody tr').should(
      "contain.text",
      scrappyEmail,
    );

    cy.get('[data-test="Email address"]').should("have.value", "");

    cy.get('[data-test="Share Close Button"]').click();

    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add Document Button"]').click();

    cy.get('[data-test="Activity Name Editable"]').type(
      "Shared activity{enter}",
    );

    cy.wait(200);

    cy.iframe().find(".cm-activeLine").type(`Hello${code}!{enter}`);
    cy.wait(200);

    cy.iframe().find('[data-test="Viewer Update Button"]').click();
    cy.wait(200);
    cy.iframe().find(".doenet-viewer").should("contain.text", `Hello${code}!`);

    cy.loginAsTestUser({
      email: scrappyEmail,
    });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();
    cy.get('[data-test="Shared With Me Button"]').click();

    cy.get('[data-test="Folder Title"]').should("have.text", "Shared with me");

    cy.get('[data-test="Content Card"]')
      .should("contain.text", `Shared folder${code}`)
      .click();

    cy.get('[data-test="Folder Heading"]').should(
      "contain.text",
      `Shared folder${code}`,
    );
    cy.get('[data-test="Content Card"]')
      .should("contain.text", `Shared activity`)
      .click();

    cy.iframe().find(".doenet-viewer").should("contain.text", `Hello${code}!`);
  });
});
