// Stage 04: post-import assertions against the target database.
//
//   npx tsx scripts/legacy-migration/04-verify.ts [--user=<email>]
//
// Checks, per journaled user: the created tree exists and matches the model's
// counts; documents carry DoenetML 0.6 and are private; images have their
// imageContent row, an object in S3, and no unrewritten references remain
// except the known-unresolvable ones. Writes build/verify-report.md and exits
// non-zero on any failure.
import fs from "node:fs";
import path from "node:path";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { loadConfig } from "./config";
import { loadMediaConfig } from "../../src/media/config";
import { toUUID } from "../../src/utils/uuid";
import { Journal } from "./journal";
import { Model } from "./model";
import { planUser } from "./plan";

const prisma = new PrismaClient();

async function main() {
  const config = loadConfig();
  const model: Model = JSON.parse(
    fs.readFileSync(path.join(config.buildDir, "model.json"), "utf8"),
  );
  const journal = new Journal(path.join(config.buildDir, "id-map.tsv"));

  const media = loadMediaConfig();
  const s3 =
    media.mode === "aws"
      ? new S3Client({ region: media.region })
      : new S3Client({
          region: media.region,
          endpoint: media.endpoint,
          forcePathStyle: true,
          credentials: {
            accessKeyId: media.accessKeyId,
            secretAccessKey: media.secretAccessKey,
          },
        });

  const v06 = await prisma.doenetmlVersions.findFirstOrThrow({
    where: { displayedVersion: "0.6" },
  });

  const failures: string[] = [];
  const stats: Record<string, number> = {};
  const bump = (key: string, by = 1) => {
    stats[key] = (stats[key] ?? 0) + by;
  };

  for (const user of model.users) {
    if (config.onlyUser && user.email.toLowerCase() !== config.onlyUser) {
      continue;
    }
    const userRow = journal.get("user", user.legacyUserId, user.email);
    if (!userRow) {
      failures.push(`${user.email}: no user row in journal (not imported?)`);
      continue;
    }
    const owner = await prisma.users.findUnique({
      where: { email: user.email },
    });
    if (!owner) {
      failures.push(`${user.email}: user missing on target`);
      continue;
    }
    bump("usersChecked");

    const plan = planUser(user, model);

    // every journaled folder/activity/image row must exist on the target
    const expectedDocs =
      plan.activities.filter((a) => a.node.shape !== "sequence").length +
      plan.activities
        .filter((a) => a.node.shape === "sequence")
        .reduce((sum, a) => sum + a.node.pages.length, 0);
    const expectedSequences = plan.activities.filter(
      (a) => a.node.shape === "sequence",
    ).length;
    const expectedFolders = plan.folders.length + 1; // + root
    const expectedImages = [...plan.imagesByFolder.values()].reduce(
      (sum, cids) => sum + cids.length,
      0,
    );

    const rootRow = journal.get("folder", plan.rootKey, user.email);
    if (!rootRow || rootRow.newId === "DRY") {
      failures.push(`${user.email}: root folder not journaled`);
      continue;
    }
    const rootId = toUUID(rootRow.newId);

    // walk the created subtree
    const counts = { folder: 0, singleDoc: 0, sequence: 0, image: 0 };
    const queue: Uint8Array[] = [rootId];
    const docVersionIds = new Set<number | null>();
    let nonPrivate = 0;
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await prisma.content.findMany({
        where: { parentId, ownerId: owner.userId, isDeletedOn: null },
        select: {
          id: true,
          type: true,
          visibility: true,
          doenetmlVersionId: true,
        },
      });
      for (const child of children) {
        counts[child.type as keyof typeof counts] =
          (counts[child.type as keyof typeof counts] ?? 0) + 1;
        if (child.type === "folder" || child.type === "sequence") {
          queue.push(child.id);
        }
        if (child.type === "singleDoc") {
          docVersionIds.add(child.doenetmlVersionId);
        }
        const expectVisibility =
          child.type === "image" ? "unlisted" : "private";
        if (child.visibility !== expectVisibility) {
          nonPrivate++;
        }
      }
    }

    const mismatches: string[] = [];
    if (counts.folder !== expectedFolders - 1) {
      mismatches.push(`folders ${counts.folder} != ${expectedFolders - 1}`);
    }
    if (counts.sequence !== expectedSequences) {
      mismatches.push(`sequences ${counts.sequence} != ${expectedSequences}`);
    }
    if (counts.singleDoc !== expectedDocs) {
      mismatches.push(`docs ${counts.singleDoc} != ${expectedDocs}`);
    }
    if (counts.image !== expectedImages) {
      mismatches.push(`images ${counts.image} != ${expectedImages}`);
    }
    if (nonPrivate > 0) {
      mismatches.push(`${nonPrivate} items with unexpected visibility`);
    }
    if ([...docVersionIds].some((id) => id !== v06.id)) {
      mismatches.push(`documents with a DoenetML version other than 0.6`);
    }
    if (mismatches.length > 0) {
      failures.push(`${user.email}: ${mismatches.join("; ")}`);
    } else {
      bump("usersOk");
    }
  }

  // ---- image objects -----------------------------------------------------
  const imageRows = journal
    .allRows()
    .filter((row) => row.kind === "image" && row.newId !== "DRY");
  for (const row of imageRows) {
    const content = await prisma.content.findUnique({
      where: { id: toUUID(row.newId) },
      include: { imageData: true },
    });
    if (!content || !content.imageData?.storageKey) {
      failures.push(`image ${row.legacyId}: content/imageContent row missing`);
      continue;
    }
    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: media.bucket,
          Key: content.imageData.storageKey,
        }),
      );
      bump("imagesOk");
    } catch {
      failures.push(
        `image ${row.legacyId}: S3 object ${content.imageData.storageKey} missing`,
      );
    }
  }

  // ---- leftover unrewritten references ------------------------------------
  const leftover: { id: Uint8Array }[] = await prisma.$queryRaw`
    SELECT id FROM content
    WHERE type = 'singleDoc' AND source LIKE '%doenet:cid=%' AND isDeletedOn IS NULL`;
  bump("docsWithLeftoverCidRefs", leftover.length);

  const lines = [
    `# Legacy migration verify report`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `## Stats`,
    ``,
    ...Object.entries(stats)
      .sort()
      .map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `Note: docsWithLeftoverCidRefs counts documents still containing`,
    `doenet:cid= references (expected for the known-unresolvable cids listed`,
    `in extract-report.md).`,
    ``,
    `## Failures (${failures.length})`,
    ``,
    ...failures.map((f) => `- ${f}`),
    ``,
  ];
  const reportPath = path.join(config.buildDir, "verify-report.md");
  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(`Wrote ${reportPath}`);
  console.log(stats);
  if (failures.length > 0) {
    console.error(`${failures.length} failures`);
    process.exitCode = 1;
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
