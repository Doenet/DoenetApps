// Shared configuration for the legacy-migration stages.
//
// All stages run from the apps/api directory (so `.env` and relative build
// paths resolve), e.g.:
//   npx tsx scripts/legacy-migration/01-extract.ts
import path from "node:path";
import os from "node:os";
import dotenv from "dotenv";

dotenv.config();

export interface MigrationConfig {
  /** MySQL URL of the scratch database holding the legacy dump. */
  legacyScratchUrl: string;
  /** Directory containing the extracted legacy media tree (has byPageId/). */
  legacyMediaDir: string;
  /** Directory for stage artifacts (model.json, image-map.json, id-map.tsv, reports). */
  buildDir: string;
  /** Plan and report everything, but write nothing to the target DB or S3. */
  dryRun: boolean;
  /** Restrict the import to a single legacy user, matched by email. */
  onlyUser: string | null;
  /** Confirmation that the operator means to write to this DB host. */
  yesTarget: string | null;
}

export function loadConfig(argv: string[] = process.argv.slice(2)) {
  const config: MigrationConfig = {
    legacyScratchUrl:
      process.env.LEGACY_SCRATCH_DATABASE_URL ??
      "mysql://root:root@127.0.0.1:3307/legacy_migration",
    legacyMediaDir:
      process.env.LEGACY_MEDIA_DIR ??
      path.join(os.homedir(), "legacy-migration", "input", "media"),
    buildDir: process.env.LEGACY_BUILD_DIR ?? "scripts/legacy-migration/build",
    dryRun: false,
    onlyUser: null,
    yesTarget: null,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      config.dryRun = true;
    } else if (arg.startsWith("--user=")) {
      config.onlyUser = arg.slice("--user=".length).toLowerCase();
    } else if (arg.startsWith("--yes-target=")) {
      config.yesTarget = arg.slice("--yes-target=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return config;
}
