import { MountOptions, MountReturn } from "cypress/react";
import { MemoryRouterProps } from "react-router";
import { mount } from "cypress/react";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mounts a React node
       * @param component React Node to mount
       * @param options Additional options to pass into mount
       * @param options.routerProps Props for the memory router
       * @param options.action Optional action handler for route actions (e.g., fetcher.submit())
       * @param options.routes Optional additional routes to add to the router
       * @param options.colorMode Force the Chakra color mode ("light" | "dark").
       *   Defaults to the `colorMode` Cypress env value, else "light". Set the
       *   env for a whole run (e.g. `--env colorMode=dark`) to exercise every
       *   spec's accessibility checks in dark mode.
       */
      mount(
        component: React.ReactNode,
        options?: MountOptions & {
          routerProps?: MemoryRouterProps;
          action?: (data: { request: Request }) => Promise<any>;
          routes?: any[];
          colorMode?: "light" | "dark";
        },
      ): Cypress.Chainable<MountReturn>;
    }
  }
}
