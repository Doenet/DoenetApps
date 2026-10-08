import { ChakraProvider } from "@chakra-ui/react";
import { mount } from "cypress/react";
import { MathJaxContext } from "better-react-mathjax";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { mathjaxConfig } from "@doenet/doenetml-iframe";
import type { LoaderFunctionArgs } from "react-router";

import { EditorHeader } from "./EditorHeader";
import { theme } from "../../theme";

describe("EditorHeader", { tags: ["@group3"] }, () => {
  const contentId = "content-123";

  const editorData = {
    contentId,
    contentName: "Test Activity",
    contentType: "sequence",
    visibility: "public",
    isPublic: true,
    assignmentStatus: "Unassigned",
    remixSourceHasChanged: false,
    inLibrary: false,
    contentDescription: {
      contentId,
      name: "Test Activity",
      type: "sequence",
      parent: null as { contentId: string; name: string; type: string } | null,
      grandparentId: null,
      grandparentName: null,
      hasBadVersion: false,
    },
  };

  const siteContext = {
    user: {
      userId: "user-123",
      isAnonymous: false,
      isAuthor: true,
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

  const privateShareStatus = {
    visibility: "private",
    parentVisibility: "private",
    canSharePublicly: true,
    publicShareIssues: [],
    publicShareBlockers: [],
    sharedWith: [],
    parentSharedWith: [],
  };

  function mountEditorHeader(
    shareStatus: {
      visibility: string;
      parentVisibility: string;
      canSharePublicly: boolean;
      publicShareIssues: string[];
      publicShareBlockers: unknown[];
      sharedWith: unknown[];
      parentSharedWith: unknown[];
    },
    {
      editorOverrides = {},
      search = "",
    }: {
      editorOverrides?: Partial<typeof editorData>;
      search?: string;
    } = {},
  ) {
    const editor = { ...editorData, ...editorOverrides };
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Outlet context={siteContext} />,
          children: [
            {
              path: "compoundEditor/:contentId/edit",
              element: <EditorHeader />,
              loader: ({ params }: LoaderFunctionArgs) => {
                expect(params.contentId).to.equal(contentId);
                return editor;
              },
              children: [
                {
                  index: true,
                  element: (
                    <div
                      data-test="Editor Content"
                      style={{ height: "100%" }}
                    />
                  ),
                },
              ],
            },
            {
              path: "compoundEditor/:contentId/library",
              loader: ({ params }: LoaderFunctionArgs) => {
                expect(params.contentId).to.equal(contentId);
                return {
                  libraryRelations: {
                    source: {
                      status: "UNDER_REVIEW",
                      sourceContentId: "source-123",
                      reviewRequestDate: "2024-01-15T10:00:00Z",
                      ownerRequested: true,
                      iAmPrimaryEditor: true,
                    },
                  },
                  libraryComments: [],
                };
              },
            },
            {
              path: "loadShareStatus/:contentId",
              loader: ({ params }: LoaderFunctionArgs) => {
                expect(params.contentId).to.equal(contentId);
                return shareStatus;
              },
            },
            {
              path: "compoundEditor/:contentId/settings",
              loader: ({ params }: LoaderFunctionArgs) => {
                expect(params.contentId).to.equal(contentId);
                return {
                  maxAttempts: 1,
                  individualizeByStudent: false,
                  mode: "formative",
                };
              },
            },
          ],
        },
      ],
      {
        initialEntries: [`/compoundEditor/${contentId}/edit${search}`],
      },
    );

    mount(
      <ChakraProvider theme={theme}>
        <MathJaxContext
          version={4}
          config={mathjaxConfig}
          src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-svg.js"
        >
          {/* Stands in for the site layout, which gives the editor the full page */}
          <div style={{ position: "relative", height: "100vh" }}>
            <RouterProvider router={router} />
          </div>
        </MathJaxContext>
      </ChakraProvider>,
    );
  }

  it("shows the share-button warning state and opens sharing settings on click", () => {
    mountEditorHeader({
      visibility: "public",
      parentVisibility: "private",
      canSharePublicly: false,
      publicShareIssues: ["missingRequiredCategories"],
      publicShareBlockers: [],
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
      publicShareBlockers: [],
      sharedWith: [],
      parentSharedWith: [],
    });

    cy.get('[data-test="Editor Share Warning"]').should("not.exist");
    cy.get('[data-test="Share Button"]').should(
      "not.contain.text",
      "Action required",
    );
  });
  it("links the breadcrumb to the owner's activities", () => {
    cy.viewport(1400, 800);
    mountEditorHeader(privateShareStatus);

    cy.get('[data-test="Folder Breadcrumb Link"]')
      .should("have.attr", "href", "/activities/user-123/")
      .and("have.text", "My Activities");
  });

  it("links the breadcrumb of library content to the library", () => {
    cy.viewport(1400, 800);
    mountEditorHeader(privateShareStatus, {
      editorOverrides: { inLibrary: true },
    });

    cy.get('[data-test="Folder Breadcrumb Link"]')
      .should("have.attr", "href", "/libraryActivities/")
      .and("have.text", "Library Activities");
  });

  it("links the breadcrumb of library content in a folder to that library folder", () => {
    cy.viewport(1400, 800);
    mountEditorHeader(privateShareStatus, {
      editorOverrides: {
        inLibrary: true,
        contentDescription: {
          ...editorData.contentDescription,
          parent: {
            contentId: "folder-456",
            name: "Library Folder",
            type: "folder",
          },
        },
      },
    });

    cy.get('[data-test="Folder Breadcrumb Link"]')
      .should("have.attr", "href", "/libraryActivities/folder-456")
      .and("have.text", "Library Folder");
  });

  it("marks the remixes button when the remix source has changed", () => {
    mountEditorHeader(privateShareStatus, {
      editorOverrides: { remixSourceHasChanged: true },
    });

    cy.get('[aria-label="View remixes"]')
      .parent()
      .should("contain.text", "\u{1f534}");
  });

  it("does not mark the remixes button of library content, which cannot be updated from its source", () => {
    mountEditorHeader(privateShareStatus, {
      editorOverrides: { remixSourceHasChanged: true, inLibrary: true },
    });

    cy.get('[aria-label="View remixes"]')
      .parent()
      .should("not.contain.text", "\u{1f534}");
  });

  it("gives the editor and curation panel the full height in curate mode", () => {
    cy.viewport(1000, 700);
    mountEditorHeader(privateShareStatus, {
      editorOverrides: { inLibrary: true },
      search: "?curate",
    });

    cy.get('[data-test="Library Editor Controls"]').should(
      "contain.text",
      "Panel only visible to library editors",
    );
    cy.get('[data-test="Library Editor Controls"]').then(($panel) => {
      const panelHeight = $panel[0].getBoundingClientRect().height;
      expect(panelHeight).to.be.greaterThan(500);
      cy.get('[data-test="Editor Content"]')
        .invoke("outerHeight")
        .should("be.closeTo", panelHeight, 1);
    });
  });
});
