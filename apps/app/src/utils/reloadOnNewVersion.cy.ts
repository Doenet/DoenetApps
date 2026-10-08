import { createMemoryRouter } from "react-router";
import { reloadOnNewVersion } from "./reloadOnNewVersion";

describe("reloadOnNewVersion", { tags: ["@group2"] }, () => {
  let deployed: { statusCode: number; sha: string };
  let requests: number;
  let reload: Cypress.Agent<sinon.SinonStub>;
  let watcher: ReturnType<typeof reloadOnNewVersion> | undefined;

  // `/other` has a loader, as the app's routes do: the reload is triggered by
  // the router entering the "loading" state.
  const router = () =>
    createMemoryRouter(
      [
        { path: "/", element: null },
        { path: "/other", element: null, loader: () => null },
      ],
      { initialEntries: ["/"] },
    );

  function start(r: ReturnType<typeof router>, buildCommit = "aaa111") {
    cy.then(() => {
      watcher = reloadOnNewVersion(r, { buildCommit, reload });
      return watcher.ready;
    });
  }

  function navigateToOther(r: ReturnType<typeof router>) {
    cy.then(() => r.navigate("/other?tab=2"));
    cy.wrap(r).its("state.location.pathname").should("equal", "/other");
  }

  beforeEach(() => {
    deployed = { statusCode: 200, sha: "aaa111" };
    requests = 0;
    reload = cy.stub().as("reload");
    cy.intercept("GET", "/version.json", (req) => {
      requests++;
      req.reply({
        statusCode: deployed.statusCode,
        body: deployed.statusCode === 200 ? { sha: deployed.sha } : "",
      });
    }).as("version");
  });

  afterEach(() => {
    watcher?.stop();
    watcher = undefined;
    cy.document().then((doc) => {
      // Undo the "hidden" override (a no-op if the test didn't set it).
      delete (doc as { hidden?: boolean }).hidden;
    });
  });

  it("turns the next navigation into a full page load once a new version is deployed", () => {
    const r = router();
    start(r);
    cy.then(() => {
      deployed.sha = "bbb222";
      return watcher!.check();
    });

    navigateToOther(r);
    cy.get("@reload").should("have.been.calledOnceWith", "/other?tab=2");
  });

  it("reloads on the next navigation when the tab started on an older build, e.g. from a cache", () => {
    deployed.sha = "bbb222";
    const r = router();
    start(r);

    navigateToOther(r);
    cy.get("@reload").should("have.been.calledOnceWith", "/other?tab=2");
  });

  it("re-checks when the tab becomes visible", () => {
    start(router());
    cy.document().then((doc) => {
      doc.dispatchEvent(new Event("visibilitychange"));
    });
    cy.wait(["@version", "@version"]);
  });

  it("does not reload while the deployed version is unchanged", () => {
    const r = router();
    start(r);
    cy.then(() => watcher!.check());

    navigateToOther(r);
    cy.then(() => expect(requests).to.equal(2));
    cy.get("@reload").should("not.have.been.called");
  });

  it("does not reload when /version.json is missing", () => {
    deployed.statusCode = 404;
    const r = router();
    start(r);
    cy.then(() => watcher!.check());

    navigateToOther(r);
    cy.then(() => expect(requests).to.equal(2));
    cy.get("@reload").should("not.have.been.called");
  });

  it("does nothing without a built-in commit, as in local dev", () => {
    deployed.sha = "bbb222";
    const r = router();
    start(r, "");
    cy.then(() => watcher!.check());

    navigateToOther(r);
    cy.then(() => expect(requests).to.equal(0));
    cy.get("@reload").should("not.have.been.called");
  });

  it("does not check while the tab is hidden", () => {
    const r = router();
    start(r);
    cy.document().then((doc) => {
      Object.defineProperty(doc, "hidden", {
        configurable: true,
        get: () => true,
      });
    });
    cy.then(() => {
      deployed.sha = "bbb222";
      return watcher!.check();
    });

    navigateToOther(r);
    cy.then(() => expect(requests).to.equal(1));
    cy.get("@reload").should("not.have.been.called");
  });
});
