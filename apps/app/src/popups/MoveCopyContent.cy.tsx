import { MoveCopyContent } from "./MoveCopyContent";
import { FetcherWithComponents } from "react-router";

describe("MoveCopyContent component tests", { tags: ["@group2"] }, () => {
  const contentName = "A problem set";
  const contentType = "sequence";
  const contentId = "abc";

  const contentList1 = [
    {
      canOpen: true,
      contentId,
      isAssignment: false,
      name: contentName,
      type: contentType,
    },
    {
      canOpen: true,
      contentId: "def",
      isAssignment: false,
      name: "another problem set",
      type: "sequence",
    },
    {
      canOpen: false,
      contentId: "def2",
      isAssignment: true,
      name: "another problem set - assigned",
      type: "sequence",
    },
    {
      canOpen: true,
      contentId: "hij",
      isAssignment: false,
      name: "Folder 1",
      type: "folder",
    },
  ];

  const mockFetcher = {
    state: "idle",
    formData: undefined,
    data: undefined,
    Form: ({ children }: any) => <form>{children}</form>,
    submit: () => {},
    load: () => {},
  } as unknown as FetcherWithComponents<any>;

  it("cancel and close buttons calls onClose", () => {
    cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
      parent: null,
      contents: contentList1,
    }).as("getData");

    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");
    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcher}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
          },
        ]}
        userId={"abc123"}
        currentParentId={null}
        allowedParentTypes={["folder"]}
        action="Move"
      />,
    );

    cy.wait("@getData")
      .its("request.url")
      .should("include", "?allowedParentTypes=folder");

    cy.get("@onClose").should("not.be.called");
    cy.get("[data-test='Cancel Button']").click();
    cy.get("@onClose").should("have.callCount", 1);
    cy.get("[aria-label=Close]").click();
    cy.get("@onClose").should("have.callCount", 2);
  });

  it("link to own content is disabled", () => {
    cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
      parent: null,
      contents: contentList1,
    }).as("getData");

    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");
    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcher}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
          },
        ]}
        userId={"abc123"}
        currentParentId={null}
        allowedParentTypes={["folder"]}
        action="Move"
      />,
    );

    cy.get('[data-test="Select Item Option"]')
      .eq(0)
      .should("have.text", contentName)
      .should("be.disabled");
  });

  it("items with canOpen=false are disabled", () => {
    cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
      parent: null,
      contents: contentList1,
    }).as("getData");

    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");
    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcher}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
          },
        ]}
        userId={"abc123"}
        currentParentId={null}
        allowedParentTypes={["folder"]}
        action="Move"
      />,
    );

    cy.get('[data-test="Select Item Option"]')
      .eq(1)
      .should("have.text", "another problem set")
      .should("not.be.disabled");

    cy.get('[data-test="Select Item Option"]')
      .eq(2)
      .should("have.text", "another problem set - assigned")
      .should("be.disabled");

    cy.get('[data-test="Select Item Option"]')
      .eq(3)
      .should("have.text", "Folder 1")
      .should("not.be.disabled");
  });

  it("Selecting an item navigates to that item", () => {
    const contentList2 = [
      {
        canOpen: true,
        contentId: "hij",
        isAssignment: false,
        name: "Folder 1",
        type: "folder",
      },
    ];

    cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
      parent: null,
      contents: contentList1,
    }).as("getData");

    cy.intercept("/api/copyMove/getMoveCopyContentData/hij*", {
      parent: {
        id: "hij",
        name: "Folder 1",
        type: "folder",
        isPublic: false,
        sharedWith: [],
        parent: null,
      },
      contents: contentList2,
    }).as("getFolder1Data");

    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");
    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcher}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
          },
        ]}
        userId={"abc123"}
        currentParentId={null}
        allowedParentTypes={["folder"]}
        action="Move"
      />,
    );

    cy.wait("@getData");
    cy.get('[data-test="Select Item Option"]').eq(3).click();
    cy.wait("@getFolder1Data");

    cy.get('[data-test="Current destination"]').should("have.text", "Folder 1");
  });

  it("Execute button is disabled when same null parent is selected", () => {
    cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
      parent: null,
      contents: contentList1,
    }).as("getData");

    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");
    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcher}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
          },
        ]}
        userId={"abc123"}
        currentParentId={null}
        allowedParentTypes={["folder"]}
        action="Move"
      />,
    );

    cy.wait("@getData");
    // When currentParentId is null and we haven't navigated, parent is also null
    // so actionIsDisabled = (null === null && null === null) = true
    cy.get('[data-test="Execute MoveCopy Button"]').should("be.disabled");
  });

  it("Execute button is disabled when currently in same parent folder", () => {
    const folderContents = [
      {
        canOpen: true,
        contentId: "xyz",
        isAssignment: false,
        name: "Another item",
        type: "folder",
      },
    ];

    cy.intercept("/api/copyMove/getMoveCopyContentData/hij*", {
      parent: {
        id: "hij",
        name: "Folder 1",
        type: "folder",
        isPublic: false,
        sharedWith: [],
        parent: null,
      },
      contents: folderContents,
    }).as("getData");

    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");
    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcher}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
          },
        ]}
        userId={"abc123"}
        currentParentId="hij"
        allowedParentTypes={["folder"]}
        action="Move"
      />,
    );

    cy.wait("@getData");
    // When currentParentId is "hij" and parent.id is "hij", they match
    // so actionIsDisabled = (parent.id === parentId) = true
    cy.get('[data-test="Execute MoveCopy Button"]').should("be.disabled");
  });

  it("Execute button is enabled when different parent is selected", () => {
    const folderContent = [
      {
        canOpen: true,
        contentId: "hij",
        isAssignment: false,
        name: "Folder 1",
        type: "folder",
      },
    ];

    cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
      parent: null,
      contents: contentList1,
    }).as("getData");

    cy.intercept("/api/copyMove/getMoveCopyContentData/hij*", {
      parent: {
        id: "hij",
        name: "Folder 1",
        type: "folder",
        isPublic: false,
        sharedWith: [],
        parent: null,
      },
      contents: folderContent,
    }).as("getFolder1Data");

    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");
    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcher}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
          },
        ]}
        userId={"abc123"}
        currentParentId={null}
        allowedParentTypes={["folder"]}
        action="Move"
      />,
    );

    cy.wait("@getData");
    cy.get('[data-test="Select Item Option"]').eq(3).click();
    cy.wait("@getFolder1Data");
    cy.get('[data-test="Execute MoveCopy Button"]').should("not.be.disabled");
  });

  it("Back button navigates to parent folder", () => {
    const folderContent = [
      {
        canOpen: true,
        contentId: "nested",
        isAssignment: false,
        name: "Nested Folder",
        type: "folder",
      },
    ];

    const nestedFolderContent: any[] = [];

    cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
      parent: null,
      contents: contentList1,
    }).as("getData");

    cy.intercept("/api/copyMove/getMoveCopyContentData/hij*", {
      parent: {
        id: "hij",
        name: "Folder 1",
        type: "folder",
        isPublic: false,
        sharedWith: [],
        parent: null,
      },
      contents: folderContent,
    }).as("getFolder1Data");

    cy.intercept("/api/copyMove/getMoveCopyContentData/nested*", {
      parent: {
        id: "nested",
        name: "Nested Folder",
        type: "folder",
        isPublic: false,
        sharedWith: [],
        parent: {
          id: "hij",
          type: "folder",
        },
      },
      contents: nestedFolderContent,
    }).as("getNestedFolderData");

    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");
    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcher}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
          },
        ]}
        userId={"abc123"}
        currentParentId={null}
        allowedParentTypes={["folder"]}
        action="Move"
      />,
    );

    cy.wait("@getData");
    cy.get('[data-test="Select Item Option"]').eq(3).click();
    cy.wait("@getFolder1Data");
    cy.get('[data-test="Current destination"]').should("have.text", "Folder 1");

    cy.get('[data-test="Select Item Option"]').eq(0).click();
    cy.wait("@getNestedFolderData");
    cy.get('[data-test="Current destination"]').should(
      "have.text",
      "Nested Folder",
    );

    cy.get('[data-test="Back Arrow"]').click();
    cy.get('[data-test="Current destination"]').should("have.text", "Folder 1");
  });

  it("Go to folder uses correct userId even when content is shared with others", () => {
    // This test checks that the userId prop is not corrupted by the shareAlert computation
    // when source content is shared with users and the destination folder also has shared users.
    const sharedUserId = "sharedUser123";

    const mockFetcherSuccess = {
      state: "idle",
      formData: undefined,
      data: { status: 200 },
      Form: ({ children }: any) => <form>{children}</form>,
      submit: () => {},
      load: () => {},
    } as unknown as FetcherWithComponents<any>;

    // The modal opens showing the shared folder as the destination
    // (simulating the user having navigated to this folder before the move completed)
    cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
      parent: {
        id: "hij",
        name: "Shared Folder",
        type: "folder",
        isPublic: false,
        sharedWith: [{ userId: sharedUserId }],
        parent: null,
      },
      contents: [],
    }).as("getFolderData");

    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");
    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcherSuccess}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
            isPublic: false,
            isShared: true,
            sharedWith: [
              {
                userId: sharedUserId,
                firstNames: "Shared",
                lastNames: "User",
                email: "shared@example.com",
              },
            ],
          },
        ]}
        userId={"abc123"}
        currentParentId={null}
        allowedParentTypes={["folder"]}
        action="Move"
      />,
    );

    // Wait for the API to return the shared folder data
    cy.wait("@getFolderData");

    // Verify the modal is in the success state showing the destination folder
    cy.get('[data-test="MoveCopy Body"]').should(
      "contain.text",
      "Shared Folder",
    );

    // Click "Go to folder" and verify it uses the correct userId from the prop (abc123),
    // not the shared user's ID (sharedUser123)
    cy.get('[data-test="Go to Destination"]').click();

    cy.get("@onNavigate").should(
      "have.been.calledWith",
      `/activities/abc123/hij`,
    );
  });

  it("different actions show correct heading text", () => {
    cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
      parent: null,
      contents: contentList1,
    }).as("getData");

    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    // Test Move action
    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcher}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
          },
        ]}
        userId={"abc123"}
        currentParentId={null}
        allowedParentTypes={["folder"]}
        action="Move"
      />,
    );

    cy.wait("@getData");
    cy.get('[data-test="MoveCopy Heading 1"]').should("contain", "Move");

    cy.get('[data-test="Cancel Button"]').click();

    // Test Copy action
    cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
      parent: null,
      contents: contentList1,
    }).as("getData2");

    cy.mount(
      <MoveCopyContent
        isOpen={true}
        onClose={onCloseSpy}
        onNavigate={onNavigateSpy}
        fetcher={mockFetcher}
        sourceContent={[
          {
            contentId,
            name: contentName,
            type: contentType,
          },
        ]}
        userId={"abc123"}
        currentParentId={null}
        allowedParentTypes={["folder"]}
        action="Copy"
      />,
    );

    cy.wait("@getData2");
    cy.get('[data-test="MoveCopy Heading 1"]').should("contain", "Copy");
  });

  describe("accessibility tests", () => {
    it("is accessible with initial state (Move action)", () => {
      cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
        parent: null,
        contents: contentList1,
      }).as("getData");

      const onCloseSpy = cy.spy().as("onClose");
      const onNavigateSpy = cy.spy().as("onNavigate");
      cy.mount(
        <MoveCopyContent
          isOpen={true}
          onClose={onCloseSpy}
          onNavigate={onNavigateSpy}
          fetcher={mockFetcher}
          sourceContent={[
            {
              contentId,
              name: contentName,
              type: contentType,
            },
          ]}
          userId={"abc123"}
          currentParentId={null}
          allowedParentTypes={["folder"]}
          action="Move"
        />,
      );

      cy.wait("@getData");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible with Copy action", () => {
      cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
        parent: null,
        contents: contentList1,
      }).as("getData");

      const onCloseSpy = cy.spy().as("onClose");
      const onNavigateSpy = cy.spy().as("onNavigate");
      cy.mount(
        <MoveCopyContent
          isOpen={true}
          onClose={onCloseSpy}
          onNavigate={onNavigateSpy}
          fetcher={mockFetcher}
          sourceContent={[
            {
              contentId,
              name: contentName,
              type: contentType,
            },
          ]}
          userId={"abc123"}
          currentParentId={null}
          allowedParentTypes={["folder"]}
          action="Copy"
        />,
      );

      cy.wait("@getData");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible when navigated to a folder", () => {
      const folderContent = [
        {
          canOpen: true,
          contentId: "hij",
          isAssignment: false,
          name: "Folder 1",
          type: "folder",
        },
      ];

      cy.intercept("/api/copyMove/getMoveCopyContentData/*", {
        parent: null,
        contents: contentList1,
      }).as("getData");

      cy.intercept("/api/copyMove/getMoveCopyContentData/hij*", {
        parent: {
          id: "hij",
          name: "Folder 1",
          type: "folder",
          isPublic: false,
          sharedWith: [],
          parent: null,
        },
        contents: folderContent,
      }).as("getFolder1Data");

      const onCloseSpy = cy.spy().as("onClose");
      const onNavigateSpy = cy.spy().as("onNavigate");
      cy.mount(
        <MoveCopyContent
          isOpen={true}
          onClose={onCloseSpy}
          onNavigate={onNavigateSpy}
          fetcher={mockFetcher}
          sourceContent={[
            {
              contentId,
              name: contentName,
              type: contentType,
            },
          ]}
          userId={"abc123"}
          currentParentId={null}
          allowedParentTypes={["folder"]}
          action="Move"
        />,
      );

      cy.wait("@getData");
      cy.get('[data-test="Select Item Option"]').eq(3).click();
      cy.wait("@getFolder1Data");
      cy.wait(100);
      cy.checkAccessibility("body");
    });
  });
});
