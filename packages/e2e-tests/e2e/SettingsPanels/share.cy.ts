describe("Share panel tests", { tags: ["@group4"] }, function () {
  it("cannot select incompatible license after remix, ShareAlike", () => {
    const code = Date.now().toString();
    const scrappyEmail = `scrappy${code}@doo`;
    const scoobyEmail = `scooby${code}@doo`;

    cy.loginAsTestUser({
      email: scoobyEmail,
      firstNames: "Scooby",
      lastNames: "Doo",
    });

    cy.createContent({
      name: "Share alike",
      doenetML: "Shared with ShareAlike",
      makePublic: true,
    }).then((contentId) => {
      cy.visit(`/documentEditor/${contentId}/edit`);

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "Shared with ShareAlike");

      cy.get(`[data-test="Settings Button"]`).click();

      cy.get('[data-test="Select License"]').select(
        "Creative Commons Attribution-ShareAlike 4.0",
      );

      cy.get('[data-test="Select License"]').should("have.value", "CCBYSA");

      cy.loginAsTestUser({
        email: scrappyEmail,
        firstNames: "Scrappy",
        lastNames: "Doo",
      });

      cy.visit(`/activityViewer/${contentId}`);

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "Shared with ShareAlike");

      cy.get('[data-test="Add To"]').click();
      cy.get('[data-test="Add To My Activities"]').click();
      cy.get('[data-test="Go to Destination"]').click();

      cy.get('[data-test="Content Card"]').eq(0).click();

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "Shared with ShareAlike");

      cy.get(`[data-test="Settings Button"]`).click();

      cy.get('[data-test="Select License"]')
        .should("have.value", "CCBYSA")
        .should("be.disabled");
    });
  });

  it("cannot select incompatible license after remix, NonCommercial-ShareAlike", () => {
    const code = Date.now().toString();
    const scrappyEmail = `scrappy${code}@doo`;
    const scoobyEmail = `scooby${code}@doo`;

    cy.loginAsTestUser({
      email: scoobyEmail,
      firstNames: "Scooby",
      lastNames: "Doo",
    });

    cy.createContent({
      name: "Non-commercial share alike",
      doenetML: "Shared with NonCommercial-ShareAlike",
      makePublic: true,
    }).then((contentId) => {
      cy.visit(`/documentEditor/${contentId}/edit`);

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "Shared with NonCommercial-ShareAlike");

      cy.get(`[data-test="Settings Button"]`).click();

      cy.get('[data-test="Select License"]').select(
        "Creative Commons Attribution-NonCommercial-ShareAlike 4.0",
      );

      cy.get('[data-test="Select License"]').should("have.value", "CCBYNCSA");

      cy.loginAsTestUser({
        email: scrappyEmail,
        firstNames: "Scrappy",
        lastNames: "Doo",
      });

      cy.visit(`/activityViewer/${contentId}`);

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "Shared with NonCommercial-ShareAlike");

      cy.get('[data-test="Add To"]').click();
      cy.get('[data-test="Add To My Activities"]').click();
      cy.get('[data-test="Go to Destination"]').click();

      cy.get('[data-test="Content Card"]').eq(0).click();

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "Shared with NonCommercial-ShareAlike");

      cy.get(`[data-test="Settings Button"]`).click();

      cy.get('[data-test="Select License"]')
        .should("have.value", "CCBYNCSA")
        .should("be.disabled");
    });
  });

  it("can select license after remix, Dual License", () => {
    const code = Date.now().toString();
    const scrappyEmail = `scrappy${code}@doo`;
    const scoobyEmail = `scooby${code}@doo`;

    cy.loginAsTestUser({
      email: scoobyEmail,
      firstNames: "Scooby",
      lastNames: "Doo",
    });

    cy.createContent({
      name: "Dual license",
      doenetML: "Shared with Dual License",
      makePublic: true,
    }).then((contentId) => {
      cy.loginAsTestUser({
        email: scrappyEmail,
        firstNames: "Scrappy",
        lastNames: "Doo",
      });

      cy.visit(`/activityViewer/${contentId}`);

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "Shared with Dual License");

      cy.get('[data-test="Add To"]').click();
      cy.get('[data-test="Add To My Activities"]').click();
      cy.get('[data-test="Go to Destination"]').click();

      cy.get('[data-test="Content Card"]').eq(0).click();

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "Shared with Dual License");

      cy.get(`[data-test="Settings Button"]`).click();

      cy.get('[data-test="Select License"]')
        .should("have.value", "CCDUAL")
        .select("Creative Commons Attribution-ShareAlike 4.0");

      cy.get('[data-test="Select License"]').should("have.value", "CCBYSA");
    });
  });

  it("Remixes shown in remix panel", () => {
    const code = Date.now().toString();
    const scrappyEmail = `scrappy${code}@doo`;
    const scoobyEmail = `scooby${code}@doo`;

    cy.loginAsTestUser({
      email: scoobyEmail,
      firstNames: "Scooby",
      lastNames: "Doo",
    });

    cy.createContent({
      name: "Original activity",
      doenetML: "The original activity",
      makePublic: true,
    }).then((contentId) => {
      cy.visit(`/documentEditor/${contentId}/edit`);

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "The original activity");

      cy.get('[aria-label="View remixes"]').click();
      cy.get('[data-test="Not Remixed"]').should("contain.text", "Not remixed");

      cy.get('[data-test="No Remixes"]').should(
        "contain.text",
        "No visible remixes",
      );

      cy.loginAsTestUser({
        email: scrappyEmail,
        firstNames: "Scrappy",
        lastNames: "Doo",
      });

      cy.visit(`/activityViewer/${contentId}`);

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "The original activity");

      cy.get('[data-test="Add To"]').click();
      cy.get('[data-test="Add To My Activities"]').click();
      cy.get('[data-test="Go to Destination"]').click();

      cy.get('[data-test="Content Card"]').eq(0).click();

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", "The original activity");

      cy.get(`[data-test="Share Button"]`).click();
      cy.get(`[data-test="Share Publicly Button"]`).click();
      cy.get('[data-test="Public Status"]').should(
        "contain.text",
        "Content is public",
      );

      cy.get('[data-test="Share Close Button"]').click();

      cy.get(`[data-test="Settings Button"]`).click();

      cy.get('[data-test="Select License"]')
        .should("have.value", "CCDUAL")
        .select("Creative Commons Attribution-ShareAlike 4.0");

      cy.get('[data-test="Select License"]').should("have.value", "CCBYSA");

      cy.get('[aria-label="View remixes"]').click();

      cy.get('[data-test="Remix source 1"]').should(
        "contain.text",
        "Original activity",
      );

      cy.get('[data-test="No Remixes"]').should(
        "contain.text",
        "No visible remixes",
      );

      cy.loginAsTestUser({
        email: scoobyEmail,
      });

      cy.visit(`/documentEditor/${contentId}/edit`);

      cy.get('[aria-label="View remixes"]').click();
      cy.get('[data-test="Remix 1"]').should(
        "contain.text",
        "Original activity",
      );
    });
  });
});
