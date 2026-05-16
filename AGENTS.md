# Doenet Tools — Agent Instructions

## Project Overview

Doenet Tools is an educational technology platform built as an **npm workspace monorepo**. The workspaces are split across two directories:

- `apps/` — runnable applications
  - `api/` (`@doenet-tools/api`) — Express REST API
  - `app/` (`@doenet-tools/app`) — React SPA (the main client)
  - `web/` (`@doenet-tools/web`) — Astro static site
- `packages/` — shared libraries
  - `shared/` (`@doenet-tools/shared`) — utility functions and types used by both client and server
  - `e2e-tests/` (`@doenet-tools/e2e-tests`) — Cypress end-to-end tests
  - `eslint-config/` (`@doenet-tools/eslint-config`) — shared ESLint config (internal tooling only)

Node.js 24 is required.

---

## Commands

### Install

```bash
npm ci
```

### Dev servers

```bash
npm run dev                                 # builds shared once, then runs api/app/web
npm run dev --workspace @doenet-tools/api   # Express API on port 3000
npm run dev --workspace @doenet-tools/app   # Vite dev server on port 8000 (proxies /api to port 3000)
npm run watch --workspace @doenet-tools/shared # shared TypeScript watcher when needed
```

### Build

```bash
npm run build
```

or step by step (shared must be built first):

```bash
npm run build --workspace @doenet-tools/shared   # build first (app and api depend on it)
npm run build --workspace @doenet-tools/app       # tsc + vite build
npm run build --workspace @doenet-tools/api       # tsc
npm run build --workspace @doenet-tools/web       # astro build
```

### Format & Lint

```bash
npm run format             # Prettier write (all workspaces)
npm run format:check       # Prettier check
npm run lint               # ESLint fix (all workspaces with a lint script)
npm run lint:check         # ESLint check (all workspaces with a lint script)
```

Each workspace also has its own `lint` / `lint:check` scripts.

After making code changes, always format the changed files via Prettier before finishing.

### Database (`api` workspace)

```bash
npm run prisma:migrate-dev --workspace @doenet-tools/api
npm run prisma:seed --workspace @doenet-tools/api
npm run prisma:generate --workspace @doenet-tools/api
```

### Tests

**API unit tests (Vitest):**

```bash
npm test --workspace @doenet-tools/api                              # run all
npm test --workspace @doenet-tools/api activity.test.ts             # run a single file
```

**App component tests (Cypress):**

```bash
npm run test --workspace @doenet-tools/app              # open Cypress UI
npm run test:all --workspace @doenet-tools/app          # headless, all tests
npm run test:group1 --workspace @doenet-tools/app       # headless, @group1 tag only
```

**E2E tests (Cypress, requires both dev servers running):**

```bash
npm run test --workspace @doenet-tools/e2e-tests         # open Cypress UI
npm run test:all --workspace @doenet-tools/e2e-tests     # headless, all tests
npm run test:group1 --workspace @doenet-tools/e2e-tests  # headless, @group1 tag only
```

To run a single Cypress spec interactively, open the Cypress UI (`npm run test`) and select the file.

---

## Architecture

### Data Flow

```
Browser → Vite dev server (port 8000) → /api/* proxy → Express server (port 3000) → Prisma → MySQL
```

In production, the client is built as static files served by the Express server.

### App (`apps/app/`)

- **React 19** SPA with **React Router v7** (data router pattern)
- **Chakra UI v2** for components, **Jost** font, **MathJax** via `better-react-mathjax`
- All routes are defined in `apps/app/src/index.tsx` using `createBrowserRouter`
- Each route file (`apps/app/src/paths/*.tsx`) exports a `loader` and optionally an `action` alongside the page component
- Most form/mutation actions go through a **`genericAction`** in `index.tsx`: it reads `{ path, ...body }` from the request JSON and calls `axios.post('/api/${path}', body)`, optionally redirecting on success
- API calls use **axios**; all calls are to relative `/api/` paths

### API (`apps/api/`)

- **Express** with **Passport.js** for auth (Google OAuth2, magic link via email, local username/password, anonymous)
- Sessions stored in MySQL via `PrismaSessionStore`; session duration is 1 year
- All database access goes through **Prisma** (`apps/api/src/model.ts` exports the single `prisma` instance)
- Route handlers live in `apps/api/src/routes/`, query logic lives in `apps/api/src/query/`

### Shared (`packages/shared/`)

