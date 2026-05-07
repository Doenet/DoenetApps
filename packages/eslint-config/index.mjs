// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";
import importPlugin from "eslint-plugin-import";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import mocha from "eslint-plugin-mocha";

/**
 * Creates the base ESLint config for a workspace.
 * @param {string} dirname - Pass `import.meta.dirname` from the workspace's eslint.config.mjs.
 */
export function createBaseConfig(dirname) {
  return tseslint.config(
    // Global ignores
    {
      ignores: [
        "**/dist/**",
        "**/.astro/**",
        "vite.config.ts",
        "**/cypress/screenshots/**",
        "**/cypress/videos/**",
        "**/cypress/downloads/**",
        "**/cypress/accessibility/**",
        "**/runner-results/**",
      ],
    },

    // Base ESLint rules for all files
    eslint.configs.recommended,

    // TypeScript configuration for source files
    // Note: we use `recommended` (not `recommendedTypeChecked`), so no `project` is needed.
    // Adding `project` would create an expensive TypeScript program that serves no purpose here.
    {
      files: ["**/*.ts", "**/*.tsx"],
      extends: [...tseslint.configs.recommended],
      languageOptions: {
        parserOptions: {
          tsconfigRootDir: dirname,
        },
      },
      plugins: {
        "unused-imports": unusedImports,
        import: importPlugin,
      },
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "unused-imports/no-unused-imports": "error",

        // Allow unused vars that start with underscore
        // See https://typescript-eslint.io/rules/no-unused-vars/
        "unused-imports/no-unused-vars": [
          "warn",
          {
            args: "all",
            argsIgnorePattern: "^_",
            caughtErrors: "all",
            caughtErrorsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            ignoreRestSiblings: true,
          },
        ],
        "import/no-extraneous-dependencies": [
          "error",
          {
            packageDir: [dirname],
            devDependencies: [
              "**/*.test.ts",
              "**/*.spec.ts",
              "**/*.cy.ts",
              "**/test/**",
              "**/__tests__/**",
              "**/cypress/**",
              "cypress.config.ts",
            ],
          },
        ],
      },
    },
  );
}

/** Shared React + Mocha config. Spread after `createBaseConfig` for React workspaces. */
export const reactConfig = tseslint.config(
  react.configs.flat.recommended,
  reactHooks.configs["recommended-latest"],
  {
    plugins: {
      mocha,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off", // Not needed with new JSX transform
      "react/jsx-uses-react": "off", // Not needed with new JSX transform
      "mocha/no-exclusive-tests": "error", // Prevent .only in specs
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
