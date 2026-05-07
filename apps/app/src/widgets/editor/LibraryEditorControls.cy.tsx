import { LibraryEditorControls } from "./LibraryEditorControls";
import { FetcherWithComponents } from "react-router";
import { LibraryRelations, LibraryComment, UserInfo } from "../../types";

describe("LibraryEditorControls Component", { tags: ["@group3"] }, () => {
  function createMockFetcher(data?: any, submitStub?: any, loadStub?: any) {
    return {
      state: "idle",
      formData: undefined,
      data: data || undefined,
      Form: ({ children }: any) => <form>{children}</form>,
      submit: submitStub || (() => {}),
      load: loadStub || (() => {}),
    } as unknown as FetcherWithComponents<any>;
  }

  const mockUserInfo: UserInfo = {
    userId: "user-123",
    firstNames: "John",
    lastNames: "Doe",
    isAnonymous: false,
  };

  const mockLibraryRelationsUnderReview: LibraryRelations = {
    source: {
      status: "UNDER_REVIEW",
      sourceContentId: "source-123",
      reviewRequestDate: "2024-01-15T10:00:00Z",
      primaryEditor: mockUserInfo,
    },
  };

  const mockLibraryRelationsPublished: LibraryRelations = {
    source: {
      status: "PUBLISHED",
      sourceContentId: "source-456",
      reviewRequestDate: "2024-01-10T10:00:00Z",
      primaryEditor: mockUserInfo,
      iAmPrimaryEditor: true,
    },
  };

  const mockLibraryRelationsWithConversation: LibraryRelations = {
    source: {
      status: "UNDER_REVIEW",
      sourceContentId: "source-789",
      reviewRequestDate: "2024-01-20T10:00:00Z",
      ownerRequested: true,
      primaryEditor: mockUserInfo,
      iAmPrimaryEditor: true,
    },
  };

  const mockLibraryRelationsSourceNotVisible: LibraryRelations = {
    source: {
      status: "UNDER_REVIEW",
      sourceContentId: null,
      reviewRequestDate: "2024-01-15T10:00:00Z",
      primaryEditor: mockUserInfo,
    },
  };

  const mockLibraryComments: LibraryComment[] = [
    {
      user: {
        userId: "user-456",
        firstNames: "Jane",
        lastNames: "Smith",
        isAnonymous: false,
      },
      dateTime: "2024-01-21T10:00:00Z",
      comment: "This activity looks great!",
      isMe: false,
    },
    {
      user: mockUserInfo,
      dateTime: "2024-01-21T11:00:00Z",
      comment: "Thank you for the feedback.",
      isMe: true,
    },
  ];

  function getDefaultProps() {
    return {
      contentId: "content-123",
      contentType: "singleDoc" as const,
      loadFetcher: createMockFetcher({
        libraryRelations: mockLibraryRelationsUnderReview,
        libraryComments: [],
      }),
      submitFetcher: createMockFetcher(),
    };
  }

  it("renders loading state when data is not loaded", () => {
    const defaultProps = getDefaultProps();
    cy.mount(
      <LibraryEditorControls
        {...defaultProps}
        loadFetcher={createMockFetcher()}
      />,
    );

    cy.contains("Loading...").should("be.visible");
  });

  it("renders correctly with UNDER_REVIEW status and is accessible", () => {
    const defaultProps = getDefaultProps();
    cy.mount(<LibraryEditorControls {...defaultProps} />);

    cy.contains("Status:").should("be.visible");
    cy.contains("John Doe").should("be.visible");
    cy.contains("Claim").should("be.visible");
    cy.contains("Publish").should("be.visible");
    cy.contains("Reject").should("be.visible");
    cy.contains("Requested on").should("be.visible");
    cy.contains("Panel only visible to library editors").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("does not show Claim button when user is the primary editor", () => {
    const defaultProps = getDefaultProps();
    const libraryRelationsAsEditor: LibraryRelations = {
      source: {
        status: "UNDER_REVIEW",
        sourceContentId: "source-123",
        reviewRequestDate: "2024-01-15T10:00:00Z",
        primaryEditor: mockUserInfo,
        iAmPrimaryEditor: true,
      },
    };

    cy.mount(
      <LibraryEditorControls
        {...defaultProps}
        loadFetcher={createMockFetcher({
          libraryRelations: libraryRelationsAsEditor,
          libraryComments: [],
        })}
      />,
    );

    cy.contains("button", "Claim").should("not.exist");
    cy.contains("button", "Publish").should("be.visible");
    cy.contains("button", "Reject").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("shows only Unpublish button for PUBLISHED status and is accessible", () => {
    const defaultProps = getDefaultProps();
    cy.mount(
      <LibraryEditorControls
        {...defaultProps}
        loadFetcher={createMockFetcher({
          libraryRelations: mockLibraryRelationsPublished,
          libraryComments: [],
        })}
      />,
    );

    cy.contains("Claim").should("not.exist");
    cy.contains("Publish").should("not.exist");
    cy.contains("Reject").should("not.exist");
    cy.contains("button", "Unpublish").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("handles Claim button click with correct fetcher submission", () => {
    const defaultProps = getDefaultProps();
    const submitStub = cy.stub();
    const submitFetcher = createMockFetcher(undefined, submitStub);
    cy.mount(
      <LibraryEditorControls {...defaultProps} submitFetcher={submitFetcher} />,
    );

    cy.contains("button", "Claim").click();

    cy.wrap(submitStub).should("have.been.calledWith", {
      path: "curate/claimOwnershipOfReview",
      contentId: "content-123",
    });
  });

  it("handles Publish button click with correct fetcher submission", () => {
    const defaultProps = getDefaultProps();
    const submitStub = cy.stub();
    const submitFetcher = createMockFetcher(undefined, submitStub);
    cy.mount(
      <LibraryEditorControls {...defaultProps} submitFetcher={submitFetcher} />,
    );

    cy.contains("button", "Publish").click();

    cy.wrap(submitStub).should("have.been.calledWith", {
      path: "curate/publishActivityToLibrary",
      contentId: "content-123",
    });
  });

  it("handles Reject button click with correct fetcher submission", () => {
    const defaultProps = getDefaultProps();
    const submitStub = cy.stub();
    const submitFetcher = createMockFetcher(undefined, submitStub);
    cy.mount(
      <LibraryEditorControls {...defaultProps} submitFetcher={submitFetcher} />,
    );

    cy.contains("button", "Reject").click();

    cy.wrap(submitStub).should("have.been.calledWith", {
      path: "curate/rejectActivity",
      contentId: "content-123",
    });
  });

  it("handles Unpublish button click with correct fetcher submission", () => {
    const defaultProps = getDefaultProps();
    const submitStub = cy.stub();
    const submitFetcher = createMockFetcher(undefined, submitStub);
    cy.mount(
      <LibraryEditorControls
        {...defaultProps}
        loadFetcher={createMockFetcher({
          libraryRelations: mockLibraryRelationsPublished,
          libraryComments: [],
        })}
        submitFetcher={submitFetcher}
      />,
    );

    cy.contains("button", "Unpublish").click();

    cy.wrap(submitStub).should("have.been.calledWith", {
      path: "curate/unpublishActivityFromLibrary",
      contentId: "content-123",
    });
  });

  it("displays note when source activity is no longer public and is accessible", () => {
    const defaultProps = getDefaultProps();
    cy.mount(
      <LibraryEditorControls
        {...defaultProps}
        loadFetcher={createMockFetcher({
          libraryRelations: mockLibraryRelationsSourceNotVisible,
          libraryComments: [],
        })}
      />,
    );

    cy.contains("Note: Source activity is no longer public").should(
      "be.visible",
    );

    cy.checkAccessibility("body");
  });

  it("displays conversation when ownerRequested is true and is accessible", () => {
    const defaultProps = getDefaultProps();
    cy.mount(
      <LibraryEditorControls
        {...defaultProps}
        loadFetcher={createMockFetcher({
          libraryRelations: mockLibraryRelationsWithConversation,
          libraryComments: mockLibraryComments,
        })}
      />,
    );

    cy.contains("Conversation with owner").should("be.visible");
    cy.contains("This activity looks great!").should("be.visible");
    cy.contains("Thank you for the feedback.").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("displays review request date and byline with primary editor name and is accessible", () => {
    const defaultProps = getDefaultProps();
    cy.mount(<LibraryEditorControls {...defaultProps} />);

    cy.contains("Requested on").should("be.visible");
    cy.contains("John Doe").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("displays review request date with 'by owner' when owner requested and is accessible", () => {
    const defaultProps = getDefaultProps();
    cy.mount(
      <LibraryEditorControls
        {...defaultProps}
        loadFetcher={createMockFetcher({
          libraryRelations: mockLibraryRelationsWithConversation,
          libraryComments: [],
        })}
      />,
    );

    cy.contains("Requested on").should("be.visible");
    cy.contains("by owner").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible with PENDING status", () => {
    const defaultProps = getDefaultProps();
    const libraryRelationsPending: LibraryRelations = {
      source: {
        status: "PENDING",
        sourceContentId: "source-123",
        reviewRequestDate: "2024-01-15T10:00:00Z",
        primaryEditor: mockUserInfo,
      },
    };

    cy.mount(
      <LibraryEditorControls
        {...defaultProps}
        loadFetcher={createMockFetcher({
          libraryRelations: libraryRelationsPending,
          libraryComments: [],
        })}
      />,
    );

    cy.contains("Status:").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("is accessible with REJECTED status", () => {
    const defaultProps = getDefaultProps();
    const libraryRelationsRejected: LibraryRelations = {
      source: {
        status: "REJECTED",
        sourceContentId: "source-123",
        reviewRequestDate: "2024-01-15T10:00:00Z",
        primaryEditor: mockUserInfo,
      },
    };

    cy.mount(
      <LibraryEditorControls
        {...defaultProps}
        loadFetcher={createMockFetcher({
          libraryRelations: libraryRelationsRejected,
          libraryComments: [],
        })}
      />,
    );

    cy.contains("Status:").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("is accessible with multiple comments in conversation", () => {
    const defaultProps = getDefaultProps();
    const manyComments: LibraryComment[] = [
      {
        user: {
          userId: "user-1",
          firstNames: "Alice",
          lastNames: "Johnson",
        },
        dateTime: "2024-01-21T10:00:00Z",
        comment: "First comment",
        isMe: false,
      },
      {
        user: mockUserInfo,
        dateTime: "2024-01-21T11:00:00Z",
        comment: "Response comment",
        isMe: true,
      },
      {
        user: {
          userId: "user-2",
          firstNames: "Bob",
          lastNames: "Williams",
        },
        dateTime: "2024-01-21T12:00:00Z",
        comment: "Another comment",
        isMe: false,
      },
      {
        user: mockUserInfo,
        dateTime: "2024-01-21T13:00:00Z",
        comment: "Final response",
        isMe: true,
      },
    ];

    cy.mount(
      <LibraryEditorControls
        {...defaultProps}
        loadFetcher={createMockFetcher({
          libraryRelations: mockLibraryRelationsWithConversation,
          libraryComments: manyComments,
        })}
      />,
    );

    cy.contains("Conversation with owner").should("be.visible");
    cy.contains("First comment").should("be.visible");
    cy.contains("Final response").should("be.visible");

    cy.checkAccessibility("body");
  });
});
