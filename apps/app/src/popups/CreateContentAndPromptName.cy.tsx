import { CreateContentAndPromptName } from "./CreateContentAndPromptName";
import { FetcherWithComponents, NavigateFunction } from "react-router";
import { UserInfo } from "../types";

describe(
  "CreateContentAndPromptName component tests",
  { tags: ["@group2"] },
  () => {
    const mockUser: UserInfo = {
      userId: "user-123",
      firstNames: "Test",
      lastNames: "User",
    };

    const mockContentIds = ["content-1", "content-2", "content-3"];

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

    function createMockNavigate() {
      return cy.stub().as("navigate") as unknown as NavigateFunction;
    }

    it("shows modal when open", () => {
      const mockCreateFetcher = createMockFetcher();
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.contains("Creating").should("be.visible");
    });

    it("does not show modal when closed", () => {
      const mockCreateFetcher = createMockFetcher();
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={false}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.contains("Creating").should("not.exist");
    });

    it("shows creating state with spinner", () => {
      const mockCreateFetcher = createMockFetcher();
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.contains("Creating...").should("be.visible");
      cy.get('[class*="spinner"]').should("exist");
    });

    it("submits create request when modal opens", () => {
      const mockCreateFetcher = createMockFetcher(
        "idle",
        undefined,
        "createSubmit",
      );
      const mockSaveNameFetcher = createMockFetcher(
        "idle",
        undefined,
        "saveSubmit",
      );
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="folder"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get("@createSubmit").should("have.been.calledOnce");
      cy.get("@createSubmit").should("have.been.calledWith", {
        path: "copyMove/createContentCopyInChildren",
        childSourceContentIds: mockContentIds,
        contentType: "folder",
        parentId: null,
      });
    });

    it("shows finished state after creation", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1", "new-2", "new-3"],
          newContentId: "new-content-123",
          newContentName: "New Problem Set",
        },
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.contains("Create finished").should("be.visible");
      cy.get('[data-test="Created Statement"]').should(
        "contain",
        "Problem set created with 3 items",
      );
    });

    it("shows singular item text when one item", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1"],
          newContentId: "new-content-123",
          newContentName: "New Folder",
        },
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="folder"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Created Statement"]').should(
        "contain",
        "Folder created with 1 item",
      );
    });

    it("displays name input with created name", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1", "new-2"],
          newContentId: "new-content-123",
          newContentName: "My New Activity",
        },
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Created Name"]').should(
        "have.value",
        "My New Activity",
      );
    });

    it("saves name on blur", () => {
      const mockCreateFetcher = createMockFetcher(
        "idle",
        {
          status: 200,
          data: {
            newChildContentIds: ["new-1"],
            newContentId: "new-content-123",
            newContentName: "Original Name",
          },
        },
        "createSubmit",
      );
      const mockSaveNameFetcher = createMockFetcher(
        "idle",
        undefined,
        "saveSubmit",
      );
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Created Name"]').clear().type("Updated Name").blur();

      cy.get("@saveSubmit").should("have.been.calledWith", {
        path: "updateContent/updateContentSettings",
        name: "Updated Name",
        contentId: "new-content-123",
      });
    });

    it("defaults empty name to 'Untitled'", () => {
      const mockCreateFetcher = createMockFetcher(
        "idle",
        {
          status: 200,
          data: {
            newChildContentIds: ["new-1"],
            newContentId: "new-content-123",
            newContentName: "Original Name",
          },
        },
        "createSubmit",
      );
      const mockSaveNameFetcher = createMockFetcher(
        "idle",
        undefined,
        "saveSubmit",
      );
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="folder"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Created Name"]').clear().type("   ").blur();

      cy.get("@saveSubmit").should("have.been.calledWith", {
        path: "updateContent/updateContentSettings",
        name: "Untitled",
        contentId: "new-content-123",
      });
    });

    it("saves name on Enter key", () => {
      const mockCreateFetcher = createMockFetcher(
        "idle",
        {
          status: 200,
          data: {
            newChildContentIds: ["new-1"],
            newContentId: "new-content-123",
            newContentName: "Original Name",
          },
        },
        "createSubmit",
      );
      const mockSaveNameFetcher = createMockFetcher(
        "idle",
        undefined,
        "saveSubmit",
      );
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="folder"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Created Name"]').clear().type("New Name{enter}");

      cy.get("@saveSubmit").should("have.been.calledWith", {
        path: "updateContent/updateContentSettings",
        name: "New Name",
        contentId: "new-content-123",
      });
    });

    it("shows 'Go to folder' button for folder type", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1"],
          newContentId: "new-folder-123",
          newContentName: "My Folder",
        },
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="folder"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Go to Created"]').should("contain", "Go to folder");
    });

    it("shows 'Open problem set' button for sequence type", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1"],
          newContentId: "new-sequence-123",
          newContentName: "My Problem Set",
        },
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Go to Created"]').should(
        "contain",
        "Open problem set",
      );
    });

    it("navigates to folder when button clicked", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1"],
          newContentId: "new-folder-123",
          newContentName: "My Folder",
        },
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="folder"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Go to Created"]').click();

      cy.get("@navigate").should(
        "have.been.calledWith",
        "/activities/user-123/new-folder-123",
      );
      cy.get("@onClose").should("have.been.calledOnce");
    });

    it("navigates to editor when button clicked for sequence", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1"],
          newContentId: "new-sequence-123",
          newContentName: "My Problem Set",
        },
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Go to Created"]').click();

      cy.get("@navigate").should(
        "have.been.calledWith",
        "/compoundEditor/new-sequence-123/edit",
      );
      cy.get("@onClose").should("have.been.calledOnce");
    });

    it("calls onClose when Close button clicked", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1"],
          newContentId: "new-content-123",
          newContentName: "My Content",
        },
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Close Button"]').click();

      cy.get("@onClose").should("have.been.calledOnce");
      cy.get("@navigate").should("not.have.been.called");
    });

    it("disables buttons while creating", () => {
      const mockCreateFetcher = createMockFetcher();
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Go to Created"]').should("be.disabled");
      cy.get('[data-test="Close Button"]').should("be.disabled");
    });

    it("shows error message when creation fails", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 500,
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.contains("An error occurred while creating content").should(
        "be.visible",
      );
    });

    it("shows error message when name save fails", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1"],
          newContentId: "new-content-123",
          newContentName: "My Content",
        },
      });
      const mockSaveNameFetcher = createMockFetcher("idle", {
        status: 500,
      });
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.contains("An error occurred while saving the name").should(
        "be.visible",
      );
    });

    it("shows close button only when finished", () => {
      const mockCreateFetcher = createMockFetcher();
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      // Should not have close button while creating
      cy.get('[aria-label="Close"]').should("not.exist");
    });

    // Accessibility tests
    it("is accessible while creating", () => {
      const mockCreateFetcher = createMockFetcher();
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.contains("Creating").should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible after creation finished", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1", "new-2"],
          newContentId: "new-content-123",
          newContentName: "My Activity",
        },
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="sequence"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.get('[data-test="Created Name"]').should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible with error state", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 500,
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="folder"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.contains("An error occurred").should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible for folder type", () => {
      const mockCreateFetcher = createMockFetcher("idle", {
        status: 200,
        data: {
          newChildContentIds: ["new-1"],
          newContentId: "new-folder-123",
          newContentName: "My Folder",
        },
      });
      const mockSaveNameFetcher = createMockFetcher();
      const mockNavigate = createMockNavigate();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateContentAndPromptName
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={mockContentIds}
          desiredType="folder"
          user={mockUser}
          navigate={mockNavigate}
          createFetcher={mockCreateFetcher}
          saveNameFetcher={mockSaveNameFetcher}
        />,
      );

      cy.contains("Folder created").should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });
  },
);
