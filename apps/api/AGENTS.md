# API — Agent Instructions

See root `AGENTS.md` for commands and overall architecture.

## API Contract

New `/api` operations are described by a Zod contract and served through it (older routes are listed in `contract-uncovered.json`; see below). The OpenAPI document (`apps/api/openapi.json`, served at `/api/openapi.json`, browsable at `/api/docs`) and the client types in `packages/shared/src/api/generated/` are generated from the contracts.

To add or change an operation:

1. Define it with `defineOperation` (name, method, path, auth, request and response schemas) in `src/schemas/<domain>Contract.ts`, or in `<system>/contract.ts` for system folders. Shared response schemas live in `src/schemas/sharedResponseSchemas.ts`.
2. Attach the handler with `implement(contract, queryFunction)` and add it to `apiOperations` in `src/apiOperations.ts`. `implement` type-checks the handler's return value against the response schema.
3. Run `npm run contract:generate --workspace @doenet-tools/api` and commit the generated files.
4. Call it from the app with `api("name", params)` or `submitOperation(fetcher, "name", params)`, and from e2e tests with `cy.api("name", params)`.

Routes listed in `contract-uncovered.json` predate the contract and still use the `queryLoggedIn`/`queryOptionalLoggedIn` wrappers. Bring a route into the contract before changing its inputs or outputs, then remove it from that list. Tests fail on any new route outside the contract.

Outside production, a response that doesn't match its schema returns 500; in production it is logged.

## Expand-Migrate-Contract

Every merge deploys, and the app builds already open in browsers keep calling the API the way they were built to (they switch to the new build on their next navigation after a deploy). Backend tasks running the previous code keep serving while migrations run. So a change that removes or narrows something takes two PRs:

1. **Expand + migrate:** add the replacement, and move every caller to it. Removing something from the contract stops its callers compiling, so the type checker finds them all.
2. **Contract**, once (1) has been deployed for at least a day: remove the old shape.

CI flags the contract step, and a label records that the wait happened:

- **API**: `contract:check-breaking` (oasdiff against `main`) fails on removed operations or fields, newly required inputs, and responses that can return new values. Label the PR `api-breaking`. Prefer a server-side default over making an input required: then no contract step is needed.
- **Database**: `db:check-migrations` fails on new migrations that drop, rename or narrow columns or tables, add `NOT NULL` without a default, or add unique constraints. Label the PR `db-destructive`. To drop a column, first mark the field `@ignore` in `schema.prisma` (it must be optional or have a default) and remove its uses, including raw SQL; drop it in the contract PR. To rename, add the new column, write both, backfill, switch reads, then drop the old one.

Terms are in `CONTEXT.md`; background in `docs/adr/0003-expand-migrate-contract.md`.

## Error Handling

Throw typed errors in query functions; `src/errors/routeErrorHandler.ts` maps them:

- `InvalidRequestError` → 400 (or specified code)
- `ZodError` → 400 with `{ error: "Invalid data", details: ... }`
- Prisma `P2001/P2003/P2025` → 404
- Everything else → 500

## UUID Convention

UUIDs are stored as 16-byte binary (`Bytes`) in MySQL:

- `toUUID(shortId)` → `Uint8Array` (for DB queries)
- `fromUUID(uint8array)` → short string (for API responses)
- `convertUUID(obj)` — recursively converts all `Uint8Array` values (called automatically by middleware wrappers)

Client-side `Uuid` type is a branded `string`.

## Soft Deletion

`content` records are never hard-deleted. Deletion sets `isDeletedOn` to a timestamp (and `deletionRootId` to the root of the deleted subtree). **Every content query must filter `isDeletedOn: null`** or it will silently return deleted records.

## Access Control

Content visibility is managed in `src/access/`. Three levels: `private` < `unlisted` < `public`. Key rules enforced there:

- Only the owner can change visibility
- Assignments are always `private` — their visibility cannot be changed
- Content within an assignment also cannot have its visibility changed
- A child cannot have lower visibility than its parent
- Changing visibility cascades to all non-assignment descendants

When adding endpoints that read or modify content, check whether visibility gating applies.

### Curators and the permission filters

Curators (`users.isEditor`) can view and edit library-owned content. The Prisma filters in `src/utils/permissions.ts` (`filterEditableContent`, `filterViewableActivity`, etc.) take a required `isEditor` flag:

- Pass the value from `getIsEditor(loggedInUserId)`, or the return value of `mustBeEditor(loggedInUserId)`.
- If curator access is deliberately excluded, use `filterOwnedContent` / `filterOwnedActivity` (owner only) or `filterViewableContentAsNonEditor` / `filterViewableActivityAsNonEditor`.
- Never pass a literal `true`/`false`; ESLint rejects it. A hard-coded `false` 404s curators on library content.

## Content Types

Four content types throughout the domain model: `"singleDoc"`, `"select"` (question bank), `"sequence"` (problem set), `"folder"`. These appear in Prisma enums and TypeScript union types.

## Environment Variables

`DATABASE_URL` must be kept in sync with the individual `DATABASE_*` vars manually — Prisma uses `DATABASE_URL` while Docker uses the individual vars. Update both if any connection detail changes.

## Performance Instrumentation

`src/perf/` counts and times the Prisma operations each `/api` request makes, and reports them in a `Server-Timing` header (on outside production; `PERF_SERVER_TIMING=true` in dev3) and a `perf.request` log line (on in production; `PERF_REQUEST_LOG=true` locally). Counts are only complete when:

- `perfMiddleware` stays the first `app.use` in `src/index.ts`, ahead of any middleware that queries the database (session store, passport).
- Queries go through the shared `prisma` from `src/model.ts`, which carries the counting extension. A separate `new PrismaClient()` is invisible to it.

## Test Utilities

Env vars for test-only features:

- `ENABLE_TEST_AUTH_BYPASS=true` — bypass real auth (used by Cypress)
- `ENABLE_TEST_ROUTES=true` — mounts `/api/test` routes from `src/test/testRoutes.ts`
- `MOCK_SIGNIN_EMAIL=true` — logs magic-link emails to console instead of sending via SES

Use `createTestUser()` from `src/test/utils.ts` for isolated test users (unique email per call, safe for parallel runs).
