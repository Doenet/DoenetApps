/// <reference path="./component.d.ts" />

// MathJax (v4, loaded from the CDN) crashes if a component unmounts — between
// tests or at spec end — while it is still typesetting. It throws asynchronously
// with no usable stack and a minified message like "undefined is not an object
// (evaluating 'a.shift')", reported by Cypress "outside of a test". Such errors
// CANNOT be reliably caught by `uncaught:exception`: the message carries no
// MathJax marker, so the only matcher that would catch it is one broad enough to
// swallow real bugs too. (We learned this the hard way in the DoenetML repo —
// every catch we tried still let these slip through.) So instead of suppressing,
// we PREVENT them: drain MathJax's typeset queue before each teardown so it is
// never mid-typeset when the DOM is torn down. See issue #2957.
//
// better-react-mathjax chains every typeset onto window.MathJax.startup.promise,
// so awaiting that promise waits for all queued typesetting to finish.
afterEach(() => {
  cy.window({ log: false }).then((win) => {
    const mj = (
      win as unknown as {
        MathJax?: { startup?: { promise?: Promise<unknown> } };
      }
    ).MathJax;
    const pending = mj?.startup?.promise;
    if (pending) {
      // Resolve our own promise off it so a rejected typeset can't fail the
      // test; we only need to wait for the queue to settle before teardown.
      return new Cypress.Promise<void>((resolve) => {
        Promise.resolve(pending).then(
          () => resolve(),
          () => resolve(),
        );
      });
    }
    return undefined;
  });
});

// Narrow fallback: only the MathJax error variants that DO carry an identifying
// message (kept from the original per-test handlers). The "a.shift" variant has
// no marker and is handled by the drain above, not here — we deliberately do NOT
// broaden this matcher, to avoid masking genuine failures.
Cypress.on("uncaught:exception", (err) => {
  if (
    err.message?.includes("Typesetting failed") ||
    err.message?.includes("Cannot read properties of null")
  ) {
    return false; // Suppress the error
  }
  // Let other errors fail the test
  return true;
});

// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import { ChakraProvider } from "@chakra-ui/react";
import "./commands";
import "cypress-axe";
import "wick-a11y";
import { MotionGlobalConfig } from "framer-motion";
import { register as registerCypressGrep } from "@cypress/grep";
registerCypressGrep();

// Make all animations instant in component tests. Chakra menus/modals/tooltips
// fade in via framer-motion; when `cy.checkAccessibility` runs during the
// open-transition, the foreground text and its background both blend toward the
// page color, so axe's color-contrast check can momentarily measure a sub-AA
// ratio and report an intermittent, false violation (e.g. ContributorsMenu
// "displays author menu item with activity name and owner" — issue #2957).
// Jumping framer-motion animations straight to their final keyframe removes that
// race for every a11y assertion. The CSS override injected in `mount` does the
// same for plain CSS transitions/animations.
MotionGlobalConfig.skipAnimations = true;

// Configure cypress-axe to use the correct path for axe-core in monorepo
// axe-core is installed in the root node_modules, not in client/node_modules
Cypress.Commands.overwrite("injectAxe", () => {
  // Load the trusted axe-core bundle from disk and inject it via a <script> tag
  // instead of using window.eval. This keeps the standard cypress-axe behavior
  // while avoiding eval and clearly scopes execution to this window.
  cy.readFile("../../node_modules/axe-core/axe.min.js").then((source) => {
    return cy.window({ log: false }).then((window) => {
      const script = window.document.createElement("script");
      script.type = "text/javascript";
      script.textContent = source;
      window.document.head.appendChild(script);
    });
  });
});

import { mount, MountOptions } from "cypress/react";

import {
  createMemoryRouter,
  RouterProvider,
  MemoryRouterProps,
} from "react-router";
import { MathJaxContext } from "better-react-mathjax";
import { mathjaxConfig } from "@doenet/doenetml-iframe";
import { theme } from "../../src/theme";

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.

// Cypress.Commands.add('mount', mount)

Cypress.Commands.add("mount", (component, options = {}) => {
  const {
    routerProps = { initialEntries: ["/"] },
    action,
    routes,
    ...mountOptions
  } = options as MountOptions & {
    routerProps?: MemoryRouterProps;
    action?: (data: { request: Request }) => Promise<any>;
    routes?: any[];
  };

  const safeActionWithDefault = async ({ request }: { request: Request }) => {
    try {
      // If the test provided a custom action, call it
      if (action) {
        return await action({ request });
      }

      // Otherwise, mock a simple JSON echo for POSTs
      if (request.method === "POST") {
        const contentType = request.headers.get("content-type") || "";
        let body: any = {};
        if (contentType.includes("application/json")) {
          body = await request.json();
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          const formData = await request.formData();
          body = Object.fromEntries(formData.entries());
        }
        return { success: true, body };
      }
      return null;
    } catch (e: any) {
      // Prevent React Router ErrorBoundary from triggering
      // by returning a serializable object instead of throwing
      console.error("Mock route action error:", e);
      return { success: false, error: e?.message ?? String(e) };
    }
  };

  // Build the routes array
  const routesArray = [
    {
      path: "/",
      element: (
        <ChakraProvider theme={theme}>
          <MathJaxContext
            version={4}
            config={mathjaxConfig}
            src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-svg.js"
          >
            {component as any}
          </MathJaxContext>
        </ChakraProvider>
      ),
      action: safeActionWithDefault,
    },
    // Add any additional routes provided by the test
    ...(routes || []),
  ];

  const router = createMemoryRouter(routesArray, routerProps as any);

  const wrapped = (
    <>
      {/* Belt-and-suspenders for plain CSS transitions/animations (framer-motion
          is handled by MotionGlobalConfig.skipAnimations): keep their end state
          but make them instant, so axe never samples a transitional frame and
          color-contrast checks don't flake. See issue #2957. */}
      <style>{`*, *::before, *::after { transition-duration: 0s !important; transition-delay: 0s !important; animation-duration: 0s !important; animation-delay: 0s !important; }`}</style>
      <RouterProvider router={router} />
    </>
  );

  return mount(wrapped, mountOptions);
});

// Example use:
// cy.mount(<MyComponent />)
