// TEMP diagnostic (issue #2957): from inside the editor iframe, dump the
// jsdelivr resource timings (doenet standalone bundle + MathJax) and whether the
// viewer rendered. Tagged @group1 so it runs inside the loaded e2e-tests job;
// emits to the CI stdout via cy.task("log") and never fails, so it doesn't
// pollute the gating result. DELETE after the CDN question is answered.
describe("CDN diagnostic", { tags: ["@group1"] }, function () {
  it("dumps jsdelivr resource timings from the editor iframe", () => {
    cy.loginAsTestUser({ isAuthor: true });
    cy.createContent({ name: "diag", doenetML: "Hello there! <m>x</m>" }).then(
      (id) => {
        cy.visit(`/documentEditor/${id}/edit`);
        cy.wait(8000); // editor shell + standalone bundle begin loading

        // Best-effort: click Update to trigger the viewer + MathJax (non-fatal).
        cy.getIframeBody("iframe").then((bodyEl) => {
          const btn = Cypress.$(bodyEl).find(
            '[data-test="Viewer Update Button"]',
          );
          if (btn.length) cy.wrap(btn).click({ force: true });
        });
        cy.wait(28000); // give slow-under-load CDN fetches time to finish

        cy.getIframeBody("iframe").then((bodyEl) => {
          const el = Cypress.$(bodyEl).get(0) as HTMLElement;
          const win = el.ownerDocument.defaultView as Window;
          const rendered = el.querySelector(".doenet-viewer") ? "YES" : "NO";
          const res = win.performance.getEntriesByType(
            "resource",
          ) as PerformanceResourceTiming[];
          const cdn = res
            .filter((e) => /jsdelivr|mathjax|standalone|doenet/i.test(e.name))
            .map(
              (e) =>
                `  ${Math.round(e.duration)}ms xfer=${e.transferSize} resEnd=${Math.round(e.responseEnd)} ${e.name.replace("https://cdn.jsdelivr.net", "")}`,
            );
          cy.task(
            "log",
            `\n##### CDN_DIAG viewerRendered=${rendered} jsdelivrEntries=${cdn.length}\n${cdn.join("\n")}\n##### END CDN_DIAG`,
          );
        });
      },
    );
  });
});
