import { ErrorContent } from "./ErrorPage";

describe("ErrorPage component tests", { tags: ["@group1"] }, () => {
  function mountErrorContent(error: unknown) {
    const navigateHomeSpy = cy.spy().as("navigateHome");
    const navigateBackSpy = cy.spy().as("navigateBack");
    cy.mount(
      <ErrorContent
        error={error}
        onNavigateHome={navigateHomeSpy}
        onNavigateBack={navigateBackSpy}
      />,
    );
  }

  it("shows access error heading for 404 response", () => {
    mountErrorContent({ response: { status: 404, data: "Not Found" } });
    cy.get("[data-test='Error Heading']").should(
      "contain.text",
      "This content isn't available",
    );
  });

  it("shows access error heading for 403 response", () => {
    mountErrorContent({ response: { status: 403, data: "Forbidden" } });
    cy.get("[data-test='Error Heading']").should(
      "contain.text",
      "This content isn't available",
    );
  });

  it("shows access error heading when there is no response object", () => {
    mountErrorContent({ message: "Network Error" });
    cy.get("[data-test='Error Heading']").should(
      "contain.text",
      "This content isn't available",
    );
  });

  it("shows helpful next steps for access errors", () => {
    mountErrorContent({ response: { status: 404, data: "Not Found" } });
    cy.contains("Contact the author and ask them to make it publicly").should(
      "be.visible",
    );
    cy.contains("signed in to the correct account").should("be.visible");
    cy.contains("Double-check the link").should("be.visible");
  });

  it("shows Go to Homepage and Go Back buttons for access errors", () => {
    mountErrorContent({ response: { status: 404, data: "Not Found" } });
    cy.contains("button", "Go to Homepage").should("be.visible");
    cy.contains("button", "Go Back").should("be.visible");
  });

  it("calls onNavigateHome when Go to Homepage is clicked", () => {
    mountErrorContent({ response: { status: 404, data: "Not Found" } });
    cy.contains("button", "Go to Homepage").click();
    cy.get("@navigateHome").should("have.been.calledOnce");
  });

  it("calls onNavigateBack when Go Back is clicked", () => {
    mountErrorContent({ response: { status: 404, data: "Not Found" } });
    cy.contains("button", "Go Back").click();
    cy.get("@navigateBack").should("have.been.calledOnce");
  });

  it("shows generic error heading for 500 response", () => {
    mountErrorContent({
      response: { status: 500, data: "Internal Server Error" },
    });
    cy.get("[data-test='Error Heading']").should(
      "contain.text",
      "Something went wrong",
    );
  });

  it("shows Go to Homepage button for generic errors", () => {
    mountErrorContent({
      response: { status: 500, data: "Internal Server Error" },
    });
    cy.contains("button", "Go to Homepage").should("be.visible");
  });

  it("does not show Go Back button for generic errors", () => {
    mountErrorContent({
      response: { status: 500, data: "Internal Server Error" },
    });
    cy.contains("button", "Go Back").should("not.exist");
  });

  it("does not show technical jargon for 404", () => {
    mountErrorContent({
      response: { status: 404, data: "Not Found" },
      message: "Request failed with status code 404",
    });
    cy.contains("Request failed with status code 404").should("not.exist");
    cy.contains("status code").should("not.exist");
  });
});
