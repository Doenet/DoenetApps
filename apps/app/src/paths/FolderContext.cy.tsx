import { FolderContext } from "./FolderContext";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { SiteContext } from "./SiteHeader";

const TEST_USER_ID = "user-abc-123";

const mockContext: SiteContext = {
  user: {
    userId: TEST_USER_ID,
    firstNames: "Test",
    lastNames: "User",
    isAnonymous: false,
    email: null,
  },
  exploreTab: null,
  setExploreTab: () => {},
  addTo: null,
  setAddTo: () => {},
  allLicenses: [],
  allDoenetmlVersions: [],
};

/** Wraps FolderContext with a parent that supplies outlet context and a minimal child route. */
function mountFolderContext(initialPath: string) {
  function TestParent() {
    return <Outlet context={mockContext} />;
  }

  const router = createMemoryRouter(
    [
      {
        element: <TestParent />,
        children: [
          {
            element: <FolderContext />,
            children: [
              {
                path: `/activities/${TEST_USER_ID}`,
                element: (
                  <div data-test="outlet-content">Activities Content</div>
                ),
              },
              {
                path: "/trash",
                element: <div data-test="outlet-content">Trash Content</div>,
              },
              {
                path: `/sharedWithMe/${TEST_USER_ID}`,
                element: <div data-test="outlet-content">Shared Content</div>,
              },
            ],
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );

  cy.mount(<RouterProvider router={router} />);
}

describe("FolderContext navigation panel", { tags: ["@group1"] }, () => {
  describe("navigation link rendering", () => {
    it("renders all three navigation links", () => {
      mountFolderContext(`/activities/${TEST_USER_ID}`);
      cy.get('[data-test="My Activities Link"]').should("be.visible");
      cy.get('[data-test="Shared With Me Button"]').should("be.visible");
      cy.get('[data-test="Trash Link"]').should("be.visible");
    });

    it("renders the outlet content", () => {
      mountFolderContext(`/activities/${TEST_USER_ID}`);
      cy.get('[data-test="outlet-content"]').should(
        "contain.text",
        "Activities Content",
      );
    });
  });

  describe("active tab marking (aria-current)", () => {
    it("marks My Activities as current when on activities path", () => {
      mountFolderContext(`/activities/${TEST_USER_ID}`);
      cy.get('[data-test="My Activities Link"]').should(
        "have.attr",
        "aria-current",
        "page",
      );
      cy.get('[data-test="Shared With Me Button"]').should(
        "not.have.attr",
        "aria-current",
      );
      cy.get('[data-test="Trash Link"]').should(
        "not.have.attr",
        "aria-current",
      );
    });

    it("marks Trash as current when on trash path", () => {
      mountFolderContext("/trash");
      cy.get('[data-test="Trash Link"]').should(
        "have.attr",
        "aria-current",
        "page",
      );
      cy.get('[data-test="My Activities Link"]').should(
        "not.have.attr",
        "aria-current",
      );
      cy.get('[data-test="Shared With Me Button"]').should(
        "not.have.attr",
        "aria-current",
      );
    });

    it("marks Shared With Me as current when on sharedWithMe path", () => {
      mountFolderContext(`/sharedWithMe/${TEST_USER_ID}`);
      cy.get('[data-test="Shared With Me Button"]').should(
        "have.attr",
        "aria-current",
        "page",
      );
      cy.get('[data-test="My Activities Link"]').should(
        "not.have.attr",
        "aria-current",
      );
      cy.get('[data-test="Trash Link"]').should(
        "not.have.attr",
        "aria-current",
      );
    });
  });

  describe("small screen: de-emphasize inactive tabs", () => {
    beforeEach(() => {
      cy.viewport(375, 667); // small/mobile screen
    });

    it("active My Activities tab has full opacity; inactive tabs are de-emphasized", () => {
      mountFolderContext(`/activities/${TEST_USER_ID}`);
      cy.get('[data-test="My Activities Link"]').should(
        "have.css",
        "opacity",
        "1",
      );
      cy.get('[data-test="Trash Link"]').should("have.css", "opacity", "0.5");
      cy.get('[data-test="Shared With Me Button"]').should(
        "have.css",
        "opacity",
        "0.5",
      );
    });

    it("active Trash tab has full opacity; inactive tabs are de-emphasized", () => {
      mountFolderContext("/trash");
      cy.get('[data-test="Trash Link"]').should("have.css", "opacity", "1");
      cy.get('[data-test="My Activities Link"]').should(
        "have.css",
        "opacity",
        "0.5",
      );
      cy.get('[data-test="Shared With Me Button"]').should(
        "have.css",
        "opacity",
        "0.5",
      );
    });

    it("active Shared With Me tab has full opacity; inactive tabs are de-emphasized", () => {
      mountFolderContext(`/sharedWithMe/${TEST_USER_ID}`);
      cy.get('[data-test="Shared With Me Button"]').should(
        "have.css",
        "opacity",
        "1",
      );
      cy.get('[data-test="My Activities Link"]').should(
        "have.css",
        "opacity",
        "0.5",
      );
      cy.get('[data-test="Trash Link"]').should("have.css", "opacity", "0.5");
    });
  });

  describe("medium screen: all tabs have full opacity", () => {
    beforeEach(() => {
      cy.viewport(1024, 768); // medium screen (above md breakpoint)
    });

    it("all tabs have full opacity regardless of active state", () => {
      mountFolderContext(`/activities/${TEST_USER_ID}`);
      cy.get('[data-test="My Activities Link"]').should(
        "have.css",
        "opacity",
        "1",
      );
      cy.get('[data-test="Trash Link"]').should("have.css", "opacity", "1");
      cy.get('[data-test="Shared With Me Button"]').should(
        "have.css",
        "opacity",
        "1",
      );
    });
  });

  describe("accessibility", () => {
    it("passes accessibility on My Activities page", () => {
      mountFolderContext(`/activities/${TEST_USER_ID}`);
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("passes accessibility on Trash page", () => {
      mountFolderContext("/trash");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("passes accessibility on small screens", () => {
      cy.viewport(375, 667);
      mountFolderContext(`/activities/${TEST_USER_ID}`);
      cy.wait(100);
      cy.checkAccessibility("body");
    });
  });
});
