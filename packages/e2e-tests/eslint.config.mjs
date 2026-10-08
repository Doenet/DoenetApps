// @ts-check

import tseslint from "typescript-eslint";
import { createBaseConfig, reactConfig } from "@doenet-tools/eslint-config";

export default tseslint.config(
  ...createBaseConfig(import.meta.dirname),
  ...reactConfig,
  // Call /api with the typed cy.api("operationName", params) command, so
  // every call is checked against the API contract. Existing cy.request
  // calls are recorded in eslint-suppressions.json; that list may only shrink.
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='cy'][callee.property.name='request']",
          message:
            'Use cy.api("operationName", params). If the route is not in the API contract yet, add it first.',
        },
      ],
    },
  },
);
