import { AlertQueue, Alert } from "./AlertQueue";

describe("AlertQueue Component", { tags: ["@group3"] }, () => {
  const alerts: Alert[] = [
    {
      id: "info-1",
      type: "info",
      title: "Info title",
      description: "Info description",
    },
    {
      id: "success-1",
      type: "success",
      title: "Success title",
      description: "Success description",
    },
  ];

  it("renders alerts and is accessible", () => {
    cy.mount(<AlertQueue alerts={alerts} />);

    cy.contains("Info title").should("be.visible");
    cy.contains("Info description").should("be.visible");
    cy.contains("Success title").should("be.visible");
    cy.contains("Success description").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible with no alerts", () => {
    cy.mount(<AlertQueue alerts={[]} />);

    cy.checkAccessibility("body");
  });

  it("renders different alert types", () => {
    const mixedAlerts: Alert[] = [
      {
        id: "warning-1",
        type: "warning",
        title: "Warning title",
        description: "Warning description",
      },
      {
        id: "error-1",
        type: "error",
        title: "Error title",
        description: "Error description",
      },
      {
        id: "loading-1",
        type: "loading",
        title: "Loading title",
        description: "Loading description",
      },
    ];

    cy.mount(<AlertQueue alerts={mixedAlerts} />);

    cy.contains("Warning title").should("be.visible");
    cy.contains("Error title").should("be.visible");
    cy.contains("Loading title").should("be.visible");

    cy.checkAccessibility("body");
  });
});
