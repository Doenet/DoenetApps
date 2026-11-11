import CardList from "./CardList";
import { CardContent } from "./Card";
import { ContentCard, DoenetmlVersion, License, UserInfo } from "../types";

describe("CardList description button", { tags: ["@group3"] }, () => {
  const owner: UserInfo = {
    userId: "owner-123" as any,
    firstNames: "Test",
    lastNames: "Owner",
  };

  const doenetmlVersion: DoenetmlVersion = {
    id: 1,
    displayedVersion: "0.7",
    fullVersion: "0.7.0",
    default: true,
    deprecated: false,
    removed: false,
    deprecationMessage: "",
  };

  const licenses: License[] = [
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
  ];

  function makeCard(
    contentId: string,
    name: string,
    type: "singleDoc" | "folder" = "singleDoc",
  ): CardContent {
    const content = {
      type,
      contentId,
      ownerId: owner.userId,
      name,
      isPublic: true,
      visibility: "public",
      isShared: false,
      sharedWith: [],
      licenseCode: "CCBY",
      categories: [],
      classifications: [],
      parent: null,
      numVariants: 1,
      doenetmlVersion,
      owner,
    } as unknown as ContentCard;
    return {
      contentId,
      content,
      ownerName: "Test Owner",
      ownerAvatarName: "Test Owner",
      cardLink: `/activityViewer/${contentId}`,
    } as CardContent & { contentId: string };
  }

  const cards = [
    makeCard("activity-1", "Short title"),
    makeCard(
      "activity-2",
      "A much longer activity title that will need to be truncated",
    ),
    makeCard("folder-1", "A folder", "folder"),
  ];

  function mountList(showDescriptionButton: boolean) {
    cy.mount(
      <CardList
        cardContent={cards}
        showOwnerName={true}
        showActivityCategories={true}
        showDescriptionButton={showDescriptionButton}
        emptyMessage="No Matches Found!"
      />,
      {
        outletContext: {
          user: undefined,
          setAddTo: () => {},
          allLicenses: licenses,
        },
      },
    );
  }

  beforeEach(() => {
    cy.intercept("GET", "**/api/info/getContentDetails/**", {
      statusCode: 200,
      body: { description: "What this activity covers." },
    }).as("getContentDetails");
  });

  it("puts the info button immediately left of the title, outside the link", () => {
    mountList(true);

    cy.get('[data-test="Content Card"]')
      .eq(0)
      .within(() => {
        cy.get('[data-test="Description Info Button"]').then(($button) => {
          // Not inside any link
          expect($button.closest("a").length).eq(0);

          // Immediately before the title link
          const $mainLink = $button.parent().next("a");
          expect($mainLink.text()).to.contain("Short title");
          expect($mainLink.attr("aria-hidden")).eq(undefined);
        });

        // The icon-only duplicate link is hidden from keyboard/screen readers
        cy.get('a[aria-hidden="true"]')
          .should("have.attr", "tabindex", "-1")
          .and("not.contain.text", "Short title");
      });

    cy.checkAccessibility("body");
  });

  it("does not show the button for folders", () => {
    mountList(true);
    cy.get('[data-test="Content Card"]')
      .eq(2)
      .find('[data-test="Description Info Button"]')
      .should("not.exist");
  });

  it("opens the description without following the card's link", () => {
    mountList(true);

    cy.get('[data-test="Description Info Button"]').first().click();
    cy.wait("@getContentDetails");
    cy.get('[data-test="Description Popover"]')
      .should("be.visible")
      .and("contain.text", "What this activity covers.");

    // Still on the list, not navigated to the activity
    cy.get('[data-test="Content Card"]').should("have.length", 3);
  });

  it("keeps the single-link layout when the button is off", () => {
    mountList(false);
    cy.get('[data-test="Description Info Button"]').should("not.exist");
    cy.get('a[aria-hidden="true"]').should("not.exist");
    cy.get('[data-test="Content Card"]')
      .eq(0)
      .find("a")
      .should("have.length", 1);
  });
});
