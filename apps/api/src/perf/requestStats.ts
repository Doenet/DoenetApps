import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Database work done while handling one request.
 *
 * `queries` counts Prisma operations, not SQL statements. Prisma's per-SQL
 * `query` events don't carry the async context, so they can't be tied to a
 * request. With `relationJoins`, an operation with includes is still one
 * statement, so the count is exact enough to expose N+1 loops.
 *
 * `dbMs` sums the operations' durations, so with concurrent operations
 * (`Promise.all`, a `$transaction` array) it can exceed the request's wall
 * time.
 */
export type RequestStats = {
  queries: number;
  dbMs: number;
};

const storage = new AsyncLocalStorage<RequestStats>();

/** Run `fn` with a fresh `RequestStats` that queries inside it add to. */
export function runWithRequestStats<T>(stats: RequestStats, fn: () => T): T {
  return storage.run(stats, fn);
}

/** Record one Prisma operation against the current request, if any. */
export function recordQuery(durationMs: number) {
  const stats = storage.getStore();
  if (stats) {
    stats.queries++;
    stats.dbMs += durationMs;
  }
}
