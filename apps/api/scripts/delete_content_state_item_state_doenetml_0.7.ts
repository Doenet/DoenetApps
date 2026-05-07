// This script deletes the content state and item state for all assignments
// that were created with DoenetML version 0.7.
// Usage (must be in server directory): npx tsx scripts/delete_content_state_item_state_doenetml_0.7.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deleteItemState = await prisma.contentItemState.updateMany({
    where: {
      document: {
        doenetmlVersion: {
          displayedVersion: "0.7",
        },
      },
    },
    data: {
      state: null,
    },
  });

  console.log(`Deleted item state for ${deleteItemState.count} items.`);

  const deleteContentState = await prisma.contentState.updateMany({
    where: {
      assignment: {
        doenetmlVersion: {
          displayedVersion: "0.7",
        },
      },
    },
    data: {
      state: null,
    },
  });

  console.log(`Deleted content state for ${deleteContentState.count} items.`);
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
