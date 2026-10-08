// Checks the API-error detection in `support/apiErrors.ts`, which every spec
// relies on to fail when the app gets an unexpected 4xx/5xx from the API.

const missingPath = "/api/e2eTest/missing";

/** Send a request from the app window (as the app's axios calls do) */
function sendXhr(method: string, url: string) {
  return cy.window().then(
    (win) =>
      new Cypress.Promise<number>((resolve) => {
        const xhr = new win.XMLHttpRequest();
        xhr.open(method, url);
        xhr.addEventListener("loadend", () => resolve(xhr.status));
        xhr.send();
      }),
  );
}

/**
 * Expect this test to fail with the API-error check's message, and pass it if
 * it does. The check's error ends the test at the point it is thrown, so any
 * later command fails it with a different message.
 */
function expectApiErrorFailure(expected: string) {
  cy.on("fail", (err) => {
    if (!err.message.includes(expected)) {
      throw err;
    }
  });
}

describe("API error detection", { tags: ["@group4"] }, function () {
  beforeEach(() => {
    cy.intercept("GET", `${missingPath}*`, {
      statusCode: 404,
      body: "not found",
    });
    cy.visit("/");
  });

  it("does not fail on an error declared with allowApiErrors", () => {
    cy.allowApiErrors({
      method: "get",
      path: new RegExp(`^${missingPath}$`),
      statusCode: 404,
    });
    sendXhr("GET", `${missingPath}?query=ignored`).should("eq", 404);
  });

  it("fails on an error that doesn't match the declared one", () => {
    expectApiErrorFailure(`Unexpected 404 response from GET ${missingPath}`);
    cy.allowApiErrors({
      path: new RegExp(`^${missingPath}$`),
      statusCode: 500,
    });
    sendXhr("GET", missingPath);
    cy.then(() => {
      throw new Error("The API error was not reported");
    });
  });

  // Runs after the allowed case above, so it also checks that a declared error
  // doesn't carry over to the next test.
  it("fails on an undeclared error", () => {
    expectApiErrorFailure(`Unexpected 404 response from GET ${missingPath}`);
    sendXhr("GET", missingPath);
    cy.then(() => {
      throw new Error("The API error was not reported");
    });
  });
});
