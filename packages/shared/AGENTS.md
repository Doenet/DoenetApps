# Shared — Agent Instructions

See root `AGENTS.md` for commands and overall architecture.

## When to add something here

- **`packages/shared`** — types or utilities needed by both `apps/app` and `apps/api` at runtime
- **`apps/app/src/types.ts` + `apps/api/src/types.ts`** — types that are identical today but may diverge per platform; update both files
- **`types_module_specific.ts`** (in each workspace) — types that differ between app and api

If you add to `packages/shared`, rebuild it before `app` or `api` will pick up the change:
```bash
npm run build --workspace @doenet-tools/shared
```
