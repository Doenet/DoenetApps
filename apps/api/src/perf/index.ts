// `perf` — per-request performance measurement.
//
//   requestStats    — per-request query count and DB time (AsyncLocalStorage)
//   prismaExtension — Prisma client extension that feeds requestStats
//   middleware      — Server-Timing header and one log line per API request
//
// Log lines have `"type": "perf.request"`; the `<env>-doenet-perf` dashboard
// (prod and dev3) queries them.
// See CONTEXT.md (Performance) for the vocabulary.
// Import from here, not from a source file.

export { perfQueryExtension } from "./prismaExtension";
export { perfMiddleware, perfOptionsFromEnv } from "./middleware";
export type { PerfOptions } from "./middleware";
