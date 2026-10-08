/**
 * Fail any test in which the app receives an unexpected error (4xx/5xx) from
 * the API.
 *
 * Many API calls happen in the background (fetchers, effects, iframe
 * callbacks), so a failure may never show up as something a test asserts on.
 * Instead, it can take down the page after the test's assertions have passed.
 * Checking every response catches that whole class of failure.
 *
 * The app's API calls go through axios, i.e., `XMLHttpRequest`. We watch them
 * from inside the app window rather than with `cy.intercept`: an intercept
 * that inspects responses makes Cypress's proxy buffer every response, which
 * slows the app enough to break timing-sensitive tests. An unexpected error is
 * thrown as an uncaught exception in the app, which fails the test.
 *
 * `cy.request` calls are not checked; they fail on error status codes on
 * their own.
 *
 * After each test, we wait for in-flight API requests to finish, so that a
 * request still running when the test's last command completes is checked too.
 * Cypress reports such a failure as an `afterEach` hook failure of that test,
 * which is not retried and skips the remaining tests in the spec.
 *
 * A test that expects an error response must declare it first with
 * `cy.allowApiErrors(...)`.
 */

export type AllowedApiError = {
  /** HTTP method, e.g. "GET". Matches any method if omitted. */
  method?: string;
  /** Matched against the request's pathname, e.g. /^\/api\/user\/getUser/ */
  path: RegExp;
  /** Matches any 4xx/5xx status if omitted. */
  statusCode?: number;
};

/** Error responses that the app expects and handles in normal use. */
const alwaysAllowed: AllowedApiError[] = [
  // The document's source changed before the audit landed; the editor ignores
  // this and a fresher audit follows.
  { method: "PUT", path: /^\/api\/content\/[^/]+\/audit$/, statusCode: 409 },
];

let allowedForTest: AllowedApiError[] = [];

/** API requests started by each app window that have not finished yet */
const inFlightApiRequests = new WeakMap<Window, number>();

/** How long API requests must stay settled before a test is considered done */
const settleMs = 250;
/** Give up waiting for in-flight API requests after this long */
const maxSettleWaitMs = 10000;

function isAllowed(method: string, pathname: string, statusCode: number) {
  return [...alwaysAllowed, ...allowedForTest].some(
    (allowed) =>
      (allowed.method === undefined ||
        allowed.method.toUpperCase() === method.toUpperCase()) &&
      allowed.path.test(pathname) &&
      (allowed.statusCode === undefined || allowed.statusCode === statusCode),
  );
}

Cypress.Commands.add("allowApiErrors", (...allowed: AllowedApiError[]) => {
  allowedForTest.push(...allowed);
});

beforeEach(() => {
  allowedForTest = [];
});

afterEach(() => {
  cy.window({ log: false }).then(
    { timeout: maxSettleWaitMs + 5000 },
    (win) =>
      new Cypress.Promise<void>((resolve) => {
        const deadline = Date.now() + maxSettleWaitMs;
        let settledSince = Date.now();
        const check = () => {
          const now = Date.now();
          if ((inFlightApiRequests.get(win) ?? 0) > 0) {
            settledSince = now;
          }
          if (now - settledSince >= settleMs || now > deadline) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      }),
  );
});

Cypress.on("window:before:load", (win) => {
  inFlightApiRequests.set(win, 0);
  const changeInFlight = (delta: number) =>
    inFlightApiRequests.set(win, (inFlightApiRequests.get(win) ?? 0) + delta);

  const originalOpen = win.XMLHttpRequest.prototype.open;

  win.XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const { pathname } = new URL(String(url), win.location.href);
    if (!pathname.startsWith("/api/")) {
      // @ts-expect-error: forward the remaining overload arguments unchanged
      return originalOpen.call(this, method, url, ...rest);
    }

    this.addEventListener("loadstart", () => changeInFlight(1));
    this.addEventListener("loadend", () => {
      changeInFlight(-1);

      // Status 0 means the request never completed (e.g., aborted on navigation)
      if (this.status < 400) {
        return;
      }
      if (isAllowed(method, pathname, this.status)) {
        return;
      }
      const body =
        this.responseType === "" || this.responseType === "text"
          ? this.responseText
          : `(${this.responseType} response)`;
      throw new Error(
        `Unexpected ${this.status} response from ${method} ${pathname}: ${body}\n\n` +
          `If the test expects this error, declare it with cy.allowApiErrors().`,
      );
    });

    // @ts-expect-error: forward the remaining overload arguments unchanged
    return originalOpen.call(this, method, url, ...rest);
  };
});
