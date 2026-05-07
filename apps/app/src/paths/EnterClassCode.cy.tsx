import { EnterClassCode } from "./EnterClassCode";

describe("EnterClassCode", { tags: ["@group2"] }, () => {
  it("renders the form with empty class code input", () => {
    cy.mount(<EnterClassCode invalidCode={undefined} />);

    cy.contains("Enter class code:").should("be.visible");
    cy.get('input[name="classCode"]').should("have.value", "");
    cy.contains("Submit code").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders the form with an initial class code value", () => {
    cy.mount(<EnterClassCode invalidCode="ABC123" />);

    cy.get('input[name="classCode"]').should("have.value", "ABC123");
    cy.checkAccessibility("body");
  });

  it("updates the input value when user types", () => {
    cy.mount(<EnterClassCode invalidCode="ABC" />);

    cy.get('input[name="classCode"]').type("123");
    cy.get('input[name="classCode"]').should("have.value", "ABC123");

    cy.checkAccessibility("body");
  });

  it("displays error message when invalid code is provided", () => {
    cy.mount(<EnterClassCode invalidCode="INVALID" />);

    cy.contains("Class code INVALID not found").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("shows form control in invalid state when haveInvalidClassCode is true", () => {
    cy.mount(<EnterClassCode invalidCode="BADCODE" />);

    cy.get('input[name="classCode"]').should("have.attr", "aria-invalid");
    cy.checkAccessibility("body");
  });

  it("required attribute is set on form control", () => {
    cy.mount(<EnterClassCode invalidCode={undefined} />);

    cy.get("input[required]").should("exist");
    cy.checkAccessibility("body");
  });
});
