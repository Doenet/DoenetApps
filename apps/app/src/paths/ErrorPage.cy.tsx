import { ChakraProvider } from "@chakra-ui/react";
import { mount } from "cypress/react";
import { AxiosError, AxiosHeaders } from "axios";
import { createMemoryRouter, RouterProvider } from "react-router";

import ErrorPage from "./ErrorPage";
import { ApiError } from "../api/client";
import { theme } from "../theme";

describe("ErrorPage", { tags: ["@group2"] }, () => {
  const unavailable = "trying to access a page that is unavailable";
  const serverError = "It appears that we have encountered an error";

  function mountWithLoaderError(error: unknown) {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <div />,
          errorElement: <ErrorPage />,
          loader: () => {
            throw error;
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

  function axiosErrorWithResponse(status: number, data: unknown) {
    return new AxiosError(
      `Request failed with status code ${status}`,
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      {
        status,
        statusText: "",
        data,
        headers: {},
        config: { headers: new AxiosHeaders() },
      },
    );
  }

  it("shows a server error for an ApiError with a 5xx status", () => {
    mountWithLoaderError(
      new ApiError("getAssigned", 500, { error: "boom" }, null),
    );

    cy.contains(serverError).should("be.visible");
    cy.get('[data-test="Error Message"]').should(
      "have.text",
      "getAssigned failed with status 500: boom",
    );
  });

  for (const status of [403, 404]) {
    it(`shows "unavailable" for an ApiError with status ${status}`, () => {
      mountWithLoaderError(
        new ApiError("getAssigned", status, undefined, null),
      );

      cy.contains(unavailable).should("be.visible");
    });
  }

  it("shows a server error for an axios error with a 5xx status", () => {
    mountWithLoaderError(axiosErrorWithResponse(500, {}));

    cy.contains(serverError).should("be.visible");
  });

  it("shows a short axios string body as the heading", () => {
    mountWithLoaderError(axiosErrorWithResponse(404, "No such folder"));

    cy.contains(unavailable).should("be.visible");
    cy.get('[data-test="Error Message"]').should("have.text", "No such folder");
  });

  it('shows "unavailable" for an error with no status', () => {
    mountWithLoaderError(new Error("Something broke"));

    cy.contains(unavailable).should("be.visible");
    cy.get('[data-test="Error Message"]').should(
      "have.text",
      "Something broke",
    );
  });
});
