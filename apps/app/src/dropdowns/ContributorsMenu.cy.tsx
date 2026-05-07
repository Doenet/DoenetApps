import ContributorsMenu from "./ContributorsMenu";
import { ActivityRemixItem, UserInfo, Doc, RemixContent } from "../types";

describe("ContributorsMenu", { tags: ["@group1"] }, () => {
  const mockOwner: UserInfo = {
    userId: "550e8400-e29b-41d4-a716-446655440000" as any,
    firstNames: "John",
    lastNames: "Doe",
  };

  const mockActivity: Doc = {
    type: "singleDoc",
    contentId: "activity-123" as any,
    ownerId: "owner-123" as any,
    name: "Sample Activity",
    owner: mockOwner,
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
    doenetmlVersion: {
      id: 1,
      displayedVersion: "0.6",
      fullVersion: "0.6.0",
      default: true,
      deprecated: false,
      removed: false,
      deprecationMessage: "",
    },
  };

  const mockContributor1: UserInfo = {
    userId: "contributor-1" as any,
    firstNames: "Jane",
    lastNames: "Smith",
  };

  const mockContributor2: UserInfo = {
    userId: "contributor-2" as any,
    firstNames: "Bob",
    lastNames: "Johnson",
  };

  const mockOriginContent1: RemixContent = {
    contentId: "origin-1" as any,
    revisionNum: 1,
    timestamp: "2024-01-01T00:00:00Z",
    name: "Original Activity",
    owner: mockContributor1,
    cidAtLastUpdate: "cid1",
    currentCid: "cid1",
    changed: false,
  };

  const mockOriginContent2: RemixContent = {
    contentId: "origin-2" as any,
    revisionNum: 2,
    timestamp: "2024-01-05T00:00:00Z",
    name: "Another Activity",
    owner: mockContributor2,
    cidAtLastUpdate: "cid2",
    currentCid: "cid2",
    changed: false,
  };

  const mockRemixHistory1: ActivityRemixItem = {
    originContent: mockOriginContent1,
    remixContent: {
      contentId: "remix-1" as any,
      revisionNum: 1,
      timestamp: "2024-01-10T00:00:00Z",
      name: "Original Activity",
      owner: mockContributor1,
      cidAtLastUpdate: "cid1",
      currentCid: "cid1",
      changed: false,
    },
    withLicenseCode: "CCBY" as any,
    directCopy: false,
  };

  const mockRemixHistory2: ActivityRemixItem = {
    originContent: mockOriginContent2,
    remixContent: {
      contentId: "remix-2" as any,
      revisionNum: 1,
      timestamp: "2024-01-05T00:00:00Z",
      name: "Another Activity",
      owner: mockContributor2,
      cidAtLastUpdate: "cid2",
      currentCid: "cid2",
      changed: false,
    },
    withLicenseCode: "CCBY" as any,
    directCopy: false,
  };

  it("returns null when activity has no owner", () => {
    const activityWithoutOwner: Doc = {
      ...mockActivity,
      owner: undefined,
    };

    cy.mount(
      <ContributorsMenu
        contributorHistory={[]}
        activity={activityWithoutOwner}
      />,
    );

    cy.get("[data-test='contributors menu']").should("not.exist");
  });

  it("renders contributors menu with owner only", () => {
    cy.mount(
      <ContributorsMenu contributorHistory={[]} activity={mockActivity} />,
    );

    cy.get("[data-test='contributors menu']").should("be.visible");
    cy.get("[data-test='info on contributors']").should("be.visible");
    cy.get("[data-test='info on contributors']")
      .contains("by John Doe")
      .should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders contributor history when present", () => {
    cy.mount(
      <ContributorsMenu
        contributorHistory={[mockRemixHistory1]}
        activity={mockActivity}
      />,
    );

    cy.contains("remixed from").should("be.visible");
    cy.get("[data-test='info on contributors']")
      .contains("Original Activity by Jane Smith")
      .should("be.visible");
    cy.checkAccessibility("body");
  });

  it("opens menu when clicked", () => {
    cy.mount(
      <ContributorsMenu contributorHistory={[]} activity={mockActivity} />,
    );

    cy.get("[data-test='contributors menu']").click();
    cy.get("[data-test='contributors menu item author']").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("displays author menu item with activity name and owner", () => {
    cy.mount(
      <ContributorsMenu contributorHistory={[]} activity={mockActivity} />,
    );

    cy.get("[data-test='contributors menu']").click();
    cy.get("[data-test='contributors menu item author']").should("be.visible");
    cy.get("[data-test='contributors menu item author']")
      .contains("Sample Activity")
      .should("be.visible");
    cy.get("[data-test='contributors menu item author']")
      .contains("by John Doe")
      .should("be.visible");
    cy.checkAccessibility("body");
  });

  it("displays contributor menu items when history exists", () => {
    cy.mount(
      <ContributorsMenu
        contributorHistory={[mockRemixHistory1, mockRemixHistory2]}
        activity={mockActivity}
      />,
    );

    cy.get("[data-test='contributors menu']").click();
    cy.get("[data-test='contributors menu item 0']").should("be.visible");
    cy.get("[data-test='contributors menu item 1']").should("be.visible");
    cy.contains("Original Activity by Jane Smith").should("be.visible");
    cy.contains("Another Activity by Bob Johnson").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("displays ellipsis when more than 2 contributors in history", () => {
    const mockContributor3: UserInfo = {
      userId: "contributor-3" as any,
      firstNames: "Alice",
      lastNames: "Brown",
    };

    const mockOriginContent3: RemixContent = {
      contentId: "origin-3" as any,
      revisionNum: 3,
      timestamp: "2024-01-02T00:00:00Z",
      name: "Third Activity",
      owner: mockContributor3,
      cidAtLastUpdate: "cid3",
      currentCid: "cid3",
      changed: false,
    };

    const mockRemixHistory3: ActivityRemixItem = {
      originContent: mockOriginContent3,
      remixContent: {
        contentId: "remix-3" as any,
        revisionNum: 1,
        timestamp: "2024-01-02T00:00:00Z",
        name: "Third Activity",
        owner: mockContributor3,
        cidAtLastUpdate: "cid3",
        currentCid: "cid3",
        changed: false,
      },
      withLicenseCode: "CCBY" as any,
      directCopy: false,
    };

    cy.mount(
      <ContributorsMenu
        contributorHistory={[
          mockRemixHistory1,
          mockRemixHistory2,
          mockRemixHistory3,
        ]}
        activity={mockActivity}
      />,
    );

    cy.contains(", ...").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("does not display ellipsis with exactly 2 contributors", () => {
    cy.mount(
      <ContributorsMenu
        contributorHistory={[mockRemixHistory1, mockRemixHistory2]}
        activity={mockActivity}
      />,
    );

    cy.contains(", ...").should("not.exist");
    cy.checkAccessibility("body");
  });

  it("renders avatars for owner and contributors", () => {
    cy.mount(
      <ContributorsMenu
        contributorHistory={[mockRemixHistory1]}
        activity={mockActivity}
      />,
    );

    // AvatarGroup should be visible with avatars
    cy.get("[role='img']").should("have.length.at.least", 2);
    cy.checkAccessibility("body");
  });

  it("truncates long activity names in menu", () => {
    const longNameActivity: Doc = {
      ...mockActivity,
      name: "This is a very long activity name that should be truncated because it exceeds the maximum width allowed",
    };

    cy.mount(
      <ContributorsMenu contributorHistory={[]} activity={longNameActivity} />,
    );

    cy.get("[data-test='contributors menu']").click();
    cy.contains(
      "This is a very long activity name that should be truncated because it exceeds the maximum width allowed",
    ).should("be.visible");
    cy.checkAccessibility("body");
  });
});
