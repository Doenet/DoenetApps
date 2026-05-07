import { Remixes } from "./Remixes";
import { ActivityRemixItem, RemixContent, DoenetDateTime } from "../types";

describe("Remixes", { tags: ["@group1"] }, () => {
  const mockOwner = {
    userId: "owner-1" as any,
    firstNames: "Jane",
    lastNames: "Smith",
  };

  const mockRemixOwner = {
    userId: "remix-owner-1" as any,
    firstNames: "John",
    lastNames: "Doe",
  };

  const mockOriginContent: RemixContent = {
    contentId: "origin-1" as any,
    revisionNum: 1,
    timestamp: "2024-01-15T10:30:00" as DoenetDateTime,
    name: "Original Activity",
    owner: mockOwner,
    cidAtLastUpdate: "abc123",
    currentCid: "abc123",
    changed: false,
    doenetmlVersion: "0.7.0",
  };

  const mockRemixContent: RemixContent = {
    contentId: "remix-1" as any,
    revisionNum: 2,
    timestamp: "2024-01-20T14:30:00" as DoenetDateTime,
    name: "Remixed Activity",
    owner: mockRemixOwner,
    cidAtLastUpdate: "def456",
    currentCid: "def456",
    changed: false,
  };

  const mockChangedRemixContent: RemixContent = {
    ...mockRemixContent,
    changed: true,
    currentCid: "ghi789",
  };

  const mockDirectRemix: ActivityRemixItem = {
    originContent: mockOriginContent,
    remixContent: mockRemixContent,
    withLicenseCode: "CCDUAL",
    directCopy: true,
  };

  const mockIndirectRemix: ActivityRemixItem = {
    originContent: mockOriginContent,
    remixContent: {
      ...mockRemixContent,
      contentId: "remix-2" as any,
      name: "Indirectly Remixed Activity",
    },
    withLicenseCode: "CCBYNCSA",
    directCopy: false,
  };

  const mockChangedRemix: ActivityRemixItem = {
    originContent: mockOriginContent,
    remixContent: mockChangedRemixContent,
    withLicenseCode: null,
    directCopy: false,
  };

  it("renders empty state when no remixes", () => {
    cy.mount(<Remixes remixes={[]} />);

    cy.contains("No visible remixes of this activity (yet!)").should(
      "be.visible",
    );
    cy.checkAccessibility("body");
  });

  it("no headings when just direct remixes", () => {
    cy.mount(<Remixes remixes={[mockDirectRemix]} />);

    cy.contains("Direct remixes").should("not.exist");
    cy.contains("Remixed Activity").should("be.visible");
    cy.contains("John Doe").should("be.visible");
    cy.contains("CCDUAL").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders direct remixes table", () => {
    cy.mount(<Remixes remixes={[mockDirectRemix, mockIndirectRemix]} />);

    cy.contains("Direct remixes").should("be.visible");
    cy.contains("Remixed Activity").should("be.visible");
    cy.contains("John Doe").should("be.visible");
    cy.contains("CCDUAL").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders indirect remixes table", () => {
    cy.mount(<Remixes remixes={[mockIndirectRemix]} />);

    cy.contains("Other remixes").should("be.visible");
    cy.contains("Indirectly Remixed Activity").should("be.visible");
    cy.contains("John Doe").should("be.visible");
    cy.contains("CCBYNCSA").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders both direct and indirect remixes", () => {
    cy.mount(<Remixes remixes={[mockDirectRemix, mockIndirectRemix]} />);

    cy.contains("Direct remixes").should("be.visible");
    cy.contains("Other remixes").should("be.visible");
    cy.contains("Remixed Activity").should("be.visible");
    cy.contains("Indirectly Remixed Activity").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("shows changed indicator for remixes with changes", () => {
    cy.mount(<Remixes remixes={[mockChangedRemix]} />);

    cy.contains("Other remixes").should("be.visible");
    cy.get('[data-test="Remix 1"]').within(() => {
      cy.contains("🔴").should("be.visible");
    });
    cy.checkAccessibility("body");
  });

  it("renders multiple remixes in same category", () => {
    const multipleRemixes = [mockDirectRemix, mockChangedRemix];

    cy.mount(<Remixes remixes={multipleRemixes} />);

    cy.contains("Other remixes").should("be.visible");
    cy.get('[data-test="Remix 1"]').should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders compare button for remixes", () => {
    cy.mount(<Remixes remixes={[mockDirectRemix]} />);

    cy.contains("Compare").should("be.visible");
    cy.checkAccessibility("body");
  });
});
