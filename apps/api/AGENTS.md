# API — Agent Instructions

See root `AGENTS.md` for commands and overall architecture.

## Route Handler Pattern

Middleware wrappers in `src/middleware/queryMiddleware.ts` handle auth, Zod validation (merging `req.body`, `req.query`, `req.params`), UUID conversion, and errors automatically:

```ts
router.post("/endpoint", queryLoggedIn(queryFunction, zodSchema));
router.get("/endpoint", queryOptionalLoggedIn(queryFunction, zodSchema));
```

Zod schemas live in `src/schemas/` by domain. Pass them to the wrapper — do not validate inside route handlers.

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

## Content Types

Four content types throughout the domain model: `"singleDoc"`, `"select"` (question bank), `"sequence"` (problem set), `"folder"`. These appear in Prisma enums and TypeScript union types.

## Environment Variables

`DATABASE_URL` must be kept in sync with the individual `DATABASE_*` vars manually — Prisma uses `DATABASE_URL` while Docker uses the individual vars. Update both if any connection detail changes.

## Health & Version

`GET /api/health` returns `{ status: "ok", version: { ref, sha, builtAt } }`. The `version` fields are stamped into the image at deploy time via the `GIT_SHA` / `DEPLOY_REF` / `BUILD_TIME` build args (see `apps/api/Dockerfile` and `.github/workflows/reusable-deploy-backend.yml`), so hitting the endpoint tells you exactly what commit is running — the ground truth behind GitHub's deployment records. Fields are `null` in local dev. The static apps publish the same info at `/version.json`.

## Test Utilities

Env vars for test-only features:

- `ENABLE_TEST_AUTH_BYPASS=true` — bypass real auth (used by Cypress)
- `ENABLE_TEST_ROUTES=true` — mounts `/api/test` routes from `src/test/testRoutes.ts`
- `MOCK_SIGNIN_EMAIL=true` — logs magic-link emails to console instead of sending via SES

Use `createTestUser()` from `src/test/utils.ts` for isolated test users (unique email per call, safe for parallel runs).
