This folder contains the CloudFormation templates we need to run the infrastructure for the Doenet website.

To deploy changes to AWS, run the `aws-deploy` script.

To lint CloudFormation templates without deploying them, use `cfn-lint`.
https://github.com/aws-cloudformation/cfn-lint

## What is currently on dev3?

dev3 is a single shared environment. Every deploy (a push to `main`, a
`Dev Deploy` workflow_dispatch, or a `/deploy-dev` PR command) records a GitHub
deployment against the `dev3` environment, so the currently-live ref is always
visible:

- **Repo → Environments → `dev3`** shows the active deployment and its ref.
- A PR deployed via `/deploy-dev` shows a deployment marker on the PR itself.
- From a script: `gh api "repos/Doenet/DoenetApps/deployments?environment=dev3&per_page=1"`.

Because a GitHub environment keeps only one active deployment, this always
reflects what is serving on https://dev3.doenet.org right now — a PR deploy
supersedes `main`, and the next push to `main` supersedes the PR.
