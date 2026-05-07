import { RemixSources } from "./RemixSources";
import { ActivityRemixItem, RemixContent, DoenetDateTime } from "../types";

describe("RemixSources", { tags: ["@group1"] }, () => {
  const mockSourceOwner = {
    userId: "source-owner-1" as any,
    firstNames: "Alice",
    lastNames: "Johnson",
  };

  const mockCurrentOwner = {
    userId: "current-owner-1" as any,
    firstNames: "Bob",
    lastNames: "Smith",
  };

  const mockSourceContent: RemixContent = {
    contentId: "source-1" as any,
    revisionNum: 1,
    timestamp: "2024-01-10T09:00:00" as DoenetDateTime,
    name: "Source Activity",
    owner: mockSourceOwner,
    cidAtLastUpdate: "xyz789",
    currentCid: "xyz789",
    changed: false,
    doenetmlVersion: "0.7.0",
  };

  const mockCurrentContent: RemixContent = {
    contentId: "current-1" as any,
    revisionNum: 3,
    timestamp: "2024-01-15T14:30:00" as DoenetDateTime,
    name: "Current Activity",
    owner: mockCurrentOwner,
    cidAtLastUpdate: "abc123",
    currentCid: "abc123",
    changed: false,
  };

  const mockChangedSourceContent: RemixContent = {
    ...mockSourceContent,
    changed: true,
    currentCid: "xyz999",
  };

  const mockSourceRemix: ActivityRemixItem = {
    originContent: mockSourceContent,
    remixContent: mockCurrentContent,
    withLicenseCode: "CCDUAL",
    directCopy: true,
  };

  const mockChangedSourceRemix: ActivityRemixItem = {
    originContent: mockChangedSourceContent,
    remixContent: mockCurrentContent,
    withLicenseCode: "CCBYNCSA",
    directCopy: false,
  };

  it("renders not remixed message when no sources", () => {
    cy.mount(<RemixSources contributorHistory={[]} />);

    cy.contains("Not remixed from other activities").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders remix sources table", () => {
    cy.mount(<RemixSources contributorHistory={[mockSourceRemix]} />);

    cy.contains("Source Activity").should("be.visible");
    cy.contains("Alice Johnson").should("be.visible");
    cy.contains("CCDUAL").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders multiple remix sources", () => {
    cy.mount(
      <RemixSources
        contributorHistory={[mockSourceRemix, mockChangedSourceRemix]}
      />,
    );

    cy.contains("Source Activity").should("be.visible");
    cy.get('[data-test="Remix source 1"]').should("be.visible");
    cy.get('[data-test="Remix source 2"]').should("be.visible");
    cy.checkAccessibility("body");
  });

  it("shows changed indicator for sources with changes", () => {
    cy.mount(<RemixSources contributorHistory={[mockChangedSourceRemix]} />);

    cy.get('[data-test="Remix source 1"]').within(() => {
      cy.contains("🔴").should("be.visible");
    });
    cy.checkAccessibility("body");
  });

  it("renders compare button for sources", () => {
    cy.mount(<RemixSources contributorHistory={[mockSourceRemix]} />);

    cy.contains("Compare").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders haveChangedSource indicator", () => {
    cy.mount(
      <RemixSources
        contributorHistory={[mockSourceRemix]}
        haveChangedSource={true}
      />,
    );

    cy.contains("Indicates remix source has changed").should("be.visible");
    cy.checkAccessibility("body");
  });
});
