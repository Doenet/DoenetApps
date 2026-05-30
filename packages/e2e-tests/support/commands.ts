// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import "cypress-wait-until";
import "cypress-file-upload";
import "cypress-iframe";

import type { ContentType } from "@doenet-tools/shared";

Cypress.Commands.add(
  "loginAsTestUser",
  ({
    email,
    firstNames,
    lastNames,
    isEditor = false,
    isAuthor = false,
    isAnonymous = false,
  }: {
    email?: string;
    firstNames?: string;
    lastNames?: string;
    isEditor?: boolean;
    isAuthor?: boolean;
    isAnonymous?: boolean;
  } = {}) => {
    const code = Date.now().toString();
    if (!email) {
      email = `test${code}@doenet.org`;
    }
    if (!firstNames && !lastNames) {
      firstNames = `Test`;
      lastNames = `User${code}`;
    }

    return cy.session(email, () => {
      cy.request({
        method: "POST",
        url: "/api/login/createOrLoginAsTest",
        body: { email, firstNames, lastNames, isEditor, isAuthor, isAnonymous },
      });
    });
  },
);

Cypress.Commands.add(
  "createContent",
  ({
    name,
    doenetML,
    contentType = "singleDoc",
    classifications,
    categories,
    makePublic = false,
    publishInLibrary = false,
    parentId,
  }: {
    name: string;
    doenetML?: string;
    contentType?: ContentType;
    classifications?: {
      systemShortName: string;
      category: string;
      subCategory: string;
      code: string;
    }[];
    categories?: Record<string, boolean>;
    makePublic?: boolean;
    publishInLibrary?: boolean;
    parentId?: string;
  }) => {
    cy.request({
      method: "POST",
      url: "/api/updateContent/createContent",
      body: {
        contentType,
        parentId: parentId ?? null,
      },
    }).then((resp) => {
      const contentId: string = resp.body.contentId;

      if (classifications) {
        cy.request({
          method: "POST",
          url: "/api/test/addClassificationsByNames",
          body: {
            contentId,
            classifications,
          },
        });
      }

      if (categories) {
        cy.request({
          method: "POST",
          url: "/api/updateContent/updateCategories",
          body: {
            contentId,
            categories,
          },
        });
      }

      if (makePublic || publishInLibrary) {
        cy.request({
          method: "POST",
          url: "/api/share/setContentIsPublic",
          body: {
            contentId,
            isPublic: true,
          },
        });
      }

      if (publishInLibrary) {
        cy.request({
          method: "POST",
          url: "/api/curate/suggestToBeCurated",
          body: {
            contentId: contentId,
          },
        }).then((resp) => {
          const contentIdInLibrary = resp.body.contentIdInLibrary;
          cy.request({
            method: "POST",
            url: "/api/curate/claimOwnershipOfReview",
            body: {
              contentId: contentIdInLibrary,
            },
          }).then(() => {
            cy.request({
              method: "POST",
              url: "/api/curate/publishActivityToLibrary",
              body: {
                contentId: contentIdInLibrary,
              },
            });
          });
        });
      }

      if (doenetML !== undefined) {
        cy.request({
          method: "POST",
          url: "/api/updateContent/saveDoenetML",
          body: {
            contentId,
            doenetML,
            numVariants: 1,
          },
        });
      }
      cy.request({
        method: "POST",
        url: "/api/updateContent/updateContentSettings",
        body: {
          contentId: contentId,
          name: name,
        },
      }).then(() => contentId);
    });
  },
);

Cypress.Commands.add(
  "createAssignment",
  ({
    contentId,
    closedOn,
    parentId,
    maxAttempts = 1,
  }: {
    contentId: string;
    closedOn: string;
    parentId?: string;
    maxAttempts?: number;
  }) => {
    cy.request({
      method: "POST",
      url: "/api/assign/createAssignment",
      body: {
        contentId,
        closedOn,
        destinationParentId: parentId ?? null,
      },
    }).then((resp) => {
      const assignmentId: string = resp.body.assignmentId;
      const classCode: number | null = resp.body.classCode ?? null;

      cy.request({
        method: "POST",
        url: "/api/assign/updateAssignmentMaxAttempts",
        body: {
          contentId: assignmentId,
          maxAttempts,
        },
      }).then(() => {
        return { assignmentId, classCode };
      });
    });
  },
);

Cypress.Commands.add("getUserInfo", () => {
  cy.request({
    method: "GET",
    url: "/api/user/getMyUserInfo",
  }).then((resp) => {
    const user = resp.body.user;
    return user;
  });
});

Cypress.Commands.add(
  "getIframeBody",
  (
    iframeSelector,
    waitSelector = null,
    { timeout = 30000, label }: { timeout?: number; label?: string } = {},
  ) => {
    // DoenetML viewer iframes (engine bundle + MathJax typesetting) routinely
    // take well over the 10s default to render on a loaded CI runner, and the
    // iframe can re-mount when its `doenetML` prop changes. We use a generous
    // timeout so the .should() keeps re-querying — re-acquiring a fresh <iframe>
    // element on each retry — until the content is actually present, instead of
    // timing out on a slow-but-healthy render. `label` names the call site so a
    // CI failure says *which* getIframeBody timed out. See issue #2957.
    const where = label ? ` [${label}]` : "";
    return (
      cy
        .get(iframeSelector, { log: false, timeout })
        // 1. ANCHOR: We keep the subject as the <iframe> element, not the body.
        // The .should() will retry against the iframe element until the callback passes.
        .should(($iframe) => {
          // We use jQuery to look inside the iframe without changing the Cypress subject
          const $body = $iframe.contents().find("body");

          // Check 1: Body must exist
          if ($body.length === 0) {
            throw new Error(
              `Iframe "${iframeSelector}" body is empty or not yet loaded${where}`,
            );
          }

          // Check 2: If we are waiting for a specific element, it must exist
          if (waitSelector && $body.find(waitSelector).length === 0) {
            throw new Error(
              `Element "${waitSelector}" not yet found in iframe "${iframeSelector}"${where}`,
            );
          }
        })
        // 2. FETCH: Only once the above passes (stable), do we grab the body
        .its("0.contentDocument.body", { log: false, timeout })
        .then(cy.wrap) as Cypress.Chainable<HTMLBodyElement>
    );
  },
);

Cypress.Commands.add(
  "dismissMenuByOverlay",
  /**
   * Shared assertion + action for iframe-dismiss flows:
   * verifies overlay visibility, clicks it, and verifies menu closes.
   */
  ({
    overlayTestId,
    menuListTestId,
    assertTooltipClosed = true,
  }: {
    overlayTestId: string;
    menuListTestId: string;
    assertTooltipClosed?: boolean;
  }) => {
    cy.get(`[data-test="${overlayTestId}"]:visible`).should("exist");
    cy.get(`[data-test="${overlayTestId}"]:visible`).click({ force: true });
    cy.get(`[data-test="${menuListTestId}"]:visible`).should("not.exist");
    if (assertTooltipClosed) {
      cy.get('[role="tooltip"]:visible').should("not.exist");
    }
  },
);
