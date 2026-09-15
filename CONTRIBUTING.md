# Contributing to Doenet Apps

Thanks for helping build Doenet! This page covers getting a development
environment running, the checks we expect to pass, and how changes are
proposed.

Questions are welcome on Github discussions or [Discord](https://discord.gg/PUduwtKJ5h).

## Setting up a development environment

Three ways, in order of how much you have to install. They all end up in the
same place: the app at http://localhost:8000, backed by a seeded database and
ready to sign in. If you are unsure, start with Codespaces to look around and
move to option 3 once you are editing code every day.

| Option                                                  | What you need    | Setup                        |
| ------------------------------------------------------- | ---------------- | ---------------------------- |
| [GitHub Codespaces](#option-1--github-codespaces)       | A browser        | One click                    |
| [Dev container locally](#option-2--dev-container)       | Docker           | One command                  |
| [Toolchain on your machine](#option-3--local-toolchain) | Node 24 + Docker | A few commands, full control |

### Option 1 — GitHub Codespaces

Nothing to install. On the repository page choose **Code → Codespaces → Create
codespace on main**, or open
[this link](https://codespaces.new/Doenet/DoenetApps).

The first build takes several minutes: it builds the image, installs
dependencies, and migrates and seeds the database. The editor connects once
that is done, starts the dev servers in a terminal, and opens the app in a
browser tab when it is listening. To sign in, use the auto-login link printed
in that terminal (see [Signing in](#signing-in)); it already points at your
codespace's address. If you ever stop the servers, **Terminal → Run Build
Task** (Ctrl/Cmd+Shift+B) starts them again.

### Option 2 — Dev container

The same environment on your own machine, and the closest thing to option 3
without installing a toolchain. Docker is the only prerequisite: the container
brings its own Node, MySQL, S3 mock, Chrome for the Cypress suites, and Claude
Code. On Windows, run the commands below from WSL.

```bash
git clone https://github.com/Doenet/DoenetApps.git
cd DoenetApps
./scripts/dc dev
```

The first run builds the image, installs dependencies, and migrates and seeds
the database, which takes a few minutes; after that it starts in seconds.
`dc dev` then runs `npm run dev` inside the container and prints the auto-login
link (see [Signing in](#signing-in)). Open it in your normal browser: the ports
are published on localhost exactly as in option 3.

Everything else you would do in a terminal goes through the same script:

```bash
./scripts/dc shell                                  # a shell in the container
./scripts/dc claude                                 # Claude Code (sign in once; it is remembered)
./scripts/dc npm test --workspace @doenet-tools/api # any command, run inside
./scripts/dc down                                   # stop; the database and installs survive
./scripts/dc help                                   # the full list
```

**With VS Code.** This is the smoothest way to use the container: the editor,
terminal, Claude Code, and browser are all wired up for you.

1. Open the cloned folder in VS Code. It offers to install the recommended
   extensions; accept, or install
   [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
   yourself.
2. Accept the **Reopen in Container** prompt (or run it from the command
   palette). The first time, this builds the image, installs dependencies, and
   seeds the database — a few minutes. VS Code connects only when that is done.
3. The dev servers start by themselves in a terminal, and the app opens in your
   browser as soon as it is listening (otherwise, http://localhost:8000). The
   auto-login link is in that terminal; see [Signing in](#signing-in).

From there it behaves like option 3: edit, save, and the page reloads.
**Terminal → Run Build Task** (Ctrl/Cmd+Shift+B) restarts the dev servers if
you stop them, Claude Code is in the sidebar and as `claude` in the terminal,
and any terminal you open is inside the container. Closing the window stops the
whole stack; reopening the folder in the container brings it back in seconds.
`./scripts/dc` commands from an outside terminal reach the same container. On
Windows, clone inside WSL first. Cursor and JetBrains support the same
`.devcontainer` configuration.

**Editing files from the host.** With `dc` alone, the checkout is shared with
the container, so any host editor works and the dev server picks changes up
immediately. The one gap is that `node_modules` lives inside the container, so
a host editor cannot resolve imports for type hints; VS Code in the container
is the fix.

The container's internals — how the services fit together, rebuilding, and the
arm64 caveat — are in [.devcontainer/README.md](./.devcontainer/README.md).

### Option 3 — Local toolchain

Full control, and the fastest inner loop. You need:

- [Node.js](https://nodejs.org/) 24 (see [.nvmrc](./.nvmrc))
- [Docker](https://www.docker.com/) with Compose v2, for the MySQL database

```bash
git clone https://github.com/Doenet/DoenetApps.git
cd DoenetApps
npm install
npm run setup
npm run dev
```

`npm run setup` creates `apps/api/.env`, starts the MySQL container, and
creates, migrates, and seeds the database. It is idempotent — safe to re-run at
any time, and the way to restart the database container if it is stopped later.
To change connection details, see the comments in `apps/api/.env`.

#### Running dev servers individually

Instead of `npm run dev`, each process can run in its own terminal:

```bash
npm run dev --workspace @doenet-tools/shared   # Shared package watcher
npm run dev --workspace @doenet-tools/api      # Express API
npm run dev --workspace @doenet-tools/app      # React SPA
npm run dev --workspace @doenet-tools/web      # Astro site
```

#### Working in multiple worktrees

Running `npm run dev` from several
[git worktrees](https://git-scm.com/docs/git-worktree) at once would collide on
ports and on the database. `npm run setup` handles this: it detects a linked
worktree and assigns it the next free set of ports and a dedicated database.

```bash
git worktree add ../doenet-feature feature-branch
cd ../doenet-feature
npm install
npm run setup
npm run dev
```

The MySQL container is shared across all worktrees — only the database and the
ports differ.

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

In a worktree, add that worktree's offset to each port; `npm run setup` prints
the ones it assigned.

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

- **`MySQL is not reachable`** when starting `npm run dev` on your own machine:
  the database container is stopped. `npm run setup` starts it again.
- **A port is already in use.** Something else on your machine holds 8000,
  3000, or 4321. Stop it, or use a [worktree](#working-in-multiple-worktrees),
  which gets its own ports (`./scripts/dc` picks those up automatically).
- **The dev container seems stale** after a change to `.devcontainer/` or to
  dependencies: `./scripts/dc rebuild` (or **Rebuild Container** in VS Code).
  The database survives a rebuild; `./scripts/dc reset` is the one that wipes it.
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
