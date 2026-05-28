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
      parent: null,
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

  function mountEditorHeader(shareStatus: {
    visibility: string;
    parentVisibility: string;
    canSharePublicly: boolean;
    publicShareIssues: string[];
    sharedWith: unknown[];
    parentSharedWith: unknown[];
  }) {
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
                return editorData;
              },
              children: [
                {
                  index: true,
                  element: <div data-test="Editor Content" />,
                },
              ],
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
        initialEntries: [`/compoundEditor/${contentId}/edit`],
      },
    );

    mount(
      <ChakraProvider theme={theme}>
        <MathJaxContext
          version={4}
          config={mathjaxConfig}
          src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-svg.js"
        >
          <RouterProvider router={router} />
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
