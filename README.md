# Welcome to Doenet!

The Distributed Open Education Network (Doenet) is an open data-driven educational technology platform designed to measure and share student interactions with web pages. It includes tools for authoring interactive educational content, including our custom DoenetML markup language, and conducting educational research using the content. Our ultimate goal is to provide research-based tools to help instructors and learners discover the most effective content. Simply put, Doenet gives teachers complete flexibility over their educational content and gives them power of anonymized student data to track learning outcomes. With Doenet, we hope to help teachers teach better and students learn better.

Although we are still in the early stages, we are excited to introduce Doenet and illustrate the richly interactive activities that one can author with it.

For more background and information on the Doenet project, see this [MAA DUE Point](https://www.mathvalues.org/masterblog/reimagining-online-mathematics) article.

We would love to hear from you! Join our [Discord](https://discord.gg/PUduwtKJ5h) to ask questions and stay updated on our progress!

---

## Dev Environment Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 24+
- [Docker](https://www.docker.com/) with Compose v2 (for the MySQL database)

### Steps

```bash
git clone https://github.com/Doenet/DoenetTools.git
cd DoenetTools
npm install
npm run setup
npm run dev
```

`npm run setup` creates `apps/api/.env`, starts the MySQL container, and creates,
migrates, and seeds the database. It is idempotent — safe to re-run at any time.

`npm run dev` starts all dev processes:

- Shared package watcher
- Express API → http://localhost:3000
- React SPA → http://localhost:8000 (proxies `/api/*` to the API)
- Astro site → http://localhost:4321

If you need to edit connection details, see the comments in `apps/api/.env`.
If the database container is stopped later, restart it with `npm run db:start`.

#### Running dev servers individually

Instead of `npm run dev`, you can run each process in a separate terminal:

```bash
npm run dev --workspace @doenet-tools/shared   # Shared package watcher
npm run dev --workspace @doenet-tools/api   # Express API
npm run dev --workspace @doenet-tools/app   # React SPA
npm run dev --workspace @doenet-tools/web   # Astro site
```

### Working in multiple worktrees

Running `npm run dev` from several [git worktrees](https://git-scm.com/docs/git-worktree)
at once would collide on ports and on the database. Give each worktree its own:

```bash
git worktree add ../doenet-feature feature-branch
cd ../doenet-feature
npm install
npm run worktree:init
npm run dev
```

`npm run worktree:init` assigns the next free set of ports and a dedicated
database to that worktree. Run it once per worktree, before starting any dev
servers or AI coding sessions in it. The MySQL container is shared across all
worktrees — only the database (and the ports) differ.

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
