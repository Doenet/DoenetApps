import { EditorLibraryModeComponent } from "./EditorLibraryMode";
import { ContentType, LibraryComment, LibraryRelations } from "../../types";
import { FetcherWithComponents } from "react-router";

describe("EditorLibraryModeContent", { tags: ["@group1"] }, () => {
  // Mock fetcher
  const mockFetcher = {
    state: "idle",
    formData: undefined,
    data: undefined,
    Form: ({ children }: any) => <form>{children}</form>,
    submit: () => {},
    load: () => {},
  } as unknown as FetcherWithComponents<any>;

  // Mock data
  const mockUser = {
    userId: "user123",
    firstNames: "John",
    lastNames: "Doe",
  };

  const mockLibraryComments: LibraryComment[] = [
    {
      user: mockUser,
      dateTime: "2024-01-15T10:00:00Z",
      comment: "This is a great activity!",
      isMe: false,
    },
    {
      user: {
        userId: "user456",
        firstNames: "Jane",
        lastNames: "Smith",
      },
      dateTime: "2024-01-16T10:00:00Z",
      comment: "Thank you for the feedback!",
      isMe: true,
    },
  ];

  const mockOnClose = () => {};

  const defaultPropsNotSuggested = {
    libraryRelations: {} satisfies LibraryRelations,
    libraryComments: [],
    contentId: "content123",
    isPublic: true,
    contentType: "singleDoc" as ContentType,
    contentName: "Test Activity",
    fetcher: mockFetcher,
    onClose: mockOnClose,
  };

  const defaultPropsPending = {
    ...defaultPropsNotSuggested,
    libraryRelations: {
      activity: {
        status: "PENDING" as const,
        activityContentId: "activity123",
      },
    } as LibraryRelations,
    libraryComments: mockLibraryComments,
  };

  it("renders the modal with correct title", () => {
    cy.mount(<EditorLibraryModeComponent {...defaultPropsNotSuggested} />);

    cy.contains("Test Activity - Library status").should("be.visible");
  });

  it("displays library introduction text when not suggested", () => {
    cy.mount(<EditorLibraryModeComponent {...defaultPropsNotSuggested} />);

    cy.contains("Doenet Library").should("be.visible");
    cy.contains("peer-reviewed").should("be.visible");
  });

  it("shows suggest button when public and not suggested", () => {
    cy.mount(<EditorLibraryModeComponent {...defaultPropsNotSuggested} />);

    cy.get('button[data-test="Suggest this activity"]')
      .should("be.visible")
      .should("not.be.disabled");
  });

  it("disables suggest button when not public", () => {
    cy.mount(
      <EditorLibraryModeComponent
        {...defaultPropsNotSuggested}
        isPublic={false}
      />,
    );

    cy.get('button[data-test="Suggest this activity"]').should("be.disabled");
    cy.contains("must be shared publicly").should("be.visible");
  });

  it("calls fetcher.submit when suggest button is clicked", () => {
    const submitSpy = cy.stub();
    const fetcherWithSpy = { ...mockFetcher, submit: submitSpy };

    cy.mount(
      <EditorLibraryModeComponent
        {...defaultPropsNotSuggested}
        fetcher={fetcherWithSpy}
      />,
    );

    cy.get('button[data-test="Suggest this activity"]').click();
    cy.wrap(submitSpy).should("have.been.calledOnce");
  });

  it("displays status when activity is suggested", () => {
    cy.mount(<EditorLibraryModeComponent {...defaultPropsPending} />);

    cy.contains("Status is").should("be.visible");
    cy.contains("pending").should("be.visible");
  });

  it("displays chat conversation when activity is suggested", () => {
    cy.mount(<EditorLibraryModeComponent {...defaultPropsPending} />);

    cy.contains("Conversation with editor(s)").should("be.visible");
    cy.contains("This is a great activity!").should("be.visible");
    cy.contains("Thank you for the feedback!").should("be.visible");
  });

  it("shows resubmit button when status is rejected", () => {
    const rejectedProps = {
      ...defaultPropsPending,
      libraryRelations: {
        activity: {
          status: "REJECTED" as const,
          activityContentId: "activity123",
        },
      } as LibraryRelations,
    };

    cy.mount(<EditorLibraryModeComponent {...rejectedProps} />);

    cy.get('button[data-test="Resubmit Library Request"]').should("be.visible");
  });

  it("does not show resubmit button when status is not rejected", () => {
    cy.mount(<EditorLibraryModeComponent {...defaultPropsPending} />);

    cy.get('button[data-test="Resubmit Library Request"]').should("not.exist");
  });

  it("calls onClose when close button is clicked", () => {
    const onCloseSpy = cy.stub();

    cy.mount(
      <EditorLibraryModeComponent
        {...defaultPropsNotSuggested}
        onClose={onCloseSpy}
      />,
    );

    cy.get("button[aria-label='Close']").click();
    cy.wrap(onCloseSpy).should("have.been.calledOnce");
  });

  it("is accessible when not suggested and public", () => {
    cy.mount(<EditorLibraryModeComponent {...defaultPropsNotSuggested} />);

    cy.checkAccessibility("body");
  });

  it("is accessible when not suggested and not public", () => {
    cy.mount(
      <EditorLibraryModeComponent
        {...defaultPropsNotSuggested}
        isPublic={false}
      />,
    );

    cy.checkAccessibility("body");
  });

  it("is accessible with pending status", () => {
    cy.mount(<EditorLibraryModeComponent {...defaultPropsPending} />);

    cy.checkAccessibility("body");
  });

  it("is accessible with under review status", () => {
    const underReviewProps = {
      ...defaultPropsPending,
      libraryRelations: {
        activity: {
          status: "UNDER_REVIEW" as const,
          activityContentId: "activity123",
        },
      } as LibraryRelations,
    };

    cy.mount(<EditorLibraryModeComponent {...underReviewProps} />);

    cy.checkAccessibility("body");
  });

  it("is accessible with published status", () => {
    const publishedProps = {
      ...defaultPropsPending,
      libraryRelations: {
        activity: {
          status: "PUBLISHED" as const,
          activityContentId: "activity123",
        },
      } as LibraryRelations,
    };

    cy.mount(<EditorLibraryModeComponent {...publishedProps} />);

    cy.checkAccessibility("body");
  });

  it("is accessible with rejected status", () => {
    const rejectedProps = {
      ...defaultPropsPending,
      libraryRelations: {
        activity: {
          status: "REJECTED" as const,
          activityContentId: "activity123",
        },
      } as LibraryRelations,
    };

    cy.mount(<EditorLibraryModeComponent {...rejectedProps} />);

    cy.checkAccessibility("body");
  });

  it("is accessible with no comments", () => {
    const noCommentsProps = {
      ...defaultPropsPending,
      libraryComments: [],
    };

    cy.mount(<EditorLibraryModeComponent {...noCommentsProps} />);

    cy.checkAccessibility("body");
  });

  it("is accessible with long content name", () => {
    const longNameProps = {
      ...defaultPropsNotSuggested,
      contentName:
        "This is a very long activity name that should be tested for accessibility to ensure it displays properly in the modal header",
    };

    cy.mount(<EditorLibraryModeComponent {...longNameProps} />);

    cy.checkAccessibility("body");
  });
});
