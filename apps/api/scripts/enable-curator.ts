// Makes a user a library curator (sets isEditor), looked up by email.
// Idempotent: running it on an account that is already a curator succeeds and
// reports "already a curator".
// -----
// Local dev (from apps/api, requires tsx):
//   npx tsx scripts/enable-curator.ts <email>
//
// Production (inside the running ECS Fargate task, cwd is /DoenetTools/apps/api):
//   node dist/scripts/enable-curator.js <email>
//
// To reach the prod container: run `infra/scripts/exec.sh -s prod` from the
// repo root, pick the api service/task, then run the command above.
// -----
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/enable-curator.ts <email>");
    process.exit(2);
  }

  const user = await prisma.users.findUnique({
    where: { email },
    select: { userId: true, isEditor: true },
  });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  if (user.isEditor) {
    console.log(`${email} is already a curator.`);
    return;
  }

  await prisma.users.update({
    where: { email },
    data: { isEditor: true },
  });
  console.log(`Made ${email} a curator.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
