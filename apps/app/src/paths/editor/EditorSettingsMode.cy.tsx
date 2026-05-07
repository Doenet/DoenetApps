import { EditorSettingsModeComponent } from "./EditorSettingsMode";
import {
  AssignmentMode,
  ContentClassification,
  DoenetmlVersion,
  LicenseCode,
} from "../../types";
import { Category, CategoryGroup } from "@doenet-tools/shared";
import { FetcherWithComponents } from "react-router";

describe("EditorSettingsModeComponent", { tags: ["@group1"] }, () => {
  function createMockFetcher() {
    return {
      state: "idle",
      formData: undefined,
      data: undefined,
      Form: ({ children }: any) => <form>{children}</form>,
      submit: cy.stub(),
      load: () => {},
    } as unknown as FetcherWithComponents<any>;
  }

  beforeEach(() => {
    // Mock the classifications API to prevent ECONNREFUSED errors
    cy.intercept("GET", "/api/classifications/getClassificationCategories", {
      statusCode: 200,
      body: [],
    }).as("getClassificationCategories");
    cy.intercept("GET", "/api/classifications/searchPossibleClassifications*", {
      statusCode: 200,
      body: [],
    }).as("searchClassifications");
  });

  const mockDoenetmlVersions: DoenetmlVersion[] = [
    {
      id: 1,
      displayedVersion: "0.6",
      fullVersion: "0.6.0",
      default: false,
      deprecated: false,
      removed: false,
      deprecationMessage: "",
    },
    {
      id: 2,
      displayedVersion: "0.7",
      fullVersion: "0.7.0",
      default: true,
      deprecated: false,
      removed: false,
      deprecationMessage: "",
    },
  ];

  const mockLicenses = [
    {
      code: "CCBYSA",
      name: "Creative Commons Attribution-ShareAlike",
      description: "You are free to share and adapt the work",
      imageURL: null,
      smallImageURL: null,
      licenseURL: null,
      isComposition: false,
      composedOf: [],
    },
  ];

  const mockCategories: CategoryGroup[] = [
    {
      name: "Question Type",
      isRequired: false,
      isExclusive: true,
      categories: [
        {
          code: "isQuestion",
          term: "Question",
          description: "This is a question",
        },
      ],
    },
  ];

  const getDefaultProps = () => ({
    isPublic: false,
    isShared: false,
    assigned: false,
    mode: "formative" as AssignmentMode,
    maxAttempts: 3,
    individualizeByStudent: false,
    licenseCode: "CCBYSA" as LicenseCode,
    categories: [] as Category[],
    classifications: [] as ContentClassification[],
    remixSourceLicenseCode: null,
    allCategories: mockCategories,
    contentId: "test-content-123",
    allLicenses: mockLicenses,
    allDoenetmlVersions: mockDoenetmlVersions,
    inLibrary: false,
    contentType: "activity",
    headerHeight: "80px",
    showRequired: false,
    maxAttemptsFetcher: createMockFetcher(),
    variantFetcher: createMockFetcher(),
    modeFetcher: createMockFetcher(),
    deleteClassificationFetcher: createMockFetcher(),
    addClassificationFetcher: createMockFetcher(),
  });

  it("renders correctly and is accessible", () => {
    cy.mount(<EditorSettingsModeComponent {...getDefaultProps()} />);

    // Verify main sections are present
    cy.contains("h2", "Assignment").should("be.visible");
    cy.contains("h2", "Classifications").should("be.visible");
    cy.contains("h2", "Licensing").should("be.visible");

    // Check accessibility
    cy.checkAccessibility("body");
  });

  it("is accessible with doenetmlVersionId", () => {
    cy.mount(
      <EditorSettingsModeComponent
        {...getDefaultProps()}
        doenetmlVersionId={1}
      />,
    );

    cy.contains("h2", "Version").should("be.visible");
    cy.contains("Use DoenetML version").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible with deprecated version showing upgrade section", () => {
    const deprecatedVersion: DoenetmlVersion = {
      id: 1,
      displayedVersion: "0.6",
      fullVersion: "0.6.0",
      default: false,
      deprecated: true,
      removed: false,
      deprecationMessage: "Version 0.6 is deprecated",
    };

    cy.mount(
      <EditorSettingsModeComponent
        {...getDefaultProps()}
        doenetmlVersionId={1}
        allDoenetmlVersions={[deprecatedVersion, mockDoenetmlVersions[1]]}
      />,
    );

    cy.contains("h2", "Upgrade document to version 0.7 syntax").should(
      "be.visible",
    );
    cy.contains("button", "Upgrade to version 0.7").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible when in library showing AuthorLicenseBox", () => {
    cy.mount(
      <EditorSettingsModeComponent {...getDefaultProps()} inLibrary={true} />,
    );

    cy.contains("This document will be shared using the license:").should(
      "be.visible",
    );
    cy.contains("Creative Commons Attribution-ShareAlike").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible when not in library showing EditLicense", () => {
    cy.mount(
      <EditorSettingsModeComponent {...getDefaultProps()} inLibrary={false} />,
    );

    cy.contains(
      "This document will be shared under the following license(s)",
    ).should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible when content is assigned", () => {
    cy.mount(
      <EditorSettingsModeComponent {...getDefaultProps()} assigned={true} />,
    );

    // Assignment settings should reflect assigned status
    cy.contains("Allow unlimited attempts").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible when content is public and shared", () => {
    cy.mount(
      <EditorSettingsModeComponent
        {...getDefaultProps()}
        isPublic={true}
        isShared={true}
      />,
    );

    cy.contains("h2", "Licensing").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible with all sections visible", () => {
    cy.mount(
      <EditorSettingsModeComponent
        {...getDefaultProps()}
        doenetmlVersionId={1}
        isPublic={true}
        inLibrary={false}
      />,
    );

    // All main sections should be visible
    cy.contains("h2", "Assignment").should("be.visible");
    cy.contains("h2", "Classifications").should("be.visible");
    cy.contains("h2", "Licensing").should("be.visible");
    cy.contains("h2", "Version").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible with single doc content type", () => {
    cy.mount(
      <EditorSettingsModeComponent
        {...getDefaultProps()}
        contentType="singleDoc"
      />,
    );

    // EditAssignmentSettings should not include mode selection for single docs
    cy.contains("Assignment mode").should("not.exist");

    cy.checkAccessibility("body");
  });

  it("is accessible with summative mode", () => {
    cy.mount(
      <EditorSettingsModeComponent {...getDefaultProps()} mode="summative" />,
    );

    cy.contains(
      "Assign the same variant of this activity to all students",
    ).should("be.visible");

    cy.checkAccessibility("body");
  });
});
