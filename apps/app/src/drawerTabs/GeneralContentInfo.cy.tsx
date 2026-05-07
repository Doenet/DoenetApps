import { GeneralContentInfo } from "./GeneralContentInfo";
import { Content, License } from "../types";

describe("GeneralContentInfo", { tags: ["@group1"] }, () => {
  const mockLicense: License = {
    code: "CCDUAL",
    name: "CC Dual",
    description: "CC Dual License",
    imageURL: null,
    smallImageURL: null,
    licenseURL: "https://example.com",
    isComposition: false,
    composedOf: [],
  };

  const mockCompositionLicense: License = {
    code: "CCBYSA",
    name: "CC BY-SA",
    description: "CC BY-SA License",
    imageURL: null,
    smallImageURL: null,
    licenseURL: "https://example.com",
    isComposition: true,
    composedOf: [
      {
        code: "CCDUAL",
        name: "CC Dual",
        description: "CC Dual License",
        imageURL: null,
        smallImageURL: null,
        licenseURL: "https://example.com",
      },
      {
        code: "CCBYNCSA",
        name: "CC BY-NC-SA",
        description: "CC BY-NC-SA License",
        imageURL: null,
        smallImageURL: null,
        licenseURL: "https://example.com",
      },
    ],
  };

  const mockActivityWithCategories: Content = {
    contentId: "activity-1" as any,
    ownerId: "owner-1" as any,
    name: "Test Activity",
    isPublic: true,
    visibility: "public",
    isShared: false,
    sharedWith: [],
    licenseCode: "CCDUAL",
    categories: [
      {
        id: 1,
        code: "isQuestion",
        term: "Question",
        description: "This is a question",
        sortIndex: 1,
      },
      {
        id: 2,
        code: "isInteractive",
        term: "Interactive",
        description: "This is interactive",
        sortIndex: 2,
      },
    ],
    classifications: [],
    parent: null,
    owner: {
      userId: "owner-1" as any,
      firstNames: "Jane",
      lastNames: "Smith",
    },
    type: "singleDoc",
    numVariants: 1,
    doenetML: "<doenetML></doenetML>",
    doenetmlVersion: {
      id: 1,
      displayedVersion: "0.7.0",
      fullVersion: "0.7.0",
      default: true,
      deprecated: false,
      removed: false,
      deprecationMessage: "Not deprecated",
    },
  };

  const mockActivityNoLicense: Content = {
    ...mockActivityWithCategories,
    licenseCode: null,
  };

  const mockActivityWithVariants: Content = {
    ...mockActivityWithCategories,
    numVariants: 5,
  };

  const mockFolder: Content = {
    contentId: "folder-1" as any,
    ownerId: "owner-1" as any,
    name: "Test Folder",
    isPublic: true,
    visibility: "public",
    isShared: false,
    sharedWith: [],
    licenseCode: "CCDUAL",
    categories: [],
    classifications: [],
    parent: null,
    owner: {
      userId: "owner-1" as any,
      firstNames: "Jane",
      lastNames: "Smith",
    },
    type: "folder",
    children: [],
  };

  it("renders activity categories for activity", () => {
    cy.mount(
      <GeneralContentInfo
        contentData={mockActivityWithCategories}
        allLicenses={[mockLicense]}
      />,
    );

    cy.contains("Activity categories").should("be.visible");
    cy.contains("Question").should("be.visible");
    cy.contains("Interactive").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders license information for single license", () => {
    cy.mount(
      <GeneralContentInfo
        contentData={mockActivityWithCategories}
        allLicenses={[mockLicense]}
      />,
    );

    cy.contains("Test Activity").should("be.visible");
    cy.contains("Jane Smith").should("be.visible");
    cy.contains("is shared with the license").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders warning for content without license", () => {
    cy.mount(
      <GeneralContentInfo
        contentData={mockActivityNoLicense}
        allLicenses={[mockLicense]}
      />,
    );

    cy.contains("Activity is shared without specifying a license").should(
      "be.visible",
    );
    cy.checkAccessibility("body");
  });

  it("renders composition license information", () => {
    const activityWithCompositionLicense: Content = {
      ...mockActivityWithCategories,
      licenseCode: "CCBYSA",
    };

    cy.mount(
      <GeneralContentInfo
        contentData={activityWithCompositionLicense}
        allLicenses={[mockCompositionLicense]}
      />,
    );

    cy.contains("is shared with these licenses").should("be.visible");
    cy.contains("either of these licenses when reusing").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders variant count", () => {
    cy.mount(
      <GeneralContentInfo
        contentData={mockActivityWithVariants}
        allLicenses={[mockLicense]}
      />,
    );

    cy.contains("This document has 5 variants").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders DoenetML version for single document", () => {
    cy.mount(
      <GeneralContentInfo
        contentData={mockActivityWithCategories}
        allLicenses={[mockLicense]}
      />,
    );

    cy.contains("DoenetML version: 0.7.0").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("does not render DoenetML version for folder", () => {
    cy.mount(
      <GeneralContentInfo
        contentData={mockFolder}
        allLicenses={[mockLicense]}
      />,
    );

    cy.contains("DoenetML version").should("not.exist");
    cy.checkAccessibility("body");
  });
});
