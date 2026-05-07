// This script fills in missing share dates for public content
// We don't have the exact time when they we shared,
// so we fill in the field with the present time
// -----
// Usage (must be in server directory):
// npx tsx scripts/fix_public_content_without_share_date.ts
// -----
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const { count: changedItems } = await prisma.content.updateMany({
    where: {
      isPublic: true,
      publiclySharedAt: null,
    },
    data: {
      publiclySharedAt: new Date(),
    },
  });

  console.log(`Updated publiclySharedAt for ${changedItems} items.`);
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
