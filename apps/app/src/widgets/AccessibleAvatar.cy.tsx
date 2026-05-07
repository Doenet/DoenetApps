import { AccessibleAvatar } from "./AccessibleAvatar";

describe("AccessibleAvatar Component", { tags: ["@group3"] }, () => {
  it("renders initials and is accessible", () => {
    cy.mount(<AccessibleAvatar name="Ada Lovelace" />);

    cy.get(".chakra-avatar__initials").should("contain.text", "AL");

    cy.checkAccessibility("body");
  });

  it("uses provided background and picks readable text color", () => {
    cy.mount(<AccessibleAvatar name="Alan Turing" bg="#ffffff" />);

    cy.get(".chakra-avatar")
      .should("have.css", "background-color", "rgb(255, 255, 255)")
      .and("have.css", "color", "rgb(0, 0, 0)");

    cy.checkAccessibility("body");
  });

  it("respects custom text color overrides", () => {
    cy.mount(
      <AccessibleAvatar name="Grace Hopper" bg="#000000" color="#ff00ff" />,
    );

    cy.get(".chakra-avatar")
      .should("have.css", "background-color", "rgb(0, 0, 0)")
      .and("have.css", "color", "rgb(255, 0, 255)");

    cy.checkAccessibility("body");
  });
});
