import axios from "axios";

import { isOutdatedBuild, sendClientBuild } from "./clientBuild";

describe("clientBuild", { tags: ["@group2"] }, () => {
  const build = "1111111111111111111111111111111111111111";

  describe("sendClientBuild", () => {
    it("adds X-Client-Build to /api requests", () => {
      const instance = axios.create();
      sendClientBuild(instance, build);
      cy.intercept("GET", "/api/clientBuildTest", { body: {} }).as("api");

      cy.then(() => instance.get("/api/clientBuildTest"));
      cy.wait("@api")
        .its("request.headers")
        .should("have.property", "x-client-build", build);
    });

    it("leaves other requests alone, such as uploads to S3", () => {
      const instance = axios.create();
      sendClientBuild(instance, build);
      cy.intercept("PUT", "https://bucket.example.com/upload", {
        body: {},
      }).as("upload");

      cy.then(() => instance.put("https://bucket.example.com/upload", "file"));
      cy.wait("@upload")
        .its("request.headers")
        .should("not.have.property", "x-client-build");
    });

    it("does nothing without a built-in commit, as in local dev", () => {
      const instance = axios.create();
      sendClientBuild(instance, undefined);
      cy.intercept("GET", "/api/clientBuildTest", { body: {} }).as("api");

      cy.then(() => instance.get("/api/clientBuildTest"));
      cy.wait("@api")
        .its("request.headers")
        .should("not.have.property", "x-client-build");
    });
  });

  describe("isOutdatedBuild", () => {
    function expectOutdated(expected: boolean, tabBuild: string | undefined) {
      cy.then(() => isOutdatedBuild(tabBuild)).should("equal", expected);
    }

    it("is true once a different build is deployed", () => {
      cy.intercept("GET", "/version.json", { body: { sha: "2".repeat(40) } });
      expectOutdated(true, build);
    });

    it("is false while the deployed build is this one", () => {
      cy.intercept("GET", "/version.json", { body: { sha: build } });
      expectOutdated(false, build);
    });

    it("is false when /version.json is missing", () => {
      cy.intercept("GET", "/version.json", { statusCode: 404, body: "" });
      expectOutdated(false, build);
    });

    it("is false when /version.json has no sha", () => {
      cy.intercept("GET", "/version.json", { body: {} });
      expectOutdated(false, build);
    });

    it("is false without a built-in commit, as in local dev", () => {
      cy.intercept("GET", "/version.json", { body: { sha: build } });
      expectOutdated(false, undefined);
    });
  });
});
