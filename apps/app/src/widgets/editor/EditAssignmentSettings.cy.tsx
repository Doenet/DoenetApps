import { EditAssignmentSettings } from "./EditAssignmentSettings";
import { FetcherWithComponents } from "react-router";

describe("EditAssignmentSettings Component", { tags: ["@group3"] }, () => {
  function createMockFetcher() {
    return {
      state: "idle",
      formData: undefined,
      data: undefined,
      Form: ({ children }: any) => <form>{children}</form>,
      submit: cy.stub(),
      load: () => {},
    } as unknown as FetcherWithComponents<any>;
  }

  const getDefaultProps = () => ({
    contentId: "test-content-123",
    maxAttempts: 3,
    individualizeByStudent: false,
    mode: "formative" as const,
    includeMode: true,
    isAssigned: false,
    maxAttemptsFetcher: createMockFetcher(),
    variantFetcher: createMockFetcher(),
    modeFetcher: createMockFetcher(),
  });

  it("renders correctly and is accessible", () => {
    cy.mount(<EditAssignmentSettings {...getDefaultProps()} />);

    // Verify the component renders with expected content
    cy.contains("Allow unlimited attempts").should("be.visible");
    cy.contains("Maximum number of attempts allowed").should("be.visible");
    cy.contains(
      "Assign the same variant of this activity to all students",
    ).should("be.visible");
    cy.contains("Assignment mode").should("be.visible");

    // Check accessibility
    cy.checkAccessibility("body");
  });

  it("is accessible when mode is summative", () => {
    cy.mount(
      <EditAssignmentSettings {...getDefaultProps()} mode="summative" />,
    );

    cy.contains("Assignment mode").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("is accessible when assignment is already assigned", () => {
    cy.mount(
      <EditAssignmentSettings {...getDefaultProps()} isAssigned={true} />,
    );

    // When assigned, certain controls should be disabled
    cy.contains("Assignment mode").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("is accessible when includeMode is false", () => {
    cy.mount(
      <EditAssignmentSettings {...getDefaultProps()} includeMode={false} />,
    );

    // Mode selection should not be present
    cy.contains("Assignment mode").should("not.exist");
    cy.contains("Allow unlimited attempts").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible with unlimited attempts enabled", () => {
    cy.mount(<EditAssignmentSettings {...getDefaultProps()} maxAttempts={0} />);

    cy.contains("Allow unlimited attempts").should("be.visible");
    cy.checkAccessibility("body");
  });
});
