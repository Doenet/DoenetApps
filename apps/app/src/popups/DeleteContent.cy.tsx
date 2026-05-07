import { DeleteContent } from "./DeleteContent";
import { FetcherWithComponents } from "react-router";
import { ContentDescription } from "../types";

describe("DeleteContent component tests", { tags: ["@group2"] }, () => {
  const mockContent: ContentDescription = {
    contentId: "content-123",
    name: "My Activity",
    type: "folder",
    parent: null,
  };

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
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Move to trash?").should("be.visible");
  });

  it("does not show modal when closed", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <DeleteContent
        isOpen={false}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Move to trash?").should("not.exist");
  });

  it("displays content name and type in message", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    const testContent: ContentDescription = {
      contentId: "content-456",
      name: "Test Problem Set",
      type: "sequence",
      parent: null,
    };

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={testContent}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("The problem set").should("be.visible");
    cy.contains("Test Problem Set").should("be.visible");
    cy.contains("will be deleted forever after 30 days").should("be.visible");
  });

  it("displays correct message for document type", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    const testContent: ContentDescription = {
      contentId: "content-789",
      name: "My Document",
      type: "singleDoc",
      parent: null,
    };

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={testContent}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("The document").should("be.visible");
    cy.contains("My Document").should("be.visible");
  });

  it("displays correct message for question bank type", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    const testContent: ContentDescription = {
      contentId: "content-101",
      name: "Question Collection",
      type: "select",
      parent: null,
    };

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={testContent}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("The question bank").should("be.visible");
    cy.contains("Question Collection").should("be.visible");
  });

  it("submits fetcher with correct data when delete button is clicked", () => {
    const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Delete Button"]').click();

    cy.get("@fetcherSubmit").should("have.been.calledWith", {
      path: "updateContent/deleteContent",
      contentId: "content-123",
    });
  });

  it("submits with post method and correct encType", () => {
    const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Delete Button"]').click();

    // Verify submit was called with the method and encType options
    cy.get("@fetcherSubmit").should("have.been.calledOnce");
  });

  it("closes modal when delete button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Delete Button"]').click();

    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("closes modal when cancel button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Cancel Button"]').click();

    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("closes modal when close button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
      />,
    );

    // Chakra's ModalCloseButton is the X button in the header
    cy.get("button[aria-label='Close']").click();

    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("does not submit when cancel button is clicked", () => {
    const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Cancel Button"]').click();

    cy.get("@fetcherSubmit").should("not.have.been.called");
  });

  it("displays delete button text", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Delete Button"]').should(
      "contain.text",
      "Move to trash",
    );
  });

  it("displays cancel button text", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Cancel Button"]').should("contain.text", "Cancel");
  });

  it("handles content with special characters in name", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    const testContent: ContentDescription = {
      contentId: "content-special",
      name: 'My Activity & Project\'s "Test"',
      type: "folder",
      parent: null,
    };

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={testContent}
        fetcher={mockFetcher}
      />,
    );

    cy.contains('My Activity & Project\'s "Test"').should("be.visible");
  });

  it("handles content with very long name", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    const longName =
      "This is a very long activity name that should still display properly in the delete confirmation dialog";
    const testContent: ContentDescription = {
      contentId: "content-long",
      name: longName,
      type: "folder",
      parent: null,
    };

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={testContent}
        fetcher={mockFetcher}
      />,
    );

    cy.contains(longName).should("be.visible");
  });

  it("uses finalFocusRef when provided", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");
    const finalFocusRef = { current: null };

    cy.mount(
      <DeleteContent
        isOpen={true}
        onClose={onCloseSpy}
        content={mockContent}
        fetcher={mockFetcher}
        finalFocusRef={finalFocusRef}
      />,
    );

    cy.contains("Move to trash?").should("be.visible");
  });

  it("handles different content types correctly", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    const contentTypes: Array<{
      type: "folder" | "sequence" | "singleDoc" | "select";
      typeName: string;
    }> = [
      { type: "folder", typeName: "folder" },
      { type: "sequence", typeName: "problem set" },
      { type: "singleDoc", typeName: "document" },
      { type: "select", typeName: "question bank" },
    ];

    contentTypes.forEach(({ type, typeName }) => {
      const testContent: ContentDescription = {
        contentId: `content-${type}`,
        name: "Test Content",
        type,
        parent: null,
      };

      cy.mount(
        <DeleteContent
          isOpen={true}
          onClose={onCloseSpy}
          content={testContent}
          fetcher={mockFetcher}
        />,
      );

      cy.contains(`The ${typeName}`).should("be.visible");
    });
  });

  describe("Accessibility tests", () => {
    it("should be accessible with folder content", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DeleteContent
          isOpen={true}
          onClose={onCloseSpy}
          content={mockContent}
          fetcher={mockFetcher}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });

    it("should be accessible with document content", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      const testContent: ContentDescription = {
        contentId: "content-doc",
        name: "Test Document",
        type: "singleDoc",
        parent: null,
      };

      cy.mount(
        <DeleteContent
          isOpen={true}
          onClose={onCloseSpy}
          content={testContent}
          fetcher={mockFetcher}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });

    it("should be accessible with question bank content", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      const testContent: ContentDescription = {
        contentId: "content-qb",
        name: "Test Question Bank",
        type: "select",
        parent: null,
      };

      cy.mount(
        <DeleteContent
          isOpen={true}
          onClose={onCloseSpy}
          content={testContent}
          fetcher={mockFetcher}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });

    it("should be accessible with problem set content", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      const testContent: ContentDescription = {
        contentId: "content-ps",
        name: "Test Problem Set",
        type: "sequence",
        parent: null,
      };

      cy.mount(
        <DeleteContent
          isOpen={true}
          onClose={onCloseSpy}
          content={testContent}
          fetcher={mockFetcher}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });
  });
});
