import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, test } from "vitest";

// The `no-restricted-syntax` rule in eslint.config.mjs matches these names by
// regex. If one is renamed, or another config block replaces the rule, the
// guard stops firing without any error, so check it still does.
const filters = [
  "filterEditableContent",
  "filterEditableActivity",
  "filterViewableContent",
  "filterViewableActivity",
  "editableContentWhere",
  "viewableContentWhere",
];

const apiRoot = path.resolve(__dirname, "../..");

/** Lint `lines` as a file in src/query and return the 1-based lines the rule flags. */
function flaggedLines(lines: string[]) {
  let output: string;
  try {
    output = execFileSync(
      "npx",
      [
        "eslint",
        "--format",
        "json",
        "--stdin",
        "--stdin-filename",
        "src/query/lintRuleFixture.ts",
      ],
      { cwd: apiRoot, input: lines.join("\n") + "\n", encoding: "utf8" },
    );
  } catch (error) {
    // eslint exits 1 when it reports errors; the JSON is still on stdout
    output = (error as { stdout: string }).stdout;
  }
  const [result] = JSON.parse(output) as {
    messages: { ruleId: string | null; line: number }[];
  }[];
  return result.messages
    .filter((m) => m.ruleId === "no-restricted-syntax")
    .map((m) => m.line);
}

describe("isEditor lint rule", () => {
  test("every guarded filter is still exported by permissions.ts", () => {
    const source = readFileSync(
      path.join(apiRoot, "src/utils/permissions.ts"),
      "utf8",
    );
    for (const name of filters) {
      expect(source).toContain(`export function ${name}(`);
    }
  });

  test("rejects a literal flag and allows a variable", () => {
    const lines = filters.flatMap((name, i) => [
      `export const a${i} = ${name}(id, false);`,
      `export const b${i} = ${name}(id, true);`,
      `export const c${i} = ${name}(id, isEditor);`,
    ]);
    const expected = filters.flatMap((_, i) => [3 * i + 1, 3 * i + 2]);
    expect(flaggedLines(lines)).toEqual(expected);
  });
});
