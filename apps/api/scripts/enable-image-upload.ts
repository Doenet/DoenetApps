// Grants the image-upload early-access flag to a user, looked up by email.
// Idempotent: running it on an already-enabled account succeeds and reports
// "already enabled".
// -----
// Local dev (from apps/api, requires tsx):
//   npx tsx scripts/enable-image-upload.ts <email>
//
// Production (inside the running ECS Fargate task, cwd is /DoenetTools/apps/api):
//   node dist/scripts/enable-image-upload.js <email>
//
// To reach the prod container: run `infra/scripts/exec.sh -s prod` from the
// repo root, pick the api service/task, then run the command above.
// -----
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/enable-image-upload.ts <email>");
    process.exit(2);
  }

  const user = await prisma.users.findUnique({
    where: { email },
    select: { userId: true, canUploadImages: true },
  });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  if (user.canUploadImages) {
    console.log(`${email} already has image uploads enabled.`);
    return;
  }

  await prisma.users.update({
    where: { email },
    data: { canUploadImages: true },
  });
  console.log(`Enabled image uploads for ${email}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
