import { createMemoryRouter } from "react-router";
import { reloadOnNewVersion } from "./reloadOnNewVersion";

describe("reloadOnNewVersion", { tags: ["@group2"] }, () => {
  let deployed: { statusCode: number; sha: string };
  let requests: number;
  let reload: Cypress.Agent<sinon.SinonStub>;
  let watcher: ReturnType<typeof reloadOnNewVersion> | undefined;

  // `/other` has a loader, as most of the app's routes do: the reload is
  // triggered by the router entering the "loading" state, which a navigation
  // that runs no loader skips.
  const router = () =>
    createMemoryRouter(
      [
        { path: "/", element: null },
        { path: "/other", element: null, loader: () => null },
        // An action that returns data: the router then revalidates the
        // current page's loaders, entering "loading" without leaving it.
        {
          path: "/form",
          element: null,
          loader: () => null,
          action: () => null,
        },
      ],
      { initialEntries: ["/"] },
    );

  const url = (path: string) => window.location.origin + path;

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
    cy.get("@reload").should("have.been.calledOnceWith", url("/other?tab=2"));
  });

  it("reloads on the next navigation when the tab started on an older build, e.g. from a cache", () => {
    deployed.sha = "bbb222";
    const r = router();
    start(r);

    navigateToOther(r);
    cy.get("@reload").should("have.been.calledOnceWith", url("/other?tab=2"));
  });

  it("does not reload after a form submission, which would drop its result", () => {
    const r = router();
    start(r);
    cy.then(() => r.navigate("/form"));
    cy.wrap(r).its("state.location.pathname").should("equal", "/form");
    cy.then(() => {
      deployed.sha = "bbb222";
      return watcher!.check();
    });

    cy.then(() => {
      const formData = new FormData();
      formData.append("field", "value");
      return r.navigate("/form", { formMethod: "post", formData });
    });
    cy.wrap(r).its("state.actionData").should("exist");
    cy.wrap(r).its("state.navigation.state").should("equal", "idle");
    cy.get("@reload").should("not.have.been.called");

    // The next plain navigation still picks up the new build.
    navigateToOther(r);
    cy.get("@reload").should("have.been.calledOnceWith", url("/other?tab=2"));
  });

  it("reloads on a GET form submission, as on any navigation", () => {
    const r = router();
    start(r);
    cy.then(() => {
      deployed.sha = "bbb222";
      return watcher!.check();
    });

    cy.then(() => {
      const formData = new FormData();
      formData.append("q", "x");
      return r.navigate("/other", { formMethod: "get", formData });
    });
    cy.get("@reload").should("have.been.calledOnceWith", url("/other?q=x"));
  });

  it("reloads a path starting with // on this site, not as a protocol-relative URL", () => {
    // e.g. the tab first opened https://host//evil.com/start, then navigated on.
    const r = createMemoryRouter(
      [{ path: "*", element: null, loader: () => null }],
      { initialEntries: ["//evil.com/start", "/"], initialIndex: 1 },
    );
    start(r);
    cy.then(() => {
      deployed.sha = "bbb222";
      return watcher!.check();
    });

    cy.then(() => r.navigate(-1));
    cy.get("@reload")
      .should("have.been.calledOnceWith", url("//evil.com/start"))
      .then(() => {
        const target = new URL(reload.firstCall.args[0] as string);
        expect(target.origin).to.equal(window.location.origin);
      });
  });

  it("re-checks every 5 minutes", () => {
    cy.clock();
    const r = router();
    start(r);
    cy.then(() => {
      deployed.sha = "bbb222";
    });

    cy.tick(5 * 60 * 1000);
    cy.wait(["@version", "@version"]);
    // cy.wait returns once Cypress has seen the response, which can be before
    // the app has read it. check() joins the interval's check if it is still
    // in flight; no third request shows the interval's check found the change.
    cy.then(() => watcher!.check());
    cy.then(() => expect(requests).to.equal(2));
    navigateToOther(r);
    cy.get("@reload").should("have.been.calledOnceWith", url("/other?tab=2"));
  });

  it("re-checks when the tab becomes visible", () => {
    start(router());
    cy.document().then((doc) => {
      doc.dispatchEvent(new Event("visibilitychange"));
    });
    cy.wait(["@version", "@version"]);
  });

  it("shares one request between checks that overlap", () => {
    start(router());
    cy.then(() => Promise.all([watcher!.check(), watcher!.check()]));
    cy.then(() => expect(requests).to.equal(2));
  });

  it("gives up on a request that never finishes, so later checks still run", () => {
    cy.clock();
    const r = router();
    start(r);
    let hung: Promise<void>;

    // The next request hangs until aborted, like one cut off by a laptop
    // going to sleep.
    cy.then(() => {
      const realFetch = window.fetch.bind(window);
      let hang = true;
      cy.stub(window, "fetch").callsFake(
        (input: RequestInfo | URL, init?: RequestInit) => {
          if (!hang) {
            return realFetch(input, init);
          }
          hang = false;
          return new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          });
        },
      );
      deployed.sha = "bbb222";
      hung = watcher!.check();
    });

    // Without a timeout the hung check never settles, and every later check
    // would join it.
    cy.tick(30 * 1000);
    cy.then(() => hung);
    cy.then(() => watcher!.check());
    cy.then(() => expect(requests).to.equal(2));
    navigateToOther(r);
    cy.get("@reload").should("have.been.calledOnceWith", url("/other?tab=2"));
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
