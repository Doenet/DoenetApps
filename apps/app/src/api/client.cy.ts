import { api, ApiError } from "./client";

const isAxiosError = (e: unknown) =>
  (e as { isAxiosError?: boolean } | null)?.isAxiosError === true;

describe("api()", { tags: ["@group1"] }, () => {
  it("returns the response body on success", () => {
    cy.intercept("GET", "/api/assign/getAssigned", {
      body: { assignments: [] },
    });

    cy.then(() => api("getAssigned")).then((data) => {
      expect(data).to.deep.equal({ assignments: [] });
    });
  });

  it("throws ApiError carrying the status and error body on a non-2xx response", () => {
    cy.intercept("GET", "/api/assign/getAssigned", {
      statusCode: 500,
      body: { error: "boom" },
    });

    cy.then(() =>
      api("getAssigned").then(
        () => null,
        (e: unknown) => e,
      ),
    ).then((e) => {
      expect(e).to.be.instanceOf(ApiError);
      const error = e as ApiError;
      expect(error.operation).to.equal("getAssigned");
      expect(error.status).to.equal(500);
      expect(error.body).to.deep.equal({ error: "boom" });
      expect(error.message).to.equal(
        "getAssigned failed with status 500: boom",
      );
      expect(isAxiosError(error.cause)).to.equal(true);
    });
  });

  it("omits the error suffix when the body has no error message", () => {
    cy.intercept("GET", "/api/assign/getAssigned", {
      statusCode: 404,
      body: "Not Found",
    });

    cy.then(() =>
      api("getAssigned").then(
        () => null,
        (e: unknown) => e,
      ),
    ).then((e) => {
      expect(e).to.be.instanceOf(ApiError);
      expect((e as ApiError).status).to.equal(404);
      expect((e as ApiError).message).to.equal(
        "getAssigned failed with status 404",
      );
    });
  });

  it("rethrows the original error when there is no response", () => {
    cy.intercept("GET", "/api/assign/getAssigned", { forceNetworkError: true });

    cy.then(() =>
      api("getAssigned").then(
        () => null,
        (e: unknown) => e,
      ),
    ).then((e) => {
      expect(e).not.to.be.instanceOf(ApiError);
      expect(isAxiosError(e)).to.equal(true);
    });
  });
});
