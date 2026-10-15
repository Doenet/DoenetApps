# Welcome to Doenet!

This repo is for the doenet.org website and tools around DoenetML. If you're looking for the DoenetML language, see github.com/Doenet/DoenetML.

## Getting started

You need [Node.js](https://nodejs.org/) 24 (see [.nvmrc](./.nvmrc)) and
[Docker](https://www.docker.com/) for the database.

```bash
git clone https://github.com/Doenet/DoenetApps.git
cd DoenetApps
npm install
npm run setup     # creates apps/api/.env, starts MySQL, migrates and seeds
npm run dev       # app :8000, api :3000, blog :4321
```

Once the API is up it prints an **auto-login link**; open it to land in the
app signed in as a development user. The blog is at `/blog` on the same origin.

Prefer not to install anything? Open the repo in
[GitHub Codespaces](https://codespaces.new/Doenet/DoenetApps) or accept
VS Code's **Reopen in Container** prompt: the same setup runs inside a
container that brings its own Node, MySQL, Chrome, and Claude Code. Details,
tests, and how to open a pull request are in
[CONTRIBUTING.md](./CONTRIBUTING.md).

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