- Utility functions and types used by both `app` and `api`
- Must be **built before** `app` or `api`: `npm run build --workspace @doenet-tools/shared`

### Web (`apps/web/`)

- Static site built with **Astro** and **React** (`@astrojs/react`)

---

## Key Conventions

### Route Handler Pattern (api)

All route handlers are created using middleware wrappers in `apps/api/src/middleware/queryMiddleware.ts`:

```ts
// For endpoints requiring login:
router.post("/endpoint", queryLoggedIn(queryFunction, zodSchema));

// For endpoints with optional auth:
router.get("/endpoint", queryOptionalLoggedIn(queryFunction, zodSchema));
```

These wrappers automatically: check auth, parse and validate the request with Zod (merging `req.body`, `req.query`, and `req.params`), call the query function, run `convertUUID` on the result (converts binary UUIDs to strings), and handle errors via `handleErrors`.

### Error Handling (api)

Throw typed errors in query functions; `handleErrors` in `apps/api/src/errors/routeErrorHandler.ts` maps them to HTTP responses:

- `InvalidRequestError` → 400/other specified code
- `ZodError` → 400 with `{ error: "Invalid data", details: ... }`
- Prisma `P2001/P2003/P2025` → 404
- Everything else → 500

### UUID Convention

UUIDs are stored as 16-byte binary (`Bytes`) in MySQL. The server uses `Uint8Array` internally and converts to/from **short-uuid** strings at API boundaries:

- `toUUID(shortId)` → `Uint8Array` (for DB queries)
- `fromUUID(uint8array)` → short string (for API responses)
- `convertUUID(obj)` recursively converts all `Uint8Array` values in a result object

The client-side `Uuid` type is a branded `string`.

### Duplicated `types.ts`

`apps/app/src/types.ts` and `apps/api/src/types.ts` are **intentionally identical**. When modifying shared types, update both files. Platform-specific type differences go in `types_module_specific.ts` in each workspace.

### Zod Schemas (api)

Request validation schemas live in `apps/api/src/schemas/`. Each schema file corresponds to a domain (e.g., `assignSchema.ts`, `userSchemas.ts`). Schemas are passed to the query middleware wrapper, not applied inside route handlers.

### ESLint Config

Shared ESLint configuration lives in `packages/eslint-config/`. It exports:

- `createBaseConfig(dirname)` — base TypeScript + import rules; pass `import.meta.dirname` from the workspace's `eslint.config.mjs`
- `reactConfig` — React, ReactHooks, and Mocha rules; spread after `createBaseConfig` in React workspaces

Each workspace has its own `eslint.config.mjs` that composes these. The base config uses `tseslint.configs.recommended` (not `recommendedTypeChecked`), so no TypeScript program is created during linting.

### TypeScript Config

Root-level base configs:

- `tsconfig.base.json` — strictness rules only
- `tsconfig.node.json` — extends base; adds `nodenext` module settings
- `tsconfig.react.json` — extends base; adds `bundler` module resolution, `react-jsx`, and `noEmit: true`

Each workspace `tsconfig.json` extends one of these and declares its own `types`. `packages/shared` extends `tsconfig.base.json` directly (with its own module settings) since it targets both Node.js and the browser.

### Cypress Test Tagging

Cypress tests (both component and e2e) are tagged with `@group1`–`@group4` for CI parallelization. Flaky tests use `@brittle1`–`@brittle3`. Tests not tagged with any group will be caught by `test:mistagged` (app) or excluded by `test:group4` (e2e-tests). Use `@cypress/grep` syntax in `it()` / `describe()` tags.

### Test Environment Variables

The API exposes test-only features when these env vars are set:

- `ENABLE_TEST_AUTH_BYPASS=true` — enables login bypassing real auth (used in Cypress and load tests)
- `ENABLE_TEST_ROUTES=true` — mounts `/api/test` routes from `apps/api/src/test/testRoutes.ts`
- `MOCK_SIGNIN_EMAIL=true` — logs magic-link emails to console instead of sending via SES

### API Test Utilities

Use `createTestUser()` from `apps/api/src/test/utils.ts` to create isolated test users. Each call generates a unique email, so tests can run in parallel without conflicts.

### Content Types

The core domain model has four content types: `"singleDoc"`, `"select"` (question bank), `"sequence"` (problem set), `"folder"`. These appear in both Prisma enums and TypeScript union types.
