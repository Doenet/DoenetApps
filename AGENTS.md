# Doenet Apps — Agent Instructions

Doenet is an educational technology platform — **npm workspace monorepo** (Node.js 24 required).

- `apps/api` — Express REST API + Prisma + MySQL
- `apps/app` — React SPA (main client)
- `apps/web` — Astro static site
- `packages/shared` — types and utilities shared by `api` and `app`; **must be built before either app**
- `packages/e2e-tests` — Cypress end-to-end tests
- `packages/load-tests` — Locust load tests

## Commands

```bash
npm ci                                              # install
npm run dev                                         # shared watcher + api (3000) + app (8000) + web (4321)
npm run build                                       # all workspaces
npm run format && npm run lint                      # always run before finishing work
npm run db:setup                                    # migrate + seed (dev only — first-time or after schema changes)
npm test --workspace @doenet-tools/api              # Vitest unit tests (append filename for single file)
npm run test:all --workspace @doenet-tools/app      # Cypress component tests, headless
npm run test:all --workspace @doenet-tools/e2e-tests  # Cypress e2e tests, headless (needs dev servers)
```

> **Always run Prettier and ESLint on changed files. Tests must pass before committing.**

## Architecture

```
Browser → Vite (8000) → /api/* proxy → Express (3000) → Prisma → MySQL
```

In production, `app` is built as static files served by Express.

- **`apps/api/`** — see `apps/api/AGENTS.md` for route, error, and UUID conventions
- **`apps/app/`** — see `apps/app/AGENTS.md` for routing and mutation patterns
- **`apps/web/`** — see `apps/web/AGENTS.md` for Astro stack and blog frontmatter schema
- **`packages/shared/`** — see `packages/shared/AGENTS.md` for when to add shared types/utilities

## Pull Requests

Development uses a fork workflow. Push branches to `origin` (your fork), then open a PR targeting `upstream/main`. Merged PRs deploy to production after human sign-off.

Database and API changes must follow the **expand-migrate-contract** pattern: each merged PR must be safe to deploy on its own, so add new columns/endpoints before removing old ones across separate PRs.

## Cross-cutting Conventions

- TypeScript **strict mode is enforced** across all workspaces
- `apps/app/src/types.ts` and `apps/api/src/types.ts` are **intentionally identical** — update both; platform-specific differences go in `types_module_specific.ts`
