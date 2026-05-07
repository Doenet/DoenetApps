import { AddContentToMenu } from "./AddContentToMenu";
import { FetcherWithComponents } from "react-router";
import { UserInfo, ContentDescription } from "../types";

// NOTE: Known Cypress limitation - when tests auto-rerun in watch mode (e.g., after Ctrl-S),
// intercepts can accumulate causing "onResponse cannot be called twice" errors.
// This is a Cypress issue, not a test issue. Workaround: restart Cypress to clear state.
// Tests pass correctly on initial run and in CI.
describe("AddContentToMenu component tests", { tags: ["@group2"] }, () => {
  beforeEach(() => {
    // Set up default intercepts that most tests use
    // Tests can override these by setting up their own intercepts before mounting
    cy.intercept("/api/info/getRecentContent*", {
      statusCode: 200,
      body: [],
    }).as("getRecentContent");

    cy.intercept("/api/copyMove/checkIfContentContains*", {
      statusCode: 200,
      body: { containsType: true },
    }).as("checkContains");
  });

  const mockUser: UserInfo = {
    userId: "12345678-1234-1234-1234-123456789999",
    firstNames: "Test",
    lastNames: "User",
  };

  const sourceContent: ContentDescription[] = [
    {
      contentId: "12345678-aaaa-bbbb-cccc-123456789abc",
      name: "Test Activity",
      type: "sequence",
      parent: null,
      doenetmlVersion: {
        id: 1,
        displayedVersion: "0.7",
        fullVersion: "0.7.0",
        default: true,
        deprecated: false,
        removed: false,
        deprecationMessage: "",
      },
    },
  ];

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

  it("renders the menu button with correct label", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.contains("Add To").should("exist");
  });

  it("opens menu and shows menu items", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");
    cy.wait("@checkContains");

    cy.get('[data-test="Add To Problem Set"]').should("be.visible");
    cy.get('[data-test="Add To Folder"]').should("be.visible");
    cy.get('[data-test="Add To My Activities"]').should("be.visible");
  });

  it("disables Problem Set option when no problem sets exist", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    cy.intercept("/api/copyMove/checkIfContentContains*", (req) => {
      const contentType = req.query.contentType;
      req.reply({
        statusCode: 200,
        body: { containsType: contentType !== "sequence" },
      });
    }).as("checkContains");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");
    cy.wait("@checkContains");
    cy.wait("@checkContains");

    cy.get('[data-test="Add To Problem Set"]').should("be.disabled");
    cy.get('[data-test="Add To Folder"]').should("not.be.disabled");
  });

  it("disables Folder option when no folders exist", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    cy.intercept("/api/copyMove/checkIfContentContains*", (req) => {
      const contentType = req.query.contentType;
      req.reply({
        statusCode: 200,
        body: { containsType: contentType !== "folder" },
      });
    }).as("checkContains");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");
    cy.wait("@checkContains");
    cy.wait("@checkContains");

    cy.get('[data-test="Add To Folder"]').should("be.disabled");
    cy.get('[data-test="Add To Problem Set"]').should("not.be.disabled");
  });

  it("shows recent content when available", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    const recentContent: ContentDescription[] = [
      {
        contentId: "12345678-1234-1234-1234-123456789012",
        name: "Recent Problem Set",
        type: "sequence",
        parent: null,
      },
      {
        contentId: "12345678-1234-1234-1234-123456789013",
        name: "Recent Folder",
        type: "folder",
        parent: null,
      },
    ];

    cy.intercept("/api/info/getRecentContent*", {
      statusCode: 200,
      body: recentContent,
    }).as("getRecentContent");

    cy.intercept("/api/copyMove/checkIfContentContains*", (req) => {
      req.reply({
        statusCode: 200,
        body: { containsType: true },
      });
    }).as("checkContains");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");

    cy.contains("Recent").should("be.visible");
    cy.get('[data-test="Recent Item"]').should("have.length", 2);
    cy.get('[data-test="Recent Item"]')
      .eq(0)
      .should("contain.text", "Recent Problem Set");
    cy.get('[data-test="Recent Item"]')
      .eq(1)
      .should("contain.text", "Recent Folder");
  });

  it("disables recent item when source content includes itself", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    const recentContent: ContentDescription[] = [
      {
        contentId: "12345678-aaaa-bbbb-cccc-123456789abc", // Same as sourceContent
        name: "Test Activity",
        type: "sequence",
        parent: null,
      },
    ];

    cy.intercept("/api/info/getRecentContent*", {
      statusCode: 200,
      body: recentContent,
    }).as("getRecentContent");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");

    cy.get('[data-test="Recent Item"]').should("be.disabled");
  });

  it("shows Load into Scratch Pad option for single content item", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");

    cy.get('[data-test="Load into Scratch Pad"]').should("be.visible");
    cy.get('[data-test="Load into Scratch Pad"]').should("not.be.disabled");
  });

  it("disables Load into Scratch Pad when doenetmlVersion is not default", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    const sourceWithNonDefaultVersion: ContentDescription[] = [
      {
        contentId: "12345678-aaaa-bbbb-cccc-123456789abd",
        name: "Test Activity",
        type: "sequence",
        parent: null,
        doenetmlVersion: {
          id: 2,
          displayedVersion: "0.6",
          fullVersion: "0.6.0",
          default: false,
          deprecated: true,
          removed: false,
          deprecationMessage: "This version is deprecated",
        },
      },
    ];

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceWithNonDefaultVersion}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");

    cy.get('[data-test="Load into Scratch Pad"]').should("be.disabled");
  });

  it("does not show Load into Scratch Pad for multiple items", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    const multipleSourceContent: ContentDescription[] = [
      {
        contentId: "12345678-aaaa-bbbb-cccc-123456789ab1",
        name: "Test Activity 1",
        type: "sequence",
        parent: null,
        doenetmlVersion: {
          id: 1,
          displayedVersion: "0.7",
          fullVersion: "0.7.0",
          default: true,
          deprecated: false,
          removed: false,
          deprecationMessage: "",
        },
      },
      {
        contentId: "12345678-aaaa-bbbb-cccc-123456789ab2",
        name: "Test Activity 2",
        type: "sequence",
        parent: null,
        doenetmlVersion: {
          id: 1,
          displayedVersion: "0.7",
          fullVersion: "0.7.0",
          default: true,
          deprecated: false,
          removed: false,
          deprecationMessage: "",
        },
      },
    ];

    cy.mount(
      <AddContentToMenu
        sourceContent={multipleSourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");

    cy.get('[data-test="Load into Scratch Pad"]').should("not.exist");
  });

  it("navigates to scratch pad when Load into Scratch Pad is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");

    cy.get('[data-test="Load into Scratch Pad"]').click();
    cy.get("@onNavigate").should(
      "have.been.calledWith",
      "/scratchPad?contentId=12345678-aaaa-bbbb-cccc-123456789abc",
    );
  });

  it("shows suggest curation option when enabled", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
        suggestToBeCuratedOption={true}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");

    cy.get('[data-test="Suggest this to be curated"]').should("be.visible");
  });

  it("shows suggest curation modal when option is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
        suggestToBeCuratedOption={true}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");

    cy.get('[data-test="Suggest this to be curated"]').click();

    cy.get('[data-test="Copy Header"]').should(
      "have.text",
      "Suggestion received",
    );
    cy.get('[data-test="Copy Body"]').should(
      "contain.text",
      "Thank you for suggesting",
    );
    cy.get("@fetcherSubmit").should("have.been.calledOnce");
  });

  it("closes suggest curation modal when Close button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
        suggestToBeCuratedOption={true}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");

    cy.get('[data-test="Suggest this to be curated"]').click();
    cy.get('[data-test="Copy Header"]').should("be.visible");

    cy.get('[data-test="Close Button"]').click();
    cy.get('[data-test="Copy Header"]').should("not.exist");
  });

  it("truncates long recent content names", () => {
    const mockFetcher = createMockFetcher();
    const onNavigateSpy = cy.spy().as("onNavigate");
    const setAddToSpy = cy.spy().as("setAddTo");

    const recentContent: ContentDescription[] = [
      {
        contentId: "12345678-1234-1234-1234-123456789014",
        name: "This is a very long name that should be truncated",
        type: "sequence",
        parent: null,
      },
    ];

    cy.intercept("/api/info/getRecentContent*", {
      statusCode: 200,
      body: recentContent,
    }).as("getRecentContent");

    cy.intercept("/api/copyMove/checkIfContentContains*", (req) => {
      req.reply({
        statusCode: 200,
        body: { containsType: true },
      });
    }).as("checkContains");

    cy.mount(
      <AddContentToMenu
        sourceContent={sourceContent}
        label="Add To"
        fetcher={mockFetcher}
        user={mockUser}
        onNavigate={onNavigateSpy}
        setAddTo={setAddToSpy}
      />,
    );

    cy.get('[data-test="Add To"]').click();
    cy.wait("@getRecentContent");

    cy.get('[data-test="Recent Item"]')
      .eq(0)
      .should("contain.text", "This is a very long ...");
  });

  describe("accessibility tests", () => {
    it("is accessible with default configuration", () => {
      const mockFetcher = createMockFetcher();
      const onNavigateSpy = cy.spy().as("onNavigate");
      const setAddToSpy = cy.spy().as("setAddTo");

      cy.mount(
        <AddContentToMenu
          sourceContent={sourceContent}
          label="Add To"
          fetcher={mockFetcher}
          user={mockUser}
          onNavigate={onNavigateSpy}
          setAddTo={setAddToSpy}
        />,
      );

      cy.checkAccessibility("body");
    });

    it("is accessible with menu open", () => {
      const mockFetcher = createMockFetcher();
      const onNavigateSpy = cy.spy().as("onNavigate");
      const setAddToSpy = cy.spy().as("setAddTo");

      cy.mount(
        <AddContentToMenu
          sourceContent={sourceContent}
          label="Add To"
          fetcher={mockFetcher}
          user={mockUser}
          onNavigate={onNavigateSpy}
          setAddTo={setAddToSpy}
        />,
      );

      cy.get('[data-test="Add To"]').click();
      cy.wait("@getRecentContent");
      cy.checkAccessibility("body");
    });

    it("is accessible with recent content displayed", () => {
      const mockFetcher = createMockFetcher();
      const onNavigateSpy = cy.spy().as("onNavigate");
      const setAddToSpy = cy.spy().as("setAddTo");

      const recentContent: ContentDescription[] = [
        {
          contentId: "12345678-1234-1234-1234-123456789015",
          name: "Recent Problem Set",
          type: "sequence",
          parent: null,
        },
        {
          contentId: "12345678-1234-1234-1234-123456789016",
          name: "Recent Folder",
          type: "folder",
          parent: null,
        },
      ];

      cy.intercept("/api/info/getRecentContent*", {
        statusCode: 200,
        body: recentContent,
      }).as("getRecentContent");

      cy.mount(
        <AddContentToMenu
          sourceContent={sourceContent}
          label="Add To"
          fetcher={mockFetcher}
          user={mockUser}
          onNavigate={onNavigateSpy}
          setAddTo={setAddToSpy}
        />,
      );

      cy.get('[data-test="Add To"]').click();
      cy.wait("@getRecentContent");
      cy.checkAccessibility("body");
    });

    it("is accessible with suggest curation modal open", () => {
      const mockFetcher = createMockFetcher();
      const onNavigateSpy = cy.spy().as("onNavigate");
      const setAddToSpy = cy.spy().as("setAddTo");

      cy.mount(
        <AddContentToMenu
          sourceContent={sourceContent}
          label="Add To"
          fetcher={mockFetcher}
          user={mockUser}
          onNavigate={onNavigateSpy}
          setAddTo={setAddToSpy}
          suggestToBeCuratedOption={true}
        />,
      );

      cy.get('[data-test="Add To"]').click();
      cy.wait("@getRecentContent");
      cy.get('[data-test="Suggest this to be curated"]').click();
      cy.checkAccessibility("body");
    });
  });
});
