import { DescriptionPopover } from "./DescriptionPopover";

describe("DescriptionPopover", { tags: ["@group3"] }, () => {
  it("shows the description when the info button is clicked", () => {
    cy.intercept("GET", "**/api/info/getContentDetails/**", {
      statusCode: 200,
      body: { description: "Line one.\nLine two." },
    }).as("getContentDetails");

    cy.mount(
      <DescriptionPopover contentId="test-content-123" title="My Activity" />,
    );

    cy.get('[data-test="Description Popover"]').should("not.exist");
    cy.get('[data-test="Description Info Button"]')
      .should("have.attr", "aria-label", "Description of My Activity")
      .click();

    cy.wait("@getContentDetails")
      .its("request.url")
      .should("contain", "/api/info/getContentDetails/test-content-123");
    cy.get('[data-test="Description Popover"]')
      .should("be.visible")
      .and("contain.text", "My Activity")
      .and("contain.text", "Line one.")
      .and("contain.text", "Line two.");

    cy.checkAccessibility("body");
  });

  it("says when there is no description", () => {
    cy.intercept("GET", "**/api/info/getContentDetails/**", {
      statusCode: 200,
      body: { description: null },
    }).as("getContentDetails");

    cy.mount(
      <DescriptionPopover contentId="test-content-123" title="My Activity" />,
    );
    cy.get('[data-test="Description Info Button"]').click();
    cy.wait("@getContentDetails");

    cy.get('[data-test="Description Popover"]').should(
      "contain.text",
      "No description provided.",
    );
  });

  it("shows an error message if the description can't be loaded", () => {
    cy.intercept("GET", "**/api/info/getContentDetails/**", {
      statusCode: 404,
      body: { error: "Not found" },
    }).as("getContentDetails");

    cy.mount(
      <DescriptionPopover contentId="test-content-123" title="My Activity" />,
    );
    cy.get('[data-test="Description Info Button"]').click();
    cy.wait("@getContentDetails");

    cy.get('[data-test="Description Popover"]').should(
      "contain.text",
      "Could not load the description.",
    );
  });

  it("fetches the description only once", () => {
    let calls = 0;
    cy.intercept("GET", "**/api/info/getContentDetails/**", (req) => {
      calls++;
      req.reply({ statusCode: 200, body: { description: "Fetched once" } });
    }).as("getContentDetails");

    cy.mount(
      <DescriptionPopover contentId="test-content-123" title="My Activity" />,
    );

    // Open, close, and reopen
    cy.get('[data-test="Description Info Button"]').click();
    cy.wait("@getContentDetails");
    cy.get('[data-test="Description Popover"]').should(
      "contain.text",
      "Fetched once",
    );
    cy.get('[data-test="Description Info Button"]').click();
    cy.get('[data-test="Description Popover"]').should("not.be.visible");
    cy.get('[data-test="Description Info Button"]').click();
    cy.get('[data-test="Description Popover"]').should(
      "contain.text",
      "Fetched once",
    );

    cy.then(() => expect(calls).eq(1));
  });
});
