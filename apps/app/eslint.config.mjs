// @ts-check

import tseslint from "typescript-eslint";
import { createBaseConfig, reactConfig } from "@doenet-tools/eslint-config";

export default tseslint.config(
  ...createBaseConfig(import.meta.dirname),
  ...reactConfig,
  {
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
      "react/no-unescaped-entities": "off", // Allow apostrophes and quotes in text
    },
  },
  // Talk to /api only through the typed client in src/api/client.ts, so
  // every call is checked against the API contract. Existing untyped calls
  // are recorded in eslint-suppressions.json; that list may only shrink.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/api/client.ts", "src/**/*.cy.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "axios",
              message:
                'Call the API with api("operationName", params) from src/api/client.ts. If the route is not in the API contract yet, add it first.',
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='fetch'] > :first-child[value=/^\\/api/], CallExpression[callee.name='fetch'] > TemplateLiteral:first-child[quasis.0.value.raw=/^\\/api/]",
          message:
            'Call the API with api("operationName", params) from src/api/client.ts.',
        },
      ],
    },
  },
);
