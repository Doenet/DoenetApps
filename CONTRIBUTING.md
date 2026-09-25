# Contributing to Doenet Apps

Thanks for helping build Doenet! This page covers getting a development
environment running, the checks we expect to pass, and how changes are
proposed.

Questions are welcome on Github discussions or [Discord](https://discord.gg/PUduwtKJ5h).

## Setting up a development environment

You need [Node.js](https://nodejs.org/) 24 (see [.nvmrc](./.nvmrc)) and
[Docker](https://www.docker.com/) with Compose v2, which runs MySQL and an S3
mock for uploads.

```bash
git clone https://github.com/Doenet/DoenetApps.git
cd DoenetApps
npm install
npm run setup
npm run dev
```

`npm run setup` creates `apps/api/.env` from the example, starts the
containers, and creates, migrates, and seeds the database. It is idempotent —
safe to re-run at any time, and the way to restart the database container if
it is stopped later. `npm run dev` then starts everything (see
[What runs where](#what-runs-where)) and prints the auto-login link (see
[Signing in](#signing-in)).

### In a container instead

If you would rather not install Node, the repo has a
[dev container](https://containers.dev/) that runs the same steps inside a
container with its own Node, MySQL, S3 mock, Chrome (for the Cypress suites),
and Claude Code.

- **GitHub Codespaces.** Nothing to install: **Code → Codespaces → Create
  codespace on main**, or open
  [this link](https://codespaces.new/Doenet/DoenetApps).
- **VS Code.** Open the cloned folder, install the
  [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
  extension when prompted, and accept **Reopen in Container**. Cursor and
  JetBrains support the same `.devcontainer` configuration. On Windows, clone
  inside WSL first.

The first build takes several minutes: it pulls the image, installs
dependencies, and seeds the database. After that the dev servers start on
their own every time the container starts, and the app opens in a browser tab
when it is listening. The auto-login link is in that terminal, and already
points at a codespace's forwarded address. If you stop the servers,
**Terminal → Run Build Task** (Ctrl/Cmd+Shift+B) starts them again. Git,
`gh`, and Claude Code all work inside with your own identity and credentials,
which the editor forwards.

The checkout is shared with your machine, including `node_modules`, so use
either the container or the host toolchain for a given checkout, not both.
After changing `.devcontainer/` or dependencies, **Rebuild Container**; the
database survives a rebuild. On an arm64 machine the image has no Chrome, so
run Cypress with `-b electron`.

### Running dev servers individually

Instead of `npm run dev`, each process can run in its own terminal:

```bash
npm run dev --workspace @doenet-tools/shared   # Shared package watcher
npm run dev --workspace @doenet-tools/api      # Express API
npm run dev --workspace @doenet-tools/app      # React SPA
npm run dev --workspace @doenet-tools/web      # Astro site
```

### Working in multiple worktrees

Two checkouts running `npm run dev` at once would collide on ports and on the
database, so give the second one its own. In its `apps/api/.env`, change
`PORT`, `APP_PORT`, `WEB_PORT`, and `APP_URL`, and give `DATABASE_NAME` (and
the name in `DATABASE_URL`) a new value — the MySQL container is shared, and
`npm run setup` creates the database.

```bash
git worktree add ../doenet-feature feature-branch
cd ../doenet-feature
npm install
npm run setup          # then edit apps/api/.env as above and run it again
npm run dev
```

## Signing in

There is no password. Once the API is up, `npm run dev` prints a box like this:

```
┌────────────────────────────────────────────────────────────────┐
│ Dev auto-login ready - open this to sign in as dev@doenet.org: │
│                                                                │
│ http://localhost:8000/?autologin=true                          │
└────────────────────────────────────────────────────────────────┘
```

Open that link and you are signed in as a development user with authoring
rights. The seeded database also contains other users and sample content; the
regular sign-in page sends a magic link, which in development is printed to the
API's terminal output instead of being emailed.

## What runs where

`npm run dev` starts the shared-package watcher and three servers:

| Server      | URL                   |
| ----------- | --------------------- |
| React SPA   | http://localhost:8000 |
| Express API | http://localhost:3000 |
| Astro site  | http://localhost:4321 |

The SPA proxies `/api/*` to the API and `/blog/*` to Astro, so both frontends
are reachable from the app origin and local URLs match production:

- app pages → `http://localhost:8000/...`
- blog pages → `http://localhost:8000/blog/...`

In a second worktree, these are whatever `apps/api/.env` says.

## Running the tests

```bash
npm test --workspace @doenet-tools/api                # Vitest unit tests
npm test --workspace @doenet-tools/shared             # Vitest unit tests
npm run test:all --workspace @doenet-tools/app        # Cypress component tests
npm run test:all --workspace @doenet-tools/e2e-tests  # Cypress e2e tests
```

The e2e suite drives the running app, so start `npm run dev` first and let it
come up. Append a filename to the Vitest commands to run a single file; the
Cypress packages also expose grouped scripts (`test:group1` and friends) that
mirror how CI splits them.

## Troubleshooting

- **Can't reach database server** when starting `npm run dev` on your own
  machine: the containers are stopped. `npm run setup` starts them again.
- **A port is already in use.** Something else on your machine holds 8000,
  3000, or 4321. Stop it, or change the ports in `apps/api/.env` as for a
  [worktree](#working-in-multiple-worktrees).
- **The dev container seems stale** after a change to `.devcontainer/` or to
  dependencies: **Rebuild Container**. The database survives a rebuild; only
  deleting the stack's Docker volumes wipes it.
- **Type errors from `@doenet-tools/shared`** right after checking out a branch:
  `npm run dev` rebuilds the shared package on start, so restart it.
- **Something else?** Ask on [Discord](https://discord.gg/PUduwtKJ5h).

## Before you commit

```bash
npm run format
npm run lint
```

Both run over the whole workspace. CI runs `format:check` and `lint:check`,
which fail rather than fix, along with a full build and every test suite above.

## Opening a pull request

Development uses a fork workflow. Push your branch to `origin` (your fork),
then open a pull request targeting `upstream/main`. Merged pull requests deploy
to production after human sign-off.

Database and API changes follow the **expand-migrate-contract** pattern: each
merged pull request must be safe to deploy on its own, so add new
columns/endpoints before removing old ones, across separate pull requests.
