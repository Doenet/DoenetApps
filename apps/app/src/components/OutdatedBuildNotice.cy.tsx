import { ChakraProvider } from "@chakra-ui/react";
import { mount } from "cypress/react";

import { OutdatedBuildNotice } from "./OutdatedBuildNotice";
import { theme } from "../theme";

describe("OutdatedBuildNotice", { tags: ["@group2"] }, () => {
  const build = "1111111111111111111111111111111111111111";
  const notice = '[data-test="Outdated Build Notice"]';

  function mountNotice() {
    mount(
      <ChakraProvider theme={theme}>
        <OutdatedBuildNotice build={build} />
      </ChakraProvider>,
    );
  }

  it("suggests a reload once a different build is deployed", () => {
    cy.intercept("GET", "/version.json", { body: { sha: "2".repeat(40) } });
    mountNotice();

    cy.get(notice)
      .should("have.attr", "data-state", "outdated")
      .and("contain.text", "Doenet has been updated since this page was opened")
      .find("button")
      .should("have.text", "Reload");
  });

  it("shows nothing once the check finds this build is the deployed one", () => {
    cy.intercept("GET", "/version.json", {
      body: { sha: build },
      // Long enough that the "checking" state is observable.
      delay: 200,
    });
    mountNotice();

    cy.get(notice).should("have.attr", "data-state", "checking");
    cy.get(notice).should("have.attr", "data-state", "current");
    cy.get(notice).should("be.empty");
  });

  it("shows nothing when /version.json is missing", () => {
    cy.intercept("GET", "/version.json", { statusCode: 404, body: "" });
    mountNotice();

    cy.get(notice).should("have.attr", "data-state", "current");
    cy.get(notice).should("be.empty");
  });
});
