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
);
