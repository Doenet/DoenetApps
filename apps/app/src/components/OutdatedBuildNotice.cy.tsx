import { ChakraProvider } from "@chakra-ui/react";
import { mount } from "cypress/react";

import { OutdatedBuildNotice } from "./OutdatedBuildNotice";
import { theme } from "../theme";

describe("OutdatedBuildNotice", { tags: ["@group2"] }, () => {
  const build = "1111111111111111111111111111111111111111";

  function mountNotice() {
    mount(
      <ChakraProvider theme={theme}>
        <div data-test="Page">
          <OutdatedBuildNotice build={build} />
        </div>
      </ChakraProvider>,
    );
  }

  it("suggests a reload once a different build is deployed", () => {
    cy.intercept("GET", "/version.json", {
      body: { sha: "2".repeat(40) },
    }).as("version");
    mountNotice();
    cy.wait("@version");

    cy.get('[data-test="Outdated Build Notice"]')
      .should(
        "contain.text",
        "Doenet has been updated since this page was opened",
      )
      .find("button")
      .should("have.text", "Reload");
  });

  it("shows nothing while this build is the deployed one", () => {
    cy.intercept("GET", "/version.json", { body: { sha: build } }).as(
      "version",
    );
    mountNotice();
    cy.wait("@version");

    cy.get('[data-test="Page"]').should("be.empty");
  });
});
