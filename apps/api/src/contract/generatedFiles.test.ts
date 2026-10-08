import { describe, expect, test } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { renderContractFiles, repoRoot } from "../../scripts/contract/render";

describe("generated contract files", () => {
  test("openapi.json and the client types match the contracts", async () => {
    const files = await renderContractFiles();
    for (const [relative, expected] of Object.entries(files)) {
      const absolute = path.join(repoRoot, relative);
      const actual = fs.existsSync(absolute)
        ? fs.readFileSync(absolute, "utf8")
        : "";
      expect(
        actual === expected,
        `${relative} is out of date: run \`npm run contract:generate --workspace @doenet-tools/api\``,
      ).toBe(true);
    }
  });
});
