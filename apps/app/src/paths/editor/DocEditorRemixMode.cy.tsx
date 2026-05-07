import { DocEditorRemixModeComponent } from "./DocEditorRemixMode";
import { ActivityRemixItem } from "../../types";

describe("DocEditorRemixModeContent", { tags: ["@group1"] }, () => {
  // Mock data
  const mockSources: ActivityRemixItem[] = [
    {
      originContent: {
        contentId: "origin1",
        revisionNum: 1,
        timestamp: "2024-01-15T10:00:00Z",
        name: "Original Document",
        owner: {
          userId: "user1",
          firstNames: "John",
          lastNames: "Doe",
        },
        cidAtLastUpdate: "cid123",
        currentCid: "cid123",
        changed: false,
      },
      remixContent: {
        contentId: "remix1",
        revisionNum: 1,
        timestamp: "2024-01-16T10:00:00Z",
        name: "My Remix",
        owner: {
          userId: "user2",
          firstNames: "Jane",
          lastNames: "Smith",
        },
        cidAtLastUpdate: "cid456",
        currentCid: "cid456",
        changed: false,
      },
      withLicenseCode: "CCBYSA",
      directCopy: false,
    },
  ];

  const mockRemixes: ActivityRemixItem[] = [
    {
      originContent: {
        contentId: "origin2",
        revisionNum: 1,
        timestamp: "2024-01-17T10:00:00Z",
        name: "My Document",
        owner: {
          userId: "user2",
          firstNames: "Jane",
          lastNames: "Smith",
        },
        cidAtLastUpdate: "cid789",
        currentCid: "cid789",
        changed: false,
      },
      remixContent: {
        contentId: "remix2",
        revisionNum: 1,
        timestamp: "2024-01-18T10:00:00Z",
        name: "Someone's Remix",
        owner: {
          userId: "user3",
          firstNames: "Bob",
          lastNames: "Johnson",
        },
        cidAtLastUpdate: "cid012",
        currentCid: "cid012",
        changed: false,
      },
      withLicenseCode: "CCBYSA",
      directCopy: false,
    },
  ];

  const mockOnClose = () => {};

  const defaultProps = {
    remixes: mockRemixes,
    sources: mockSources,
    contentName: "Test Document",
    onClose: mockOnClose,
  };

  it("renders the modal with correct title", () => {
    cy.mount(<DocEditorRemixModeComponent {...defaultProps} />);

    cy.contains("Test Document - Remixes").should("be.visible");
  });

  it("displays remix sources heading", () => {
    cy.mount(<DocEditorRemixModeComponent {...defaultProps} />);

    cy.contains("This document is remixed from:").should("be.visible");
  });

  it("displays remixes heading", () => {
    cy.mount(<DocEditorRemixModeComponent {...defaultProps} />);

    cy.contains("Others have remixed this document:").should("be.visible");
  });

  it("calls onClose when close button is clicked", () => {
    const onCloseSpy = cy.stub();
    cy.mount(
      <DocEditorRemixModeComponent {...defaultProps} onClose={onCloseSpy} />,
    );

    cy.get("button[aria-label='Close']").click();
    cy.wrap(onCloseSpy).should("have.been.calledOnce");
  });

  it("is accessible with sources and remixes", () => {
    cy.mount(<DocEditorRemixModeComponent {...defaultProps} />);

    cy.checkAccessibility("body");
  });

  it("is accessible with no sources", () => {
    cy.mount(<DocEditorRemixModeComponent {...defaultProps} sources={[]} />);

    cy.checkAccessibility("body");
  });

  it("is accessible with no remixes", () => {
    cy.mount(<DocEditorRemixModeComponent {...defaultProps} remixes={[]} />);

    cy.checkAccessibility("body");
  });

  it("is accessible with changed sources", () => {
    const changedSources: ActivityRemixItem[] = [
      {
        ...mockSources[0],
        originContent: {
          ...mockSources[0].originContent,
          changed: true,
        },
      },
    ];

    cy.mount(
      <DocEditorRemixModeComponent
        {...defaultProps}
        sources={changedSources}
      />,
    );

    cy.checkAccessibility("body");
  });

  it("is accessible with changed remixes", () => {
    const changedRemixes: ActivityRemixItem[] = [
      {
        ...mockRemixes[0],
        remixContent: {
          ...mockRemixes[0].remixContent,
          changed: true,
        },
      },
    ];

    cy.mount(
      <DocEditorRemixModeComponent
        {...defaultProps}
        remixes={changedRemixes}
      />,
    );

    cy.checkAccessibility("body");
  });

  it("is accessible with multiple sources and remixes", () => {
    const multipleSources: ActivityRemixItem[] = [
      ...mockSources,
      {
        ...mockSources[0],
        originContent: {
          ...mockSources[0].originContent,
          contentId: "origin3",
          name: "Another Source",
        },
      },
    ];

    const multipleRemixes: ActivityRemixItem[] = [
      ...mockRemixes,
      {
        ...mockRemixes[0],
        remixContent: {
          ...mockRemixes[0].remixContent,
          contentId: "remix3",
          name: "Another Remix",
        },
      },
    ];

    cy.mount(
      <DocEditorRemixModeComponent
        {...defaultProps}
        sources={multipleSources}
        remixes={multipleRemixes}
      />,
    );

    cy.checkAccessibility("body");
  });

  it("is accessible with long content name", () => {
    const longName =
      "This is a very long document name that should be tested for accessibility to ensure it displays properly in the modal header";

    cy.mount(
      <DocEditorRemixModeComponent {...defaultProps} contentName={longName} />,
    );

    cy.contains(longName).should("be.visible");
    cy.checkAccessibility("body");
  });
});
