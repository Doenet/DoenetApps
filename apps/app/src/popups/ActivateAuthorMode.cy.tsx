import { ActivateAuthorMode } from "./ActivateAuthorMode";
import { FetcherWithComponents } from "react-router";
import { UserInfoWithEmail } from "../types";

describe("ActivateAuthorMode component tests", { tags: ["@group2"] }, () => {
  const mockUser: UserInfoWithEmail = {
    userId: "12345678-1111-2222-3333-123456789999",
    firstNames: "John",
    lastNames: "Doe",
    email: "john@example.com",
    isAuthor: false,
  };

  function createMockFetcher() {
    return {
      state: "idle",
      formData: undefined,
      data: undefined,
      Form: ({ children }: any) => <form>{children}</form>,
      submit: cy.stub().as("fetcherSubmit"),
      load: () => {},
    } as unknown as FetcherWithComponents<any>;
  }

  it("shows modal when open", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Turn on author mode?").should("be.visible");
    cy.contains("You are about to edit the source code").should("be.visible");
  });

  it("does not show modal when closed", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={false}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Turn on author mode?").should("not.exist");
  });

  it("shows edit prompt for edit action with Unassigned status", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("You are about to edit the source code").should("be.visible");
  });

  it("shows view prompt for edit action with assigned status", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Open"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("You are about to view the source code").should("be.visible");
  });

  it("shows create doc prompt for create doc action", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="create doc"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Writing document source code requires author mode").should(
      "be.visible",
    );
  });

  it("displays author mode information", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains(
      "Author mode will make the source code view be the default for documents",
    ).should("be.visible");
    cy.contains(
      "You can turn author mode on and off using the account menu",
    ).should("be.visible");
  });

  it("calls fetcher submit when Yes button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("button", "Yes").click();
    cy.get("@fetcherSubmit").should("have.been.calledOnce");
  });

  it("calls proceedCallback and onClose when Yes is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("button", "Yes").click();
    cy.get("@proceedCallback").should("have.been.calledOnce");
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("closes modal when Cancel button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Cancel Button"]').click();
    cy.get("@onClose").should("have.been.calledOnce");
    cy.get("@proceedCallback").should("not.have.been.called");
  });

  it("shows No button when allowNo is true", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        allowNo={true}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("button", "No, edit the source code anyway").should("exist");
  });

  it("does not show No button when allowNo is false", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        allowNo={false}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("button", "No, edit the source code anyway").should(
      "not.exist",
    );
  });

  it("calls proceedCallback and onClose when No button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        allowNo={true}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("button", "No, edit the source code anyway").click();
    cy.get("@proceedCallback").should("have.been.calledOnce");
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("uses correct verb in No button based on assignment status", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Open"
        user={mockUser}
        proceedCallback={proceedCallbackSpy}
        allowNo={true}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("button", "No, view the source code anyway").should("exist");
  });

  it("submits correct data when author is not yet activated", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    const nonAuthorUser = { ...mockUser, isAuthor: false };

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={nonAuthorUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("button", "Yes").click();
    cy.get("@fetcherSubmit").should(
      "have.been.calledWith",
      Cypress.sinon.match({
        path: "user/setIsAuthor",
        isAuthor: true,
      }),
    );
  });

  it("submits correct data when author is already activated", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const proceedCallbackSpy = cy.spy().as("proceedCallback");

    const authorUser = { ...mockUser, isAuthor: true };

    cy.mount(
      <ActivateAuthorMode
        isOpen={true}
        onClose={onCloseSpy}
        desiredAction="edit"
        assignmentStatus="Unassigned"
        user={authorUser}
        proceedCallback={proceedCallbackSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("button", "Yes").click();
    cy.get("@fetcherSubmit").should(
      "have.been.calledWith",
      Cypress.sinon.match({
        path: "user/setIsAuthor",
        isAuthor: false,
      }),
    );
  });

  describe("accessibility tests", () => {
    it("is accessible with edit action", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");
      const proceedCallbackSpy = cy.spy().as("proceedCallback");

      cy.mount(
        <ActivateAuthorMode
          isOpen={true}
          onClose={onCloseSpy}
          desiredAction="edit"
          assignmentStatus="Unassigned"
          user={mockUser}
          proceedCallback={proceedCallbackSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.get("[role='dialog']").should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible with create doc action", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");
      const proceedCallbackSpy = cy.spy().as("proceedCallback");

      cy.mount(
        <ActivateAuthorMode
          isOpen={true}
          onClose={onCloseSpy}
          desiredAction="create doc"
          user={mockUser}
          proceedCallback={proceedCallbackSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.get("[role='dialog']").should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible with allowNo option", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");
      const proceedCallbackSpy = cy.spy().as("proceedCallback");

      cy.mount(
        <ActivateAuthorMode
          isOpen={true}
          onClose={onCloseSpy}
          desiredAction="edit"
          assignmentStatus="Unassigned"
          user={mockUser}
          proceedCallback={proceedCallbackSpy}
          allowNo={true}
          fetcher={mockFetcher}
        />,
      );

      cy.get("[role='dialog']").should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });
  });
});
