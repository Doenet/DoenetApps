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
// Usage (must be run from the apps/api directory, e.g. inside the prod
// container via infra/scripts/exec.sh):
//   npx tsx scripts/delete_empty_sessions.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Rows deleted per statement. Validated integer constant (not user input), so
// it is safe to inline into the raw DELETE below.
const BATCH = 10_000;

async function main() {
  let total = 0;
  for (;;) {
    const n = await prisma.$executeRawUnsafe(
      `DELETE FROM Session
       WHERE (expiresAt < NOW() OR data NOT LIKE '%passport%')
       LIMIT ${BATCH}`,
    );
    total += n;
    console.log(`deleted ${n} (running total ${total})`);
    if (n === 0) break;
    await new Promise((r) => setTimeout(r, 200)); // ease replication / CPU
  }
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
