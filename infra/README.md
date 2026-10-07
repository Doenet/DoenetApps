This folder contains the CloudFormation templates we need to run the infrastructure for the Doenet website.

To deploy changes to AWS, run the `aws-deploy` script.

To lint CloudFormation templates without deploying them, use `cfn-lint`.
https://github.com/aws-cloudformation/cfn-lint

## Testing a PR on dev3

Maintainers can deploy an unmerged PR to the shared dev3 environment by
commenting `/deploy-dev` on it. This deploys the PR merged into the current tip
of `main`, so you always test it combined with the latest main — even when the
branch is behind. A PR with conflicts is blocked with a hint to update it first.

> **Caution:** deploying builds and runs the PR's own code (its Dockerfile and
> npm build scripts) on a runner that has dev3's AWS credentials in scope. Only
> run `/deploy-dev` on a PR whose code you trust — deploying an external
> contributor's PR means running their code with those credentials.

## What is currently on dev3?

dev3 is a single shared environment. Every deploy (a push to `main`, a
`Dev Deploy` workflow_dispatch, or a `/deploy-dev` PR command) records a GitHub
deployment against the `dev3` environment, so the live ref is visible without
AWS access:

- **Repo → Environments → `dev3`** — the authoritative view. GitHub shows the
  active deployment, its ref, and whether it's currently live or `inactive`
  (dev3 marks the deployment `inactive` while its lights are off).
- A PR deployed via `/deploy-dev` also surfaces a deployment marker on the PR.

Scripting note: the raw deployments list is ordered newest-attempt-first, so
`deployments?environment=dev3&per_page=1` gives the most recent _attempt_, which
may be a failed or `inactive` one — not necessarily what's live. To find the
live ref, take the most recent deployment whose latest status is `success`:

```bash
repo=Doenet/DoenetApps
for id in $(gh api "repos/$repo/deployments?environment=dev3&per_page=20" --jq '.[].id'); do
  if [ "$(gh api "repos/$repo/deployments/$id/statuses?per_page=1" --jq '.[0].state')" = success ]; then
    gh api "repos/$repo/deployments/$id" --jq '"live on dev3: \(.ref) (\(.sha[0:7]))"'
    break
  fi
done
```

A PR deploy supersedes `main`, and the next push to `main` supersedes the PR.

The Environments tab reflects the _ref that was deployed_, not proof the running
container matches it. For ground truth, ask the running services what they are —
each is stamped with its ref and commit at build time:

- `https://dev3.doenet.org/api/health` → `{ status, version: { ref, sha, builtAt } }` (backend)
- `https://dev3.doenet.org/version.json` → `{ ref, sha, builtAt }` (frontend app)

## Rolling back prod

Every merge to `main` deploys to prod automatically, so `main` is the source of
truth for what prod should be running. There are two ways back:

- **Revert the PR** — the real fix. Prod redeploys once the revert's checks
  pass. Use this unless prod is badly broken right now.
- **Re-run the last good deploy** — the emergency stopgap while a revert's CI
  runs. In Actions → `Prod Deploy`, find the last green run and click
  "Re-run all jobs"; it redeploys that run's SHA. This does not change `main`,
  so the next merge ships whatever is on `main` again — always follow up with
  a revert.

Neither path undoes database migrations: `prisma migrate deploy` runs at
container boot and is never rolled back, so after a rollback the old code runs
against the new schema. This is why migrations must be backward compatible
(expand/contract: add columns/tables in one release, remove in a later one).

Backend deploys that fail to boot or pass health checks roll themselves back
(see `update-cluster-with-rollback`); manual rollback is for code that deploys
healthy but is functionally broken. Confirm what prod is actually running at
`https://doenet.org/api/health` and `https://doenet.org/version.json`.
