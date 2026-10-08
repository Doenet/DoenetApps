# App — Agent Instructions

See root `AGENTS.md` for commands and overall architecture.

## Routing

All routes are defined in `src/index.tsx` via `createBrowserRouter`. Each route file in `src/paths/*.tsx` exports a `loader` and optionally an `action` alongside the page component.

## Mutation Pattern

Call the API through the typed client in `src/api/`: `api("operationName", params)` in loaders, and `submitOperation(fetcher, "operationName", params, { redirectOnSuccess })` for mutations, which go through **`genericAction`** in `src/index.tsx` so loaders revalidate. Params and responses are typed from the API contract. Routes not yet in the contract still use raw `axios` (or `{ path, ...body }` submissions); those calls are recorded in `eslint-suppressions.json`, which may only shrink.

## DoenetML

Content rendering uses `@doenet/doenetml-iframe` — an external package that embeds DoenetML activities in an iframe. Treat it as a black box; do not modify its internals. Import styles from `@doenet/doenetml-iframe/style.css` as already done in `src/index.tsx`.

## Cypress Test Tagging

Tag tests `@group1`–`@group4` for CI parallelization; flaky tests use `@brittle1`–`@brittle3`. Tests without a group tag fail `test:mistagged`. Use `@cypress/grep` syntax in `it()` / `describe()`.
