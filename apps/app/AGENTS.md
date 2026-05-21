# App — Agent Instructions

See root `AGENTS.md` for commands and overall architecture.

## Routing

All routes are defined in `src/index.tsx` via `createBrowserRouter`. Each route file in `src/paths/*.tsx` exports a `loader` and optionally an `action` alongside the page component.

## Mutation Pattern

Most mutations go through **`genericAction`** in `src/index.tsx`: reads `{ path, ...body }` from the request JSON and calls `axios.post('/api/${path}', body)`, optionally redirecting on success. All API calls use **axios** to relative `/api/` paths.

## DoenetML

Content rendering uses `@doenet/doenetml-iframe` — an external package that embeds DoenetML activities in an iframe. Treat it as a black box; do not modify its internals. Import styles from `@doenet/doenetml-iframe/style.css` as already done in `src/index.tsx`.

## Cypress Test Tagging

Tag tests `@group1`–`@group4` for CI parallelization; flaky tests use `@brittle1`–`@brittle3`. Tests without a group tag fail `test:mistagged`. Use `@cypress/grep` syntax in `it()` / `describe()`.
