/**
 * Regenerate the committed OpenAPI document and the client types from the
 * API contract. Run after changing any operation contract:
 *
 *   npm run contract:generate --workspace @doenet-tools/api
 */
import * as fs from "fs/promises";
import * as path from "path";
import { renderContractFiles, repoRoot } from "./render";

async function main() {
  const files = await renderContractFiles();
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(repoRoot, relative);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, contents);
    console.log(`wrote ${relative}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
