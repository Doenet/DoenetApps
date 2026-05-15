import { Outlet } from "react-router";
import { EditorHeader } from "./EditorHeader";

describe("EditorHeader", { tags: ["@group3"] }, () => {
  const contentId = "content-123";

  const editorData = {
    contentId,
    contentName: "Test Activity",
    contentType: "sequence",
    visibility: "public",
    assignmentStatus: "Unassigned",
    remixSourceHasChanged: false,
    inLibrary: false,
    contentDescription: {
      parent: null,
      grandparentId: null,
      grandparentName: null,
      hasBadVersion: false,
    },
  };

  const siteContext = {
    user: {
      userId: "user-123",
      firstNames: "Test",
      lastNames: "User",
      email: "test.user@example.com",
    },
    exploreTab: null,
    setExploreTab: () => {},
    addTo: null,
    setAddTo: () => {},
    allLicenses: [],
    allDoenetmlVersions: [],
  };

  function mountEditorHeader(shareStatus: {
    visibility: string;
    parentVisibility: string;
    canSharePublicly: boolean;
    publicShareIssues: string[];
    sharedWith: unknown[];
    parentSharedWith: unknown[];
  }) {
    cy.mount(<Outlet />, {
      routerProps: { initialEntries: [`/compoundEditor/${contentId}/edit`] },
      routes: [
        {
          path: "/",
          element: <Outlet context={siteContext} />,
          children: [
            {
              path: "/compoundEditor/:contentId/edit",
              element: <EditorHeader />,
              loader: () => editorData,
              children: [
                {
                  path: "",
                  element: <div data-test="Editor Content" />,
                },
              ],
            },
          ],
        },
        {
          path: `/loadShareStatus/${contentId}`,
          loader: () => shareStatus,
        },
        {
          path: `/compoundEditor/${contentId}/settings`,
          loader: () => ({
            maxAttempts: 1,
            individualizeByStudent: false,
            mode: "formative",
          }),
        },
      ],
    } as any);
  }

  it("shows the share-button warning state and opens sharing settings on click", () => {
    mountEditorHeader({
      visibility: "public",
      parentVisibility: "private",
      canSharePublicly: false,
      publicShareIssues: ["missingRequiredCategories"],
      sharedWith: [],
      parentSharedWith: [],
    });

    cy.get('[data-test="Editor Share Warning"]').should("not.exist");
    cy.get('[data-test="Share Button"]')
      .should("contain.text", "Action required")
      .and(
        "have.attr",
        "aria-label",
        "Open sharing settings. Current access: Public. Action required: review sharing requirements for public content.",
      )
      .click();
    cy.contains("Share problem set").should("be.visible");
    cy.get('[data-test="Public Compliance Warning"]').should("be.visible");
  });

  it("does not show the warning state when public requirements pass", () => {
    mountEditorHeader({
      visibility: "public",
      parentVisibility: "private",
      canSharePublicly: true,
      publicShareIssues: [],
      sharedWith: [],
      parentSharedWith: [],
    });

    cy.get('[data-test="Editor Share Warning"]').should("not.exist");
    cy.get('[data-test="Share Button"]').should(
      "not.contain.text",
      "Action required",
    );
  });
});
