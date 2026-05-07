import { ConfirmAssignModal } from "./ConfirmAssignModal";
import { FetcherWithComponents } from "react-router";
import { ContentDescription } from "../types";

describe("ConfirmAssignModal component tests", { tags: ["@group2"] }, () => {
  const mockContentDescription: ContentDescription = {
    contentId: "12345678-1234-1234-1234-123456789abc",
    name: "Test Activity",
    type: "sequence",
    parent: null,
  };

  const mockUserId = "12345678-1111-2222-3333-123456789999";

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

  function createFetchers() {
    return {
      mockFetcher: createMockFetcher(),
      assignmentFetcher: createMockFetcher(),
      maxAttemptsFetcher: createMockFetcher(),
      variantFetcher: createMockFetcher(),
      modeFetcher: createMockFetcher(),
    };
  }

  it("shows modal when open", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={3}
        individualizeByStudent={true}
        mode="formative"
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    cy.contains("Create assignment from problem set").should("be.visible");
    cy.contains("Review your assignment settings").should("be.visible");
  });

  it("shows loading message when settings are undefined", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    cy.contains("Loading...").should("be.visible");
  });

  it("displays settings when all props are provided", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={5}
        individualizeByStudent={false}
        mode="summative"
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    cy.contains("Loading...").should("not.exist");
    cy.contains("Review your assignment settings").should("be.visible");
    // Verify the duration section is visible (confirms settings are loaded)
    cy.contains(
      "How long would you like this assignment to remain open?",
    ).should("be.visible");
  });

  it("has default duration of 48 hours selected", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={3}
        individualizeByStudent={true}
        mode="formative"
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    cy.contains("48 Hours")
      .parent()
      .find('input[type="radio"]')
      .should("be.checked");
  });

  it("allows selecting different duration options", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={3}
        individualizeByStudent={true}
        mode="formative"
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    // Click 2 Weeks
    cy.contains("2 Weeks").click();
    cy.contains("2 Weeks")
      .parent()
      .find('input[type="radio"]')
      .should("be.checked");

    // Click 1 Year
    cy.contains("1 Year").click();
    cy.contains("1 Year")
      .parent()
      .find('input[type="radio"]')
      .should("be.checked");

    // Click Custom
    cy.contains("Custom").click();
    cy.contains("Custom")
      .parent()
      .find('input[type="radio"]')
      .should("be.checked");
  });

  it("enables custom date picker when Custom is selected", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={3}
        individualizeByStudent={true}
        mode="formative"
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    // Custom date picker should be disabled initially
    cy.get('input[type="datetime-local"]').should("be.disabled");

    // Click Custom radio
    cy.contains("Custom").click();

    // Custom date picker should now be enabled
    cy.get('input[type="datetime-local"]').should("not.be.disabled");
  });

  it("disables custom date picker when other duration is selected", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={3}
        individualizeByStudent={true}
        mode="formative"
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    // Enable custom picker
    cy.contains("Custom").click();
    cy.get('input[type="datetime-local"]').should("not.be.disabled");

    // Select 48 Hours
    cy.contains("48 Hours").click();
    cy.get('input[type="datetime-local"]').should("be.disabled");
  });

  it("closes modal when Close button is clicked", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={3}
        individualizeByStudent={true}
        mode="formative"
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    cy.contains("button", "Close").click();
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("opens MoveCopyContent modal when Create assignment is clicked", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.intercept("GET", "/api/copyMove/getMoveCopyContentData/*", {
      statusCode: 200,
      body: {
        parent: null,
        contents: [],
      },
    }).as("getMoveCopyContentData");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={3}
        individualizeByStudent={true}
        mode="formative"
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    cy.get('[data-test="Confirm Create Assignment"]').click();

    // MoveCopyContent modal should now be visible
    cy.contains("Create assignment in folder").should("be.visible");
  });

  it("handles document type correctly", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    const documentContent: ContentDescription = {
      ...mockContentDescription,
      type: "singleDoc",
    };

    cy.mount(
      <ConfirmAssignModal
        contentDescription={documentContent}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={3}
        individualizeByStudent={true}
        mode="formative"
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    cy.contains("Create assignment from document").should("be.visible");
  });

  it("shows loading when maxAttempts is null", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={null}
        individualizeByStudent={true}
        mode="formative"
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    cy.contains("Loading...").should("be.visible");
  });

  it("shows loading when mode is null", () => {
    const {
      mockFetcher,
      assignmentFetcher,
      maxAttemptsFetcher,
      variantFetcher,
      modeFetcher,
    } = createFetchers();
    const onCloseSpy = cy.spy().as("onClose");
    const onNavigateSpy = cy.spy().as("onNavigate");

    cy.mount(
      <ConfirmAssignModal
        contentDescription={mockContentDescription}
        isOpen={true}
        userId={mockUserId}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
        onNavigate={onNavigateSpy}
        maxAttempts={3}
        individualizeByStudent={true}
        mode={null}
        maxAttemptsFetcher={maxAttemptsFetcher}
        variantFetcher={variantFetcher}
        modeFetcher={modeFetcher}
        assignmentFetcher={assignmentFetcher}
      />,
    );

    cy.contains("Loading...").should("be.visible");
  });

  describe("accessibility tests", () => {
    it("is accessible with settings loaded", () => {
      const {
        mockFetcher,
        assignmentFetcher,
        maxAttemptsFetcher,
        variantFetcher,
        modeFetcher,
      } = createFetchers();
      const onCloseSpy = cy.spy().as("onClose");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <ConfirmAssignModal
          contentDescription={mockContentDescription}
          isOpen={true}
          userId={mockUserId}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
          onNavigate={onNavigateSpy}
          maxAttempts={3}
          individualizeByStudent={true}
          mode="formative"
          maxAttemptsFetcher={maxAttemptsFetcher}
          variantFetcher={variantFetcher}
          modeFetcher={modeFetcher}
          assignmentFetcher={assignmentFetcher}
        />,
      );

      cy.contains("Review your assignment settings").should("be.visible");
      cy.get("[role='dialog']").should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible in loading state", () => {
      const {
        mockFetcher,
        assignmentFetcher,
        maxAttemptsFetcher,
        variantFetcher,
        modeFetcher,
      } = createFetchers();
      const onCloseSpy = cy.spy().as("onClose");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <ConfirmAssignModal
          contentDescription={mockContentDescription}
          isOpen={true}
          userId={mockUserId}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
          onNavigate={onNavigateSpy}
          maxAttemptsFetcher={maxAttemptsFetcher}
          variantFetcher={variantFetcher}
          modeFetcher={modeFetcher}
          assignmentFetcher={assignmentFetcher}
        />,
      );

      cy.contains("Loading...").should("be.visible");
      cy.get("[role='dialog']").should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible with MoveCopyContent modal open", () => {
      const {
        mockFetcher,
        assignmentFetcher,
        maxAttemptsFetcher,
        variantFetcher,
        modeFetcher,
      } = createFetchers();
      const onCloseSpy = cy.spy().as("onClose");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.intercept("GET", "/api/copyMove/getMoveCopyContentData/*", {
        statusCode: 200,
        body: {
          parent: null,
          contents: [],
        },
      }).as("getMoveCopyContentData");

      cy.mount(
        <ConfirmAssignModal
          contentDescription={mockContentDescription}
          isOpen={true}
          userId={mockUserId}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
          onNavigate={onNavigateSpy}
          maxAttempts={3}
          individualizeByStudent={true}
          mode="formative"
          maxAttemptsFetcher={maxAttemptsFetcher}
          variantFetcher={variantFetcher}
          modeFetcher={modeFetcher}
          assignmentFetcher={assignmentFetcher}
        />,
      );

      cy.get('[data-test="Confirm Create Assignment"]').click();
      cy.contains("Create assignment in folder").should("be.visible");
      cy.get("[role='dialog']").should("be.visible");
      cy.checkAccessibility("body");
    });
  });
});
