/// <reference path="./component.d.ts" />

// Handle MathJax async typesetting errors that aren't critical for tests.
// MathJax appears to crash if you navigate away while it is typesetting,
// so we suppress those errors here rather than adding waits in each test.
Cypress.on("uncaught:exception", (err) => {
  // Suppress MathJax typesetting errors
  if (err.message?.includes("Typesetting failed")) {
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
import { register as registerCypressGrep } from "@cypress/grep";
registerCypressGrep();

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

  const wrapped = <RouterProvider router={router} />;

  return mount(wrapped, mountOptions);
});

// Example use:
// cy.mount(<MyComponent />)
