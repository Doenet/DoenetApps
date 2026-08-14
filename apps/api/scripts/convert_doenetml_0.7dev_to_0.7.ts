// One-off migration: move a single user's documents off the `0.7dev`
// DoenetML version and onto the released `0.7` version.
//
// Prisma is used (rather than a raw SQL query against prod) so that the
// version rows are looked up by their `displayedVersion` string instead of a
// hard-coded id, and so there is no chance of a typo in a manual UPDATE.
//
// It resolves the source version (`0.7dev`) and target version (`0.7`) by
// their `displayedVersion`, finds the requested owner by `username`, and
// repoints every `content` row that user owns from the source to the target
// version id.
//
// Usage:
//   Local dev (tsx available), DATABASE_URL pointed at the target DB:
//     npx tsx scripts/convert_doenetml_0.7dev_to_0.7.ts <username> [--dry-run]
//   Inside the prod/dev3 container (devDeps pruned, run the compiled JS from
//   the apps/api WORKDIR; reach a shell via infra/scripts/exec.sh -s <stack>):
//     node dist/scripts/convert_doenetml_0.7dev_to_0.7.js <username> [--dry-run]
//
// --dry-run reports how many rows would change and exits without writing.
// Always run --dry-run first against a new environment (especially prod).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FROM_VERSION = "0.7dev";
const TO_VERSION = "0.7";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const username = args.find((a) => !a.startsWith("--"));

  if (!username) {
    console.error(
      "Usage: convert_doenetml_0.7dev_to_0.7 <username> [--dry-run]",
    );
    process.exit(1);
  }

  const fromVersion = await prisma.doenetmlVersions.findUnique({
    where: { displayedVersion: FROM_VERSION },
  });
  const toVersion = await prisma.doenetmlVersions.findUnique({
    where: { displayedVersion: TO_VERSION },
  });

  if (!fromVersion) {
    console.error(
      `No doenetmlVersions row with displayedVersion="${FROM_VERSION}".`,
    );
    process.exit(1);
  }
  if (!toVersion) {
    console.error(
      `No doenetmlVersions row with displayedVersion="${TO_VERSION}".`,
    );
    process.exit(1);
  }

  const user = await prisma.users.findUnique({
    where: { username },
    select: { userId: true },
  });
  if (!user) {
    console.error(`No users row with username="${username}".`);
    process.exit(1);
  }

  const where = {
    ownerId: user.userId,
    doenetmlVersionId: fromVersion.id,
  };

  const count = await prisma.content.count({ where });
  console.log(
    `${username}: ${count} content row(s) at "${FROM_VERSION}" (id=${fromVersion.id}) ` +
      `to move to "${TO_VERSION}" (id=${toVersion.id}).`,
  );

  if (dryRun) {
    console.log(`[dry-run] would update ${count} row(s). No changes made.`);
    return;
  }

  const result = await prisma.content.updateMany({
    where,
    data: { doenetmlVersionId: toVersion.id },
  });
  console.log(`Done. Updated ${result.count} content row(s).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
