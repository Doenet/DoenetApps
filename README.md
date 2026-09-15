# Welcome to Doenet!

This repo is for the doenet.org website and tools around DoenetML. If you're looking for the DoenetML language, see github.com/Doenet/DoenetML.

## Getting started

Three ways to get a development environment, easiest first. Each one ends with
the app running at http://localhost:8000 and a link to sign in. Full details,
including running the tests and opening a pull request, are in
[CONTRIBUTING.md](./CONTRIBUTING.md).

**1. GitHub Codespaces.** Nothing to install; everything runs in the browser.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Doenet/DoenetApps)

Wait for the terminal to say `Dev container ready`, then run `npm run dev`.

**2. Dev container on your machine.** Docker is the only prerequisite. The
container brings its own Node, MySQL, S3 mock, Chrome, and Claude Code, and
one script drives it from the host:

```bash
git clone https://github.com/Doenet/DoenetApps.git
cd DoenetApps
./scripts/dc dev      # first run builds and seeds the container (a few minutes), then starts the app
./scripts/dc shell    # a terminal inside the container, in another tab
./scripts/dc claude   # Claude Code inside the container
```

Or open the folder in VS Code and accept **Reopen in Container**: it builds
the same container, starts the dev servers, and opens the app for you. Either
way, edit with whatever you like; the container sees the same checkout.

**3. The toolchain on your machine.** Node 24 and Docker, for the fastest inner
loop:

```bash
git clone https://github.com/Doenet/DoenetApps.git
cd DoenetApps
npm install
npm run setup     # creates apps/api/.env, starts MySQL, migrates and seeds
npm run dev       # app :8000, api :3000, blog :4321
```

However you start it, `npm run dev` prints a boxed **auto-login link** once the
API is up. Open it to land in the app signed in as a development user. The
blog is at `/blog` on the same origin, matching production.

---

## Repository Structure

This repository is an npm workspace monorepo. Packages are organized into two directories:

- **`apps/`** — runnable applications (each has a dev server or build output intended to be deployed or run directly)
- **`packages/`** — shared libraries and internal tooling consumed by the apps

### Apps

| Package    | Description                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api` | Express REST API and database layer (Prisma + MySQL). The backend for the platform.                                                                                             |
| `apps/app` | React SPA — the main Doenet web application. Communicates with `api` via `/api/*`.                                                                                              |
| `apps/web` | Astro-based static site. Currently houses the Doenet blog, but is intended to grow into the full public-facing static portion of the website (landing pages, about page, etc.). |

### Packages

| Package                  | Description                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `packages/shared`        | Utility functions and TypeScript types shared between `api` and `app`. Must be built before either app. |
| `packages/e2e-tests`     | Cypress end-to-end tests. Requires both dev servers running.                                            |
| `packages/eslint-config` | Internal shared ESLint configuration used to lint each package                                          |
| `packages/load-tests`    | Locust load tests for analyzing maximum traffic capacity and bottlenecks.                               |
