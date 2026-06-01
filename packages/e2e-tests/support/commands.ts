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
    canUploadImages = false,
  }: {
    email?: string;
    firstNames?: string;
    lastNames?: string;
    isEditor?: boolean;
    isAuthor?: boolean;
    isAnonymous?: boolean;
    canUploadImages?: boolean;
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
        body: {
          email,
          firstNames,
          lastNames,
          isEditor,
          isAuthor,
          isAnonymous,
          canUploadImages,
        },
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
  "renderDoenetEditorViewer",
  ({
    iframeSelector = "iframe",
    // maxClicks × interval (~60s total) must exceed DoenetML #1244's ~45s
    // core-boot watchdog/retry window so we still re-click while it recovers.
    maxClicks = 30,
    interval = 2000, // ms between re-click attempts
    label,
  }: {
    iframeSelector?: string;
    maxClicks?: number;
    interval?: number;
    label?: string;
  } = {}) => {
    // Render the DoenetEditor's viewer pane. The viewer only refreshes when the
    // "Update" button is clicked, and under CI load the editor/viewer (loaded
    // from the CDN) may not be interactive when we click, so a single click can
    // be a no-op that leaves the viewer blank — the load-dependent flake behind
    // issue #2957 (it bit sharingActivities @brittle1 and the gating
    // createFolders @group3 spec). Re-click Update until the viewer pane
    // actually renders non-empty content. `label` names the call site so a CI
    // failure says *which* render timed out.
    const where = label ? ` [${label}]` : "";
    const clickUpdateUntilRendered = (
      clicksLeft: number,
      clicksDone: number,
    ) => {
      cy.getIframeBody(iframeSelector).then((bodyEl) => {
        const $body = Cypress.$(bodyEl);
        const $viewer = $body.find(".doenet-viewer");
        // Only treat a populated viewer as "done" once we've actually clicked
        // Update at least once. Otherwise, if the viewer already shows content
        // (editing existing rather than blank content), we'd return on the very
        // first check without ever rendering the just-typed edit. (#2957 review)
        if (
          clicksDone > 0 &&
          $viewer.length > 0 &&
          $viewer.text().trim().length > 0
        ) {
          // (verification #2957) confirm which @doenet/standalone version loaded
          const okEl = $body.get(0) as HTMLElement;
          const okWin = okEl.ownerDocument.defaultView as unknown as Window &
            Record<string, unknown>;
          const sa = (
            okWin.performance.getEntriesByType(
              "resource",
            ) as PerformanceResourceTiming[]
          ).find((e) => /doenet-standalone\.js/.test(e.name));
          cy.task(
            "log",
            `DOENET_STANDALONE_OK ${sa ? sa.name : "(url not found)"}`,
          );
          return; // viewer has rendered content — done
        }
        if (clicksLeft <= 0) {
          // Capture a rich diagnostic of the stalled editor before failing, to
          // distinguish a slow/incomplete CDN fetch — INCLUDING the dynamically
          // imported renderer chunks, which load after the main bundle — from an
          // engine render race (bundle loaded + fetches done, but the viewer
          // never renders, leaving .doenet-loading and no .doenet-viewer). #2957
          const el = $body.get(0) as HTMLElement;
          const win = el.ownerDocument.defaultView as unknown as Window &
            Record<string, unknown>;
          const res = (win.performance.getEntriesByType("resource") ||
            []) as PerformanceResourceTiming[];
          const short = (n: string) =>
            n.replace("https://cdn.jsdelivr.net", "").split("?")[0];
          const cdn = res.filter((e) =>
            /jsdelivr|mathjax|standalone|doenet/i.test(e.name),
          );
          const diag = {
            updateClicksPerformed: clicksDone, // 0 ⇒ button never appeared
            doenetViewer: $viewer.length,
            doenetViewerText: $viewer.text().trim().slice(0, 60),
            doenetLoading: $body.find(".doenet-loading").length, // init stalled?
            cmEditor: $body.find(".cm-editor").length, // editor mounted?
            updateBtnDisabled: $body
              .find('[data-test="Viewer Update Button"]')
              .prop("disabled"),
            nestedIframes: $body.find("iframe").length,
            errorEls: $body.find('[class*="error"]').length,
            reloadError: /reload the page/i.test($body.text()), // #1244 boot give-up?
            renderEditorFn: typeof win.renderDoenetEditorToContainer, // bundle ran?
            renderViewerFn: typeof win.renderDoenetViewerToContainer,
            returnDiagnostics: typeof win.returnDiagnostics1, // core inited?
            totalResources: res.length,
            cdnCount: cdn.length,
            cdnIncomplete: cdn
              .filter((e) => e.responseEnd === 0)
              .map((e) => short(e.name)),
            slowResources: res
              .filter((e) => e.duration > 2000)
              .map((e) => `${Math.round(e.duration)}ms ${short(e.name)}`),
            cdnTimings: cdn.map(
              (e) =>
                `${Math.round(e.duration)}ms end=${Math.round(e.responseEnd)} ${short(e.name)}`,
            ),
            bodyHtml: ($body.html() || "").replace(/\s+/g, " ").slice(0, 500),
          };
          cy.task(
            "log",
            `##### DOENET_RENDER_STALL\n${JSON.stringify(diag, null, 1)}\n##### END DOENET_RENDER_STALL`,
          );
          cy.then(() => {
            // Report the actual click count, and distinguish "the Update button
            // never appeared" (editor never became interactive) from "clicked N
            // times, viewer still blank" — they point at different root causes.
            const why =
              clicksDone === 0
                ? `the Update button never appeared after ${maxClicks} checks`
                : `viewer never rendered after ${clicksDone} Update click(s)`;
            throw new Error(
              `DoenetEditor ${why}${where} — see DOENET_RENDER_STALL diagnostic`,
            );
          });
          return;
        }
        const $btn = $body.find('[data-test="Viewer Update Button"]');
        const clickedNow = $btn.length > 0;
        if (clickedNow) {
          // Click via cypress-iframe so Cypress runs its full event simulation
          // (which reliably triggers the React onClick). force-clicking a
          // cy.wrap()-ed jQuery handle did NOT trigger the update under CI load.
          cy.iframe(iframeSelector)
            .find('[data-test="Viewer Update Button"]')
            .click({ force: true });
        }
        cy.wait(interval);
        clickUpdateUntilRendered(
          clicksLeft - 1,
          clickedNow ? clicksDone + 1 : clicksDone,
        );
      });
    };
    clickUpdateUntilRendered(maxClicks, 0);
  },
);

