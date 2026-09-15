# Dev container internals

Reference for the container itself. For getting started, see
[Setting up a development environment](../CONTRIBUTING.md#setting-up-a-development-environment).

There are three ways to drive it, and they all share one container per checkout:

- **`scripts/dc`** — from the host, with nothing but Docker installed.
  `./scripts/dc dev`, `shell`, `claude`, or any command; `up`, `down`,
  `rebuild`, `reset`, `status`. It runs `docker compose` on
  `docker-compose.yml` directly, reads this checkout's ports from
  `apps/api/.env`, and runs `post-create.sh` the first time a container is
  created (it leaves a marker file in the container's home to know).
- **VS Code** — **Reopen in Container**, which also installs the recommended
  extensions.
- **The devcontainer CLI** — `npx @devcontainers/cli up --workspace-folder .`,
  which needs Node on the host. What Codespaces uses.

All three name the compose project `<folder>_devcontainer`, so they see the
same containers and volumes: `dc shell`, `dc claude`, and `dc dev` attach to a
container VS Code started. `dc up` and `dc rebuild` create the container from
the plain compose file, so run those only when VS Code is not attached.

## The stack

| Service  | What it is                        | Address inside the container |
| -------- | --------------------------------- | ---------------------------- |
| `dev`    | Node 24.15, Chrome, the workspace | —                            |
| `mysql`  | MySQL 8.0, seeded with dev data   | `mysql:3306`                 |
| `s3mock` | S3-compatible store for uploads   | `s3mock:9090`                |

`post-create.sh` runs once when the container is created: it creates
`apps/api/.env` if missing, installs dependencies, fetches the Cypress binary,
builds `packages/shared`, and migrates and seeds the database. It ends by
printing the ports this checkout uses.

Every test suite runs here with no external services — see
[Running the tests](../CONTRIBUTING.md#running-the-tests). Cypress uses headless
Chrome, and `xvfb` is installed for the cases where it wants a display; watching
a run interactively (`cypress open`) needs an X server of your own.

## Claude Code

[Claude Code](https://claude.com/claude-code) is installed in the image, so
`claude` works in any terminal in the container. Sign in once with `claude`;
credentials live in a named volume (`CLAUDE_CONFIG_DIR=/home/node/.claude`) and
survive rebuilds. Alternatively set `ANTHROPIC_API_KEY` — the container inherits
it from the host, and Codespaces exposes a repository or user secret of that
name automatically. The VS Code extension is installed alongside it.

## How it is wired

**Service addresses come from the environment, not `apps/api/.env`.**
`docker-compose.yml` sets `DATABASE_URL`, `DATABASE_HOST`, and
`MEDIA_S3_LOCAL_ENDPOINT`. Both `dotenv` and the Prisma CLI leave already-set
variables alone, so these win over the file — which means the checkout's `.env`,
shared with the host through the bind mount, is never rewritten and the same
checkout works on the host and in the container. (The one exception is a
codespace, whose checkout is not shared with any host: there `post-create.sh`
points `APP_URL` at the forwarded origin so sign-in links work — see below.)

**The dev servers listen on all interfaces.** Vite and Astro otherwise bind to
`127.0.0.1`, which published ports cannot reach, so the container sets
`DEV_SERVER_HOST=0.0.0.0`. It is unset on a normal checkout, leaving host-based
development on localhost. The ports are published on the host's loopback only.

**In a codespace the blog links back to the forwarded host.** The blog builds
absolute links to the app from `PUBLIC_APP_URL`, which defaults to
`http://localhost:8000` — meaningless in a browser pointed at
`*.app.github.dev`. `post-create.sh` detects Codespaces and writes
`apps/web/.env.local` with the forwarded URLs, the same override mechanism
`npm run setup` uses for worktrees. It also sets `APP_URL` in `apps/api/.env`
to the forwarded origin, since the API builds magic-link sign-in URLs from it
and `npm run dev` prints an auto-login link from the same value.

**`node_modules` are named volumes**, so the container's Linux-native installs
never collide with the host's. Only the workspaces npm actually populates get
one; `initializeCommand` pre-creates those mount points as the host user,
because Docker would otherwise create them as root and a later host-side
`npm ci` could not write to them. A consequence of the volumes is that host-side
editors cannot see `node_modules` — run tooling inside the container.

The Cypress binary and the npm cache live in volumes too, so rebuilding does not
re-download them.

## Ports

Ports come from `apps/api/.env`: a fresh checkout gets app 8000, api 3000, blog
4321, while a [worktree](../CONTRIBUTING.md#working-in-multiple-worktrees) is
assigned an offset. `scripts/dc` reads that file for you. Compose and the
devcontainer CLI cannot, so pass the ports to them when they are not the
defaults — also the fix if something on the host already holds one:

```bash
APP_PORT=8002 API_PORT=3002 WEB_PORT=4323 \
  npx @devcontainers/cli up --workspace-folder .
```

## Rebuilding and cleaning up

`up` is idempotent; re-running it reuses the container. To force a fresh one:

```bash
./scripts/dc rebuild
# or, with the CLI:
npx @devcontainers/cli up --workspace-folder . \
  --remove-existing-container --build-no-cache
```

That keeps the named volumes, so the database, installs, and Cypress binary
survive. To discard those too, remove the stack — `./scripts/dc reset`, or by
hand (a checkout in `apps` is project `apps_devcontainer`):

```bash
docker compose -p apps_devcontainer -f .devcontainer/docker-compose.yml down -v
```

## Known limitations

- **Linked git worktrees**: git does not work inside the container, because
  `.git` is a file pointing outside the bind mount. Everything else works; use
  the main checkout or a clone for committing.
- **arm64 hosts**: Google ships no arm64 Chrome build, so Chromium is installed
  instead and Cypress needs `-b chromium`. The package scripts hardcode
  `-b chrome`.
- This stack is separate from the repo-root `docker-compose.yml`, which exists
  for host-based development. The two can run at the same time.
