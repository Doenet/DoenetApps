// Stage 03b: after 03-import completes, rewrite cross-activity <ref> links in
// the imported document sources so they point at the migrated copies
// (doenet:activityId=<legacy id> -> doenet:activityId=<new short id>, resolved
// within the same owner's copy). Requires the completed journal
// (build/id-map.tsv) — run it any time after 03-import; it UPDATEs sources in
// place, no re-import. Only journaled documents are touched.
//
// Idempotent: rewritten ids no longer match any journal mapping, so a re-run
// changes nothing (they show up as "unresolved" alongside genuinely
// untranslatable targets — e.g. activities that were never migrated).
//
//   npx tsx scripts/legacy-migration/03b-rewrite-refs.ts [--dry-run] [--user=<email>]
//                                                        [--yes-target=<db-host>]
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadConfig } from "./config";
import { fromUUID, toUUID } from "../../src/utils/uuid";
import { Journal } from "./journal";
import { rewriteActivityRefs } from "./rewriteRefs";

const prisma = new PrismaClient();

async function main() {
  const config = loadConfig();
  const journalPath = path.join(config.buildDir, "id-map.tsv");
  if (!fs.existsSync(journalPath)) {
    throw new Error(`journal not found: ${journalPath} — run 03-import first`);
  }
  const journal = new Journal(journalPath);

  // ---- target guard (same policy as 03-import) -----------------------------
  const dbUrl = new URL(process.env.DATABASE_URL ?? "");
  const host = dbUrl.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  console.log(`Target database: ${host}:${dbUrl.port} ${dbUrl.pathname}`);
  if (!isLocal && !config.dryRun && config.yesTarget !== host) {
    throw new Error(
      `Refusing to write to non-local database ${host} without --yes-target=${host}`,
    );
  }

  // ---- build lookup tables from the journal ---------------------------------
  // per owner: legacy activity id -> new short id
  const ownerMaps = new Map<string, Map<string, string>>();
  // migrated document short id -> owner email
  const docOwner = new Map<string, string>();
  for (const row of journal.allRows()) {
    if (row.newId === "DRY") continue;
    const email = row.ownerEmail.toLowerCase();
    if (row.kind === "activity") {
      let map = ownerMaps.get(email);
      if (!map) {
        map = new Map();
        ownerMaps.set(email, map);
      }
      map.set(row.legacyId, row.newId);
      if (row.newType === "singleDoc") {
        docOwner.set(row.newId, email);
      }
    } else if (row.kind === "page") {
      docOwner.set(row.newId, email);
    }
  }
  console.log(
    `journal: ${ownerMaps.size} owners, ${docOwner.size} migrated documents`,
  );

  // ---- candidate documents ----------------------------------------------------
  // Cheap DB-side prefilter; the journal filter below is what guarantees we
  // only ever touch migrated content.
  const candidates: { id: Uint8Array; source: string }[] =
    await prisma.$queryRaw`
      SELECT id, source FROM content
      WHERE type = 'singleDoc' AND isDeletedOn IS NULL
        AND (source LIKE '%activityId=%' OR source LIKE '%doenetId=%')`;
  console.log(`${candidates.length} candidate documents on target`);

  const stats: Record<string, number> = {
    docsScanned: 0,
    docsRewritten: 0,
    refsRewritten: 0,
    copyRefsSeen: 0,
  };
  const unresolvedCounts = new Map<string, number>();

  for (const doc of candidates) {
    const shortId = fromUUID(doc.id);
    const email = docOwner.get(shortId);
    if (!email) continue; // not migrated content
    if (config.onlyUser && email !== config.onlyUser) continue;
    stats.docsScanned++;

    const map = ownerMaps.get(email)!;
    const result = rewriteActivityRefs(doc.source, (legacyId) => {
      return map.get(legacyId) ?? null;
    });
    stats.copyRefsSeen += result.copyRefs;
    for (const id of result.unresolved) {
      unresolvedCounts.set(id, (unresolvedCounts.get(id) ?? 0) + 1);
    }
    if (result.rewritten.length === 0) continue;

    stats.refsRewritten += result.rewritten.length;
    stats.docsRewritten++;
    if (!config.dryRun) {
      await prisma.content.update({
        where: { id: toUUID(shortId) },
        data: { source: result.source },
      });
    }
  }

  // ---- report --------------------------------------------------------------------
  const unresolved = [...unresolvedCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  );
  const lines = [
    `# Legacy ref-rewrite report`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Dry run: ${config.dryRun}`,
    ``,
    `## Stats`,
    ``,
    ...Object.entries(stats).map(([k, v]) => `- ${k}: ${v}`),
    `- unresolvedDistinctIds: ${unresolved.length}`,
    ``,
    `copyRefsSeen counts <copy uri="doenet:...="> transclusions, which are`,
    `left untouched (they fetch through legacy-server APIs; see the plan).`,
    `On a re-run, already-rewritten new ids appear under unresolved — that is`,
    `expected and harmless.`,
    ``,
    `## Unresolved ids (occurrences)`,
    ``,
    ...unresolved.slice(0, 200).map(([id, n]) => `- ${id}: ${n}`),
    ...(unresolved.length > 200
      ? [`- ... and ${unresolved.length - 200} more`]
      : []),
    ``,
  ];
  const reportPath = path.join(config.buildDir, "ref-rewrite-report.md");
  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(`Wrote ${reportPath}`);
  console.log(stats, `unresolved distinct: ${unresolved.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
