import { CreateLocalContent } from "./CreateLocalContent";
import { FetcherWithComponents } from "react-router";

describe("CreateLocalContent component tests", { tags: ["@group2"] }, () => {
  function createMockFetcher(state = "idle", data?: any, alias?: string) {
    const submitStub = cy.stub();
    if (alias) {
      submitStub.as(alias);
    }
    return {
      state,
      formData: undefined,
      data,
      Form: ({ children }: any) => <form>{children}</form>,
      submit: submitStub,
      load: () => {},
    } as unknown as FetcherWithComponents<any>;
  }

  it("shows modal when open", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.contains("New Folder").should("be.visible");
  });

  it("does not show modal when closed", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={false}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.contains("New Folder").should("not.exist");
  });

  it("displays correct default name for folder", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="New Content Input"]').should(
      "have.value",
      "Untitled Folder",
    );
  });

  it("displays correct default name for document", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="singleDoc"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.contains("New Document").should("be.visible");
    cy.get('[data-test="New Content Input"]').should(
      "have.value",
      "Untitled Document",
    );
  });

  it("displays correct default name for question bank", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="select"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.contains("New Question Bank").should("be.visible");
    cy.get('[data-test="New Content Input"]').should(
      "have.value",
      "Untitled Question Bank",
    );
  });

  it("displays correct default name for problem set", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="sequence"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.contains("New Problem Set").should("be.visible");
    cy.get('[data-test="New Content Input"]').should(
      "have.value",
      "Untitled Problem Set",
    );
  });

  it("allows user to change content name", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="New Content Input"]').clear().type("My Custom Folder");
    cy.get('[data-test="New Content Input"]').should(
      "have.value",
      "My Custom Folder",
    );
  });

  it("submits with correct data when create button is clicked", () => {
    const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="New Content Input"]').clear().type("My Folder");
    cy.get('[data-test="Create Content"]').click();

    cy.get("@fetcherSubmit").should("have.been.calledWith", {
      path: "updateContent/createContent",
      name: "My Folder",
      contentType: "folder",
      parentId: "parent-123",
    });
  });

  it("submits with correct data when Enter key is pressed", () => {
    const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="singleDoc"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="New Content Input"]')
      .clear()
      .type("My Document{enter}");

    cy.get("@fetcherSubmit").should("have.been.calledWith", {
      path: "updateContent/createContent",
      name: "My Document",
      contentType: "singleDoc",
      parentId: "parent-123",
    });
  });

  it("closes modal when create button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Create Content"]').click();

    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("closes modal when cancel button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Cancel Button"]').click();

    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("submits to curation path when inCurationLibrary is true", () => {
    const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
        inCurationLibrary={true}
      />,
    );

    cy.get('[data-test="New Content Input"]').clear().type("Library Folder");
    cy.get('[data-test="Create Content"]').click();

    cy.get("@fetcherSubmit").should("have.been.calledWith", {
      path: "curate/createCurationFolder",
      name: "Library Folder",
      contentType: "folder",
      parentId: "parent-123",
    });
  });

  it("handles null parentId", () => {
    const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId={null}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Create Content"]').click();

    cy.get("@fetcherSubmit").should("have.been.calledWith", {
      path: "updateContent/createContent",
      name: "Untitled Folder",
      contentType: "folder",
      parentId: null,
    });
  });

  it("resets to default name when reopened with different content type", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="New Content Input"]').should(
      "have.value",
      "Untitled Folder",
    );

    // Remount with different content type
    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="singleDoc"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="New Content Input"]').should(
      "have.value",
      "Untitled Document",
    );
  });

  it("selects input text on focus", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="New Content Input"]').focus();
    cy.get('[data-test="New Content Input"]').type("Test");
    // If text was selected, typing should replace it
    cy.get('[data-test="New Content Input"]').should("have.value", "Test");
  });

  it("displays error message when content creation fails", () => {
    const mockFetcher = createMockFetcher("idle", {
      errorCreatingContent: "Failed to create content",
    });
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Failed to create content").should("be.visible");
  });

  it("disables input when there is an error", () => {
    const mockFetcher = createMockFetcher("idle", {
      errorCreatingContent: "Failed to create content",
    });
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="New Content Input"]').should("be.disabled");
  });

  it("disables create button when there is an error", () => {
    const mockFetcher = createMockFetcher("idle", {
      errorCreatingContent: "Failed to create content",
    });
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Create Content"]').should("be.disabled");
  });

  it("handles successful content creation", () => {
    const mockFetcher = createMockFetcher("idle", {
      contentCreated: true,
    });
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <CreateLocalContent
        isOpen={true}
        onClose={onCloseSpy}
        contentType="folder"
        parentId="parent-123"
        fetcher={mockFetcher}
      />,
    );

    // Modal should close when content is created
    cy.get("@onClose").should("have.been.called");
  });

  describe("Accessibility tests", () => {
    it("should be accessible with folder type", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateLocalContent
          isOpen={true}
          onClose={onCloseSpy}
          contentType="folder"
          parentId="parent-123"
          fetcher={mockFetcher}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });

    it("should be accessible with document type", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateLocalContent
          isOpen={true}
          onClose={onCloseSpy}
          contentType="singleDoc"
          parentId="parent-123"
          fetcher={mockFetcher}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });

    it("should be accessible with error message", () => {
      const mockFetcher = createMockFetcher("idle", {
        errorCreatingContent: "Failed to create content",
      });
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateLocalContent
          isOpen={true}
          onClose={onCloseSpy}
          contentType="folder"
          parentId="parent-123"
          fetcher={mockFetcher}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });

    it("should be accessible in curation library mode", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateLocalContent
          isOpen={true}
          onClose={onCloseSpy}
          contentType="folder"
          parentId="parent-123"
          fetcher={mockFetcher}
          inCurationLibrary={true}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });
  });
});
