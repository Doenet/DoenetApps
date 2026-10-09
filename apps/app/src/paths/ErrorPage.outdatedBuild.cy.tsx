import { ChakraProvider } from "@chakra-ui/react";
import { mount } from "cypress/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import ErrorPage from "./ErrorPage";
import { theme } from "../theme";

// The error page's out-of-date notice. Kept apart from other ErrorPage specs
// so the stack's ErrorPage.cy.tsx (#3071) doesn't conflict with it.
describe("ErrorPage out-of-date notice", { tags: ["@group2"] }, () => {
  const build = "1111111111111111111111111111111111111111";
  const notice = '[data-test="Outdated Build Notice"]';

  function mountWithLoaderError() {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <div />,
          errorElement: <ErrorPage build={build} />,
          loader: () => {
            throw new Error("Request failed with status code 400");
          },
        },
      ],
      { initialEntries: ["/"] },
    );
    mount(
      <ChakraProvider theme={theme}>
        <RouterProvider router={router} />
      </ChakraProvider>,
    );
  }

  it("suggests a reload when the tab's build is no longer the deployed one", () => {
    cy.intercept("GET", "/version.json", { body: { sha: "2".repeat(40) } });
    mountWithLoaderError();

    cy.get('[data-test="Error Message"]').should(
      "have.text",
      "Request failed with status code 400",
    );
    cy.get(notice)
      .should("have.attr", "data-state", "outdated")
      .and(
        "contain.text",
        "Doenet has been updated since this page was opened",
      );
  });

  it("shows only the error while the tab's build is the deployed one", () => {
    cy.intercept("GET", "/version.json", { body: { sha: build } });
    mountWithLoaderError();

    cy.get('[data-test="Error Message"]').should(
      "have.text",
      "Request failed with status code 400",
    );
    cy.get(notice).should("have.attr", "data-state", "current");
    cy.get(notice).should("be.empty");
  });
});