Cypress.Commands.add(
  "ensureDoenetEditorReady",
  ({
    iframeSelector = "iframe",
    checksPerAttempt = 24, // ~48s/attempt — covers DoenetML #1244's core-boot
    interval = 2000, //       watchdog/retry window (3 × 15s) before we reload
    maxReloads = 4, //        up to 5 boot attempts; CI usually recovers in 1-2
    //                        reloads, so 4 is generous headroom, not the norm
  }: {
    iframeSelector?: string;
    checksPerAttempt?: number;
    interval?: number;
    maxReloads?: number;
  } = {}) => {
    // Editor-ready gate. The editor's viewer pane only renders once the core
    // worker boots; under CI load that boot can stall. DoenetML #1244 watchdogs
    // + retries the boot (~15-45s) and, if it still can't come up, surfaces a
    // "reload the page" error. A fresh page load almost always boots cleanly, so
    // on a stall (or that error) we reload and wait again. Call this AFTER
    // opening the editor and BEFORE typing into it, so the editor is reactive and
    // a reload never discards typed-but-unsaved content. Any preceding title/
    // field edits must already be committed (e.g. typed with `{enter}`), because
    // a reload-on-stall would otherwise drop that uncommitted input. See #2957.
    const attempt = (checksLeft: number, reloadsLeft: number) => {
      cy.getIframeBody(iframeSelector).then((bodyEl) => {
        const $b = Cypress.$(bodyEl);
        if ($b.find(".doenet-viewer").length > 0) {
          return; // viewer rendered — editor (and its core worker) is up
        }
        const gaveUp = /reload the page/i.test($b.text()); // #1244 boot give-up
        if (!gaveUp && checksLeft > 0) {
          cy.wait(interval);
          attempt(checksLeft - 1, reloadsLeft);
          return;
        }
        if (reloadsLeft > 0) {
          cy.task(
            "log",
            `DOENET_EDITOR_RELOAD gaveUp=${gaveUp} reloadsLeft=${reloadsLeft - 1}`,
          );
          cy.reload();
          attempt(checksPerAttempt, reloadsLeft - 1);
          return;
        }
        throw new Error(
          "DoenetEditor viewer never rendered, even after reloads — core worker could not boot",
        );
      });
    };
    attempt(checksPerAttempt, maxReloads);
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
