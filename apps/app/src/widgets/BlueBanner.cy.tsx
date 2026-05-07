import { BlueBanner } from "./BlueBanner";
import { Text } from "@chakra-ui/react";

describe("BlueBanner Component", { tags: ["@group3"] }, () => {
  it("renders children and is accessible", () => {
    cy.mount(
      <BlueBanner>
        <Text>Banner content</Text>
      </BlueBanner>,
    );

    cy.contains("Banner content").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("applies header height to viewer container", () => {
    cy.mount(
      <BlueBanner headerHeight="80px">
        <Text>Header height content</Text>
      </BlueBanner>,
    );

    cy.window().then((win) => {
      const expectedMinHeight = `${win.innerHeight - 80}px`;
      cy.get("#viewer-container").should(
        "have.css",
        "min-height",
        expectedMinHeight,
      );
    });

    cy.checkAccessibility("body");
  });
});
