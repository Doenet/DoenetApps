import { DocEditorHistoryModeComponent } from "./DocEditorHistoryMode";
import { ContentRevision, DoenetmlVersion } from "../../types";
import { FetcherWithComponents } from "react-router";

// Mock editor component that just renders a div
const MockEditor = (props: any) => (
  <div
    style={{
      height: props.height,
      width: props.width,
      backgroundColor: "#f0f0f0",
    }}
    data-testid="mock-editor"
  >
    Mock Editor
  </div>
);

describe("DocEditorHistoryModeContent", { tags: ["@group1"] }, () => {
  const mockVersion: DoenetmlVersion = {
    id: 2,
    displayedVersion: "0.7",
    fullVersion: "0.7.0",
    default: true,
    deprecated: false,
    removed: false,
    deprecationMessage: "",
  };

  const mockRevisions: ContentRevision[] = [
    {
      revisionNum: 2,
      revisionName: "After edits",
      note: "Made some edits to the content",
      source: "<document><text>Edited content</text></document>",
      createdAt: "2026-01-15T10:00:00Z",
      cid: "bafkreiexamplecid2",
      doenetmlVersion: "0.7",
    },
    {
      revisionNum: 1,
      revisionName: "Initial version",
      note: "Initial save point",
      source: "<document><text>Initial content</text></document>",
      createdAt: "2026-01-10T09:00:00Z",
      cid: "bafkreiexamplecid1",
      doenetmlVersion: "0.7",
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

  const defaultProps = {
    doenetML: "<document><text>Current content</text></document>",
    doenetmlVersion: mockVersion,
    revisions: mockRevisions,
    contentId: "test-content-123",
    contentName: "Test Activity",
    onClose: () => {},
    fetcher: mockFetcher,
    editorComponent: MockEditor,
  };

  it("renders correctly and is accessible", () => {
    cy.mount(
      <div style={{ height: "100vh" }}>
        <DocEditorHistoryModeComponent {...defaultProps} />
      </div>,
    );

    // Verify modal renders
    cy.contains("Test Activity - Document history").should("be.visible");
    cy.contains("Current Activity").should("be.visible");
    cy.get("[data-testid='mock-editor']").should("be.visible");

    // Check accessibility
    cy.checkAccessibility("body");
  });

  it("is accessible with empty revisions", () => {
    cy.mount(
      <div style={{ height: "100vh" }}>
        <DocEditorHistoryModeComponent {...defaultProps} revisions={[]} />
      </div>,
    );

    cy.contains("Test Activity - Document history").should("be.visible");
    cy.contains("No save point available").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible with single revision", () => {
    cy.mount(
      <div style={{ height: "100vh" }}>
        <DocEditorHistoryModeComponent
          {...defaultProps}
          revisions={[mockRevisions[0]]}
        />
      </div>,
    );

    cy.get("select").should("be.visible");
    // 1 revision + placeholder = 2 options
    cy.get("option").should("have.length", 2);

    cy.checkAccessibility("body");
  });

  it("is accessible with multiple revisions", () => {
    cy.mount(
      <div style={{ height: "100vh" }}>
        <DocEditorHistoryModeComponent {...defaultProps} />
      </div>,
    );

    cy.get("select").should("be.visible");
    // 2 revisions + placeholder = 3 options
    cy.get("option").should("have.length", 3);

    // Select a revision
    cy.get("select").select("1");

    cy.checkAccessibility("body");
  });

  it("is accessible when revision is selected", () => {
    cy.mount(
      <div style={{ height: "100vh" }}>
        <DocEditorHistoryModeComponent {...defaultProps} />
      </div>,
    );

    cy.get("select").select("2");

    // Button should be visible when revision is selected
    cy.contains(
      "button",
      /Use this save point|Already at this save point/,
    ).should("be.visible");
    cy.contains("button", "Save point info").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible when create save point button is visible", () => {
    cy.mount(
      <div style={{ height: "100vh" }}>
        <DocEditorHistoryModeComponent {...defaultProps} />
      </div>,
    );

    cy.contains("button", "Create save point").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible with long content names", () => {
    const longName = "A Very Long Activity Name That Tests Text Rendering";

    cy.mount(
      <div style={{ height: "100vh" }}>
        <DocEditorHistoryModeComponent
          {...defaultProps}
          contentName={longName}
        />
      </div>,
    );

    cy.contains(longName).should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible with different doenetml versions", () => {
    const v06Version: DoenetmlVersion = {
      id: 1,
      displayedVersion: "0.6",
      fullVersion: "0.6.0",
      default: false,
      deprecated: true,
      removed: false,
      deprecationMessage: "Version 0.6 is deprecated",
    };

    cy.mount(
      <div style={{ height: "100vh" }}>
        <DocEditorHistoryModeComponent
          {...defaultProps}
          doenetmlVersion={v06Version}
        />
      </div>,
    );

    cy.contains("Test Activity - Document history").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible when revision name contains special characters", () => {
    const specialRevisions: ContentRevision[] = [
      {
        revisionNum: 1,
        revisionName: "Draft v2.0 (Final-Edit_2026-01-28)",
        note: "Complex version",
        source: "<document><text>Content</text></document>",
        createdAt: "2026-01-15T10:00:00Z",
        cid: "bafkreiexamplecid",
        doenetmlVersion: "0.7",
      },
    ];

    cy.mount(
      <div style={{ height: "100vh" }}>
        <DocEditorHistoryModeComponent
          {...defaultProps}
          revisions={specialRevisions}
        />
      </div>,
    );

    cy.get("select").should("be.visible");

    cy.checkAccessibility("body");
  });
});
