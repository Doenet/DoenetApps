// One-off cleanup for the bloated prod `Session` table.
//
// Background: with express-session's `saveUninitialized: true` (fixed in
// commit 48ae3303c), every unauthenticated request (ALB health checks, bots,
// static hits) inserted an empty Session row. Those rows carry a 1-year
// `expiresAt` (the cookie maxAge), so the store's expiry sweep never removed
// them and the table grew without bound, making the O(table-size) 2-minute
// sweep expensive enough to spike CPU. This drains the accumulated backlog.
//
// Safe deletion filter: keep only live logged-in sessions. Nothing but Passport
// writes to `req.session`, so a row is deletable iff it is expired OR its `data`
// contains no `passport` key (i.e. never authenticated). Logged-in sessions,
// including anonymous student accounts mid-assignment, are preserved.
//
// Deletes in bounded batches so InnoDB never holds a giant transaction / long
// lock / replication spike; sessions written during the run are untouched.
//
// Usage:
//   Local dev (tsx available), DATABASE_URL pointed at the target DB:
//     npx tsx scripts/delete_empty_sessions.ts [--dry-run]
//   Inside the prod/dev3 container (devDeps pruned, run the compiled JS from
//   the apps/api WORKDIR; reach a shell via infra/scripts/exec.sh -s <stack>):
//     node dist/scripts/delete_empty_sessions.js [--dry-run]
//
// --dry-run reports the counts it would delete/keep and exits without deleting.
// Always run --dry-run first against a new environment (especially prod).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Rows deleted per statement. Validated integer constant (not user input), so
// it is safe to inline into the raw DELETE below.
const BATCH = 10_000;

// A row is deletable iff it is expired OR was never authenticated (no passport
// key in its serialized session data). Kept in sync with the DELETE below.
const DELETABLE_WHERE = `expiresAt < NOW() OR data NOT LIKE '%passport%'`;

async function reportCounts(label: string) {
  const [row] = await prisma.$queryRawUnsafe<
    { total: bigint; keep: bigint; deletable: bigint }[]
  >(
    `SELECT COUNT(*) AS total,
            SUM(NOT (${DELETABLE_WHERE})) AS keep,
            SUM(${DELETABLE_WHERE}) AS deletable
     FROM Session`,
  );
  console.log(
    `${label}: total=${row.total} keep(logged-in & unexpired)=${row.keep} deletable=${row.deletable}`,
  );
  return row;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const before = await reportCounts("before");

  if (dryRun) {
    console.log(
      `[dry-run] would delete ${before.deletable} rows, keep ${before.keep}. No changes made.`,
    );
    return;
  }

  let total = 0;
  for (;;) {
    const n = await prisma.$executeRawUnsafe(
      `DELETE FROM Session WHERE (${DELETABLE_WHERE}) LIMIT ${BATCH}`,
    );
    total += n;
    console.log(`deleted ${n} (running total ${total})`);
    if (n === 0) break;
    await new Promise((r) => setTimeout(r, 200)); // ease replication / CPU
  }

  await reportCounts("after");
  console.log(`Done. Deleted ${total} empty/expired sessions.`);
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
