import { ContentInfoDrawer } from "./ContentInfoDrawer";
import { Content, Doc, DoenetmlVersion, License, UserInfo } from "../types";

describe("ContentInfoDrawer", { tags: ["@group1"] }, () => {
  const mockOwner: UserInfo = {
    userId: "owner-123" as any,
    firstNames: "Test",
    lastNames: "Owner",
  };

  const mockDoenetmlVersion: DoenetmlVersion = {
    id: 1,
    displayedVersion: "0.6",
    fullVersion: "0.6.0",
    default: true,
    deprecated: false,
    removed: false,
    deprecationMessage: "",
  };

  const mockActivity: Doc = {
    type: "singleDoc",
    contentId: "activity-123" as any,
    ownerId: "owner-123" as any,
    name: "Test Activity",
    isPublic: true,
    visibility: "public",
    isShared: false,
    sharedWith: [],
    licenseCode: "CCBY" as any,
    categories: [],
    classifications: [],
    parent: null,
    numVariants: 1,
    doenetML: "<document></document>",
    doenetmlVersion: mockDoenetmlVersion,
    owner: mockOwner,
  };

  const mockFolder: Content = {
    type: "folder",
    contentId: "folder-123" as any,
    ownerId: "owner-123" as any,
    name: "Test Folder",
    isPublic: true,
    visibility: "public",
    isShared: false,
    sharedWith: [],
    licenseCode: "CCBY" as any,
    categories: [],
    classifications: [],
    parent: null,
    revisionNum: 1,
    children: [],
    owner: mockOwner,
  };

  const mockLicenses: License[] = [
    {
      code: "CCBY" as any,
      name: "Creative Commons Attribution",
      description: "You are free to use this work",
      imageURL: null,
      smallImageURL: null,
      licenseURL: null,
      isComposition: false,
      composedOf: [],
    },
    {
      code: "CCBYSA" as any,
      name: "Creative Commons Attribution-ShareAlike",
      description: "You are free to use and share this work",
      imageURL: null,
      smallImageURL: null,
      licenseURL: null,
      isComposition: false,
      composedOf: [],
    },
  ];

  beforeEach(() => {
    // Stub remix endpoints with explicit path matching to prevent Vite proxy errors in CI
    cy.intercept("GET", "**/api/remix/getRemixSources/**", {
      statusCode: 200,
      body: { remixSources: [] },
    }).as("getRemixSources");

    cy.intercept("GET", "**/api/remix/getRemixes/**", {
      statusCode: 200,
      body: { remixes: [] },
    }).as("getRemixes");
  });

  function mountActivityDrawer({
    contentData = mockActivity,
    displayTab,
  }: {
    contentData?: Doc;
    displayTab?: "general" | "classifications";
  } = {}) {
    cy.mount(
      <ContentInfoDrawer
        isOpen={true}
        onClose={cy.stub()}
        contentData={contentData}
        displayTab={displayTab}
        allLicenses={mockLicenses}
      />,
    );

    cy.wait("@getRemixSources").its("response.statusCode").should("eq", 200);
    cy.wait("@getRemixes").its("response.statusCode").should("eq", 200);
  }

  it("renders drawer header with activity information", () => {
    mountActivityDrawer();

    cy.contains("Activity Information").should("be.visible");
    cy.contains("Test Activity").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders drawer header with folder information", () => {
    cy.mount(
      <ContentInfoDrawer
        isOpen={true}
        onClose={cy.stub()}
        contentData={mockFolder}
        allLicenses={mockLicenses}
      />,
    );

    cy.contains("Folder Information").should("be.visible");
    cy.contains("Test Folder").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("displays close button", () => {
    mountActivityDrawer();

    cy.get("[data-test='Close Settings Button']").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders General tab for activity", () => {
    mountActivityDrawer();

    cy.get("[data-test='General Tab']").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders General tab for folder", () => {
    cy.mount(
      <ContentInfoDrawer
        isOpen={true}
        onClose={cy.stub()}
        contentData={mockFolder}
        allLicenses={mockLicenses}
      />,
    );

    cy.get("[data-test='General Tab']").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("displays Classifications tab only for activities", () => {
    mountActivityDrawer();

    cy.get("[data-test='Classifications']").should("be.visible");
    cy.contains("Classifications").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("does not display Classifications tab for folders", () => {
    cy.mount(
      <ContentInfoDrawer
        isOpen={true}
        onClose={cy.stub()}
        contentData={mockFolder}
        allLicenses={mockLicenses}
      />,
    );

    cy.get("[data-test='Classifications']").should("not.exist");
    cy.checkAccessibility("body");
  });

  it("displays Remix Sources tab for activities", () => {
    mountActivityDrawer();

    cy.get("[data-test='Remix Sources Tab']").should("be.visible");
    cy.contains("Remix Sources").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("does not display Remix Sources tab for folders", () => {
    cy.mount(
      <ContentInfoDrawer
        isOpen={true}
        onClose={cy.stub()}
        contentData={mockFolder}
        allLicenses={mockLicenses}
      />,
    );

    cy.get("[data-test='Remix Sources Tab']").should("not.exist");
    cy.checkAccessibility("body");
  });

  it("displays Remixes tab for activities", () => {
    mountActivityDrawer();

    cy.get("[data-test='Remixes Tab']").should("be.visible");
    cy.contains("Remixes").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("does not display Remixes tab for folders", () => {
    cy.mount(
      <ContentInfoDrawer
        isOpen={true}
        onClose={cy.stub()}
        contentData={mockFolder}
        allLicenses={mockLicenses}
      />,
    );

    cy.get("[data-test='Remixes Tab']").should("not.exist");
    cy.checkAccessibility("body");
  });

  it("starts with General tab selected by default", () => {
    mountActivityDrawer();

    cy.get("[data-test='General Tab']").should(
      "have.attr",
      "aria-selected",
      "true",
    );
    cy.checkAccessibility("body");
  });

  it("starts with Classifications tab when displayTab is set", () => {
    mountActivityDrawer({ displayTab: "classifications" });

    cy.get("[data-test='Classifications']").should(
      "have.attr",
      "aria-selected",
      "true",
    );
    cy.checkAccessibility("body");
  });

  it("switches tabs when clicked", () => {
    mountActivityDrawer();

    cy.get("[data-test='General Tab']").should(
      "have.attr",
      "aria-selected",
      "true",
    );
    cy.get("[data-test='Classifications']").click();
    cy.get("[data-test='Classifications']").should(
      "have.attr",
      "aria-selected",
      "true",
    );
    cy.checkAccessibility("body");
  });

  it("does not render when isOpen is false", () => {
    cy.mount(
      <ContentInfoDrawer
        isOpen={false}
        onClose={cy.stub()}
        contentData={mockActivity}
        allLicenses={mockLicenses}
      />,
    );

    cy.get("[data-test='Close Settings Button']").should("not.exist");
  });

  it("renders with activity having classifications", () => {
    const activityWithClassifications: Doc = {
      ...mockActivity,
      classifications: [
        {
          id: 1,
          code: "AC",
          descriptions: [
            {
              description: "An activity",
              sortIndex: 1,
              subCategory: {
                id: 1,
                subCategory: "Sub",
                sortIndex: 1,
                category: {
                  id: 1,
                  category: "Category",
                  system: {
                    id: 1,
                    name: "System",
                    shortName: "Sys",
                    categoryLabel: "Category",
                    subCategoryLabel: "Sub",
                    descriptionLabel: "Desc",
                    categoriesInDescription: false,
                    type: "test",
                  },
                },
              },
            },
          ],
        },
      ],
    };

    mountActivityDrawer({ contentData: activityWithClassifications });

    cy.contains("Classifications (1)").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("displays long activity names with tooltip truncation", () => {
    const activityWithLongName: Doc = {
      ...mockActivity,
      name: "This is a very long activity name that should be truncated in the header",
    };

    mountActivityDrawer({ contentData: activityWithLongName });

    cy.contains(
      "This is a very long activity name that should be truncated in the header",
    ).should("be.visible");
    cy.checkAccessibility("body");
  });

  it("handles content with parent", () => {
    const contentWithParent: Doc = {
      ...mockActivity,
      parent: {
        contentId: "parent-123" as any,
        name: "Parent Activity",
        type: "sequence",
        isPublic: true,
        visibility: "public",
        isShared: false,
        sharedWith: [],
      },
    };

    mountActivityDrawer({ contentData: contentWithParent });

    cy.contains("Activity Information").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("displays correct tab count for Classifications with zero classifications", () => {
    const activityNoClassifications: Doc = {
      ...mockActivity,
      classifications: [],
    };

    mountActivityDrawer({ contentData: activityNoClassifications });

    cy.contains("Classifications (0)").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders with multiple tabs accessible", () => {
    mountActivityDrawer();

    // Verify all tabs are accessible
    cy.get("[data-test='General Tab']").should("exist");
    cy.get("[data-test='Classifications']").should("exist");
    cy.get("[data-test='Remix Sources Tab']").should("exist");
    cy.get("[data-test='Remixes Tab']").should("exist");
    cy.checkAccessibility("body");
  });

  it("displays with shared content", () => {
    const sharedContent: Doc = {
      ...mockActivity,
      isShared: true,
      sharedWith: [
        {
          userId: "user-456" as any,
          firstNames: "John",
          lastNames: "Doe",
          email: "john@example.com",
        },
      ],
    };

    mountActivityDrawer({ contentData: sharedContent });

    cy.contains("Activity Information").should("be.visible");
    cy.checkAccessibility("body");
  });
});
