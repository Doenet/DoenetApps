import { ThemeSelector } from "./ThemeSelector";

describe("ThemeSelector", { tags: ["@group4"] }, () => {
  it("renders the three options inline with the current one selected", () => {
    cy.mount(<ThemeSelector value="system" onChange={cy.stub()} />);

    cy.contains("System").should("be.visible");
    cy.contains("Light").should("be.visible");
    cy.contains("Dark").should("be.visible");

    cy.get('input[value="system"]').should("be.checked");
    cy.get('input[value="light"]').should("not.be.checked");
    cy.get('input[value="dark"]').should("not.be.checked");

    cy.checkAccessibility("body");
  });

  it("reports the chosen setting when an option is selected", () => {
    cy.mount(
      <ThemeSelector value="system" onChange={cy.stub().as("onChange")} />,
    );

    cy.get('[data-test="Theme Dark"]').click();
    cy.get("@onChange").should("have.been.calledWith", "dark");
  });
});
