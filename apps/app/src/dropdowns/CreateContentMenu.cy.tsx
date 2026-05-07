import { CreateContentMenu } from "./CreateContentMenu";
import { ContentDescription, UserInfo } from "../types";

describe("CreateContentMenu", { tags: ["@group1"] }, () => {
  const mockUser: UserInfo = {
    userId: "user-123" as any,
    firstNames: "Test",
    lastNames: "User",
  };

  const mockContent: ContentDescription[] = [
    {
      contentId: "content-1" as any,
      name: "Test Activity",
      type: "singleDoc",
      parent: null,
    },
  ];

  const mockSequenceContent: ContentDescription[] = [
    {
      contentId: "sequence-1" as any,
      name: "Test Problem Set",
      type: "sequence",
      parent: null,
    },
  ];

  let mockNavigate: any;
  let mockCreateFetcher: any;
  let mockSaveNameFetcher: any;

  beforeEach(() => {
    mockNavigate = cy.stub();
    mockCreateFetcher = {
      submit: cy.stub(),
    };
    mockSaveNameFetcher = {
      submit: cy.stub(),
    };
  });

  it("renders menu button with label", () => {
    cy.mount(
      <CreateContentMenu
        sourceContent={mockContent}
        label="Create Content"
        user={mockUser}
        navigate={mockNavigate}
        createFetcher={mockCreateFetcher}
        saveNameFetcher={mockSaveNameFetcher}
      />,
    );

    cy.get("[data-test='Create From Selected Button']").should("be.visible");
    cy.contains("Create Content").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("opens menu when button is clicked", () => {
    cy.mount(
      <CreateContentMenu
        sourceContent={mockContent}
        label="Create Content"
        user={mockUser}
        navigate={mockNavigate}
        createFetcher={mockCreateFetcher}
        saveNameFetcher={mockSaveNameFetcher}
      />,
    );

    cy.get("[data-test='Create From Selected Button']").click();
    cy.get("[data-test='Create Problem Set']").should("be.visible");
    cy.get("[data-test='Create Folder']").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("enables Problem Set when allowed parents include sequence", () => {
    cy.mount(
      <CreateContentMenu
        sourceContent={mockContent}
        label="Create Content"
        user={mockUser}
        navigate={mockNavigate}
        createFetcher={mockCreateFetcher}
        saveNameFetcher={mockSaveNameFetcher}
        followAllowedParents={false}
      />,
    );

    cy.get("[data-test='Create From Selected Button']").click();
    cy.get("[data-test='Create Problem Set']").should("not.be.disabled");
    cy.checkAccessibility("body");
  });

  it("disables Problem Set when followAllowedParents is true and sequence not allowed", () => {
    cy.mount(
      <CreateContentMenu
        sourceContent={mockSequenceContent}
        label="Create Content"
        user={mockUser}
        navigate={mockNavigate}
        createFetcher={mockCreateFetcher}
        saveNameFetcher={mockSaveNameFetcher}
        followAllowedParents={true}
      />,
    );

    cy.get("[data-test='Create From Selected Button']").click();
    cy.get("[data-test='Create Problem Set']").should("be.disabled");
    cy.checkAccessibility("body");
  });

  it("always enables Folder menu item", () => {
    cy.mount(
      <CreateContentMenu
        sourceContent={mockSequenceContent}
        label="Create Content"
        user={mockUser}
        navigate={mockNavigate}
        createFetcher={mockCreateFetcher}
        saveNameFetcher={mockSaveNameFetcher}
        followAllowedParents={true}
      />,
    );

    cy.get("[data-test='Create From Selected Button']").click();
    cy.get("[data-test='Create Folder']").should("not.be.disabled");
    cy.checkAccessibility("body");
  });

  it("handles multiple content items", () => {
    const multipleContent: ContentDescription[] = [
      {
        contentId: "content-1" as any,
        name: "Activity 1",
        type: "singleDoc",
        parent: null,
      },
      {
        contentId: "content-2" as any,
        name: "Activity 2",
        type: "singleDoc",
        parent: null,
      },
    ];

    cy.mount(
      <CreateContentMenu
        sourceContent={multipleContent}
        label="Create Content"
        user={mockUser}
        navigate={mockNavigate}
        createFetcher={mockCreateFetcher}
        saveNameFetcher={mockSaveNameFetcher}
      />,
    );

    cy.get("[data-test='Create From Selected Button']").click();
    cy.get("[data-test='Create Problem Set']").should("be.visible");
    cy.get("[data-test='Create Folder']").should("be.visible");
    cy.checkAccessibility("body");
  });
});
