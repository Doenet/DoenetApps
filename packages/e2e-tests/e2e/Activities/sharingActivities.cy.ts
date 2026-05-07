import { toMathJaxString } from "@doenet-tools/shared";

describe("Share Activities Tests", function () {
  it("create, share, and copy public activity", { tags: ["@brittle1"] }, () => {
    const code = Date.now().toString();
    const scrappyEmail = `scrappy${code}@doo`;
    const scoobyEmail = `scooby${code}@doo`;

    cy.loginAsTestUser({
      email: scoobyEmail,
      firstNames: "Scooby",
      lastNames: "Doo",
      isAuthor: true,
    });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();
    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add Document Button"]').click();

    cy.get('[data-test="Editable Title"]').type(
      `My new activity${code}{enter}`,
    );

    // Edit content - wait for editor to be ready before typing
    cy.getIframeBody("iframe", ".cm-activeLine").within(() => {
      cy.get(".cm-activeLine").type("Hello there! <m>x</m>");
      cy.wait(500); // Wait for text to be set
      cy.get(".cm-editor").click(); // Click to ensure focus
      cy.wait(300);
      cy.get(".cm-activeLine").type("{enter}");
      cy.wait(300);
      cy.get(".cm-activeLine").type("{ctrl+S}");
    });

    // Verify viewer shows content
    cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
      cy.get(".doenet-viewer").should(
        "contain.text",
        `Hello there! ${toMathJaxString("x")}`,
      );
    });

    cy.get('[data-test="Share Button"]').click();
    cy.get('[data-test="Public Status"]').should(
      "contain.text",
      "Content is not public",
    );
    cy.get('[data-test="Share Publicly Button"]').click();
    cy.get('[data-test="Public Status"]').should(
      "contain.text",
      "Content is public",
    );

    cy.get('[data-test="Share Close Button"]').click();

    cy.loginAsTestUser({
      email: scrappyEmail,
    });
    cy.visit("/");

    cy.get('[data-test="Explore"]').click();
    cy.get('[data-test="Search"]').type(`activity${code}{enter}`);

    cy.get('[data-test="Search Results For"]').should(
      "contain.text",
      `activity${code}`,
    );

    cy.get('[data-test="Community Tab"]').click();

    // Click on the content card
    cy.get('[data-test="Community Results"]')
      .find('[data-test="Content Card"]')
      .click();

    // Verify viewer shows content (and wait for MathJax to load)
    cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
      cy.get(".doenet-viewer").should(
        "contain.text",
        `Hello there! ${toMathJaxString("x")}`,
      );
    });

    cy.get('[data-test="Add To"]').click();
    cy.get('[data-test="Add To My Activities"]').click();

    cy.get('[data-test="Go to Destination"]').click();

    // Click the first content card - use eq() on a fresh query
    cy.get(`[data-test="Content Card"]`).eq(0).click();

    cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
      cy.get(".doenet-viewer").should(
        "contain.text",
        `Hello there! ${toMathJaxString("x")}`,
      );
    });
  });

  it("Share activity with particular person", { tags: ["@group1"] }, () => {
    const code = Date.now().toString();
    const scrappyEmail = `scrappy${code}@doo.org`;
    const scoobyEmail = `scooby${code}@doo.org`;

    cy.loginAsTestUser({
      email: scoobyEmail,
      firstNames: "Scooby",
      lastNames: "Doo",
    });

    cy.loginAsTestUser({
      email: scrappyEmail,
      firstNames: "Scrappy",
      lastNames: "Doo",
    });

    cy.createContent({
      name: "Shared Activity",
      contentType: "singleDoc",
      doenetML: `<p>This is a shared activity.</p>`,
    }).then((activityId) => {
      cy.visit(`/documentEditor/${activityId}/edit`);

      cy.get('[data-test="Share Button"]').click();

      cy.get('[data-test="Email address"]').type(`${scoobyEmail}{enter}`);

      cy.get('[data-test="Share Table"]').should(
        "contain.text",
        `${scoobyEmail}`,
      );
      cy.get('[data-test="Share Table"]').should("contain.text", `Scooby Doo`);

      cy.get('[data-test="Share Close Button"]').click();

      // User the activity is shared with can see it
      cy.loginAsTestUser({
        email: scoobyEmail,
      });

      cy.visit("/");

      cy.get('[data-test="My Activities"]').click();

      cy.get('[data-test="Shared With Me Button"]').click();

      cy.get('[data-test="Content Card"]')
        .should("contain.text", `Shared Activity`)
        .click();

      cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
        cy.get(".doenet-viewer").should(
          "contain.text",
          "This is a shared activity.",
        );
      });

      // Other user cannot see shared activity
      cy.loginAsTestUser();
      cy.visit("/");
      cy.get('[data-test="My Activities"]').click();
      cy.get('[data-test="Shared With Me Button"]').click();
      cy.get('[data-test="Folder Title"]').should(
        "have.text",
        "Shared with me",
      );
      cy.get('[data-test="Content Card"]').should("not.exist");
    });
  });
});
