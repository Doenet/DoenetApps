import { Outlet } from "react-router";
import { EditorHeader } from "./EditorHeader";

describe("EditorHeader", { tags: ["@group3"] }, () => {
  const contentId = "content-123";

  const editorData = {
    contentId,
    contentName: "Test Activity",
    contentType: "sequence",
    isPublic: true,
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
    isPublic: boolean;
    visibility: string;
    parentIsPublic: boolean;
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

  it("shows the public discovery warning and opens sharing settings on click", () => {
    mountEditorHeader({
      isPublic: true,
      visibility: "public",
      parentIsPublic: false,
      parentVisibility: "private",
      canSharePublicly: false,
      publicShareIssues: ["missingRequiredCategories"],
      sharedWith: [],
      parentSharedWith: [],
    });

    cy.get('[data-test="Editor Share Warning"]').should(
      "contain.text",
      "Not eligible for public discovery.",
    );
    cy.get('[data-test="Share Button"]').should(
      "have.attr",
      "aria-label",
    );
    cy.get('[data-test="Editor Share Warning"]').click();
    cy.contains("Share problem set").should("be.visible");
    cy.get('[data-test="Public Discovery Warning"]').should("be.visible");
  });

  it("does not show the warning when public discovery requirements pass", () => {
    mountEditorHeader({
      isPublic: true,
      visibility: "public",
      parentIsPublic: false,
      parentVisibility: "private",
      canSharePublicly: true,
      publicShareIssues: [],
      sharedWith: [],
      parentSharedWith: [],
    });

    cy.get('[data-test="Editor Share Warning"]').should("not.exist");
  });
});
