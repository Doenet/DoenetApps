import { Prisma } from "@prisma/client";
import { performance } from "node:perf_hooks";
import { recordQuery } from "./requestStats";

/** Counts and times every Prisma operation against the current request. */
export const perfQueryExtension = Prisma.defineExtension({
  name: "perf",
  query: {
    async $allOperations({ args, query }) {
      const start = performance.now();
      try {
        return await query(args);
      } finally {
        recordQuery(performance.now() - start);
      }
    },
  },
});
