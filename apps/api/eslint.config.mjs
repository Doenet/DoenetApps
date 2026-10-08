// @ts-check

import { createBaseConfig } from "@doenet-tools/eslint-config";

const permissionFilter =
  "/^(filter(Editable|Viewable)(Content|Activity)|(editable|viewable)ContentWhere)$/";

export default [
  ...createBaseConfig(import.meta.dirname),

  // The permission filters take an `isEditor` flag that must come from the
  // database (`getIsEditor`/`mustBeEditor`). A hard-coded flag silently denies
  // curators access to library content (or grants it to non-curators).
  // For deliberate non-editor access, use `filterOwnedContent`,
  // `filterOwnedActivity`, or the `...AsNonEditor` filters instead.
  {
    files: ["src/**/*.ts"],
    ignores: ["src/utils/permissions.ts", "src/test/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `CallExpression[callee.name=${permissionFilter}] > Literal.arguments:nth-child(2)`,
          message:
            "Don't hard-code `isEditor`. Pass the value from `getIsEditor`/`mustBeEditor`, or use `filterOwned*` / `filter*AsNonEditor` for deliberate non-editor access.",
        },
      ],
    },
  },
];
