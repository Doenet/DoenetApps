# PR Review Guidelines

Review this PR. The first question is whether the code is **correct**: whether it does
what the PR, its documentation, and its own comments say it does. Everything else in this
document is secondary to that.

Look for the case that breaks the change, not the case that confirms it: a review that
sets out to agree will find agreement. Report only what you can substantiate, and say what
each finding rests on. A review that finds nothing real is a legitimate result and should
be reported as one — findings offered to look thorough cost more to disprove than they
were worth.

## Correctness

Trace the main path of the change by hand and satisfy yourself that it produces the
claimed result. Do not accept a comment, a test name, or a variable name as evidence of
what the code does.

Work the edge cases deliberately. These recur in this codebase and are worth checking
every time:

- **Access control.** The route wrappers in `apps/api/src/middleware/queryMiddleware.ts`
  check only that a user is logged in. Whether that user may see or change a particular
  piece of content is decided inside each query function, by the helpers in
  `apps/api/src/utils/permissions.ts` (`filterViewableContent`, `filterEditableContent`,
  `mustBeEditor`, `checkActivityPermissions`, …). A query that reads or writes content
  without one of them is open to every logged-in user. Handlers that bypass the wrappers
  (such as those in `apps/api/src/media/router.ts`) must do their own authentication too.
- **Visibility.** The rules in `apps/api/src/access/` (private < unlisted < public) are
  where the sharing bugs have clustered (#2998, #3003, #3006, #3023): a child less visible
  than its parent, a change that fails to cascade to descendants or cascades into an
  assignment, unlisted content reachable through a listing of public content. For any
  change to sharing, browsing, or embedding, check each visibility level and each position
  in the folder tree.
- **The anonymous path.** Under `queryOptionalLoggedIn`, `loggedInUserId` is `undefined`.
  Code written while logged in tends to assume a user (#2916); check every use of it.
- **Soft delete.** Content is never hard-deleted. A content query that omits
  `isDeletedOn: null` silently returns deleted records.
- **Empty and boundary values**: an empty folder, a folder of one item, content at the root
  versus deeply nested, a list where every item is filtered out.

Then ask what the change breaks that **is not in the diff**. Editing a permission helper,
a visibility rule, a query wrapper, the error handler, or anything in `packages/shared`
can change behavior entirely inside files the PR never touches. Name the behavior before
and after, and establish the "before" by reading the code that used to run, not by
assuming.

## Security

Read the diff as an attacker would: for each new input, ask who controls it and where it
ends up. Access control is covered above; check these as well:

- **Raw SQL.** A `Prisma.sql` template or `$queryRaw` tagged template passes values as
  parameters. `Prisma.raw` splices its text into the query, and `$queryRawUnsafe` and
  `$executeRawUnsafe` splice their query string while binding any further arguments as
  parameters. So the text given to `Prisma.raw`, and the query string given to the Unsafe
  variants, must be built by the code, with request values passed as parameters (in
  `apps/api/src/utils/classificationsCategories.ts`, `Prisma.raw` only ever sees generated
  table aliases).
- **Other sinks.** Request data that reaches a shell command, a file path, an outgoing
  URL, a redirect target, or HTML rendered outside React's escaping
  (`dangerouslySetInnerHTML`).
- **Secrets and personal data.** Secrets stay out of code, logs, error responses and
  committed files. Emails, names, session data and scores go only to users entitled to
  them, and never into logs or into files committed to this public repository.
- **Scripts run against prod** (`apps/api/scripts/`, such as `delete_empty_sessions.ts`). Ask what
  credentials they need, whether they could write, and what their output publishes. A
  change to such a script is a change to code with prod access; review it as one.
- **CI workflows.** A workflow that runs a PR's code while secrets or cloud credentials
  are in scope: `pull_request_target`, `workflow_run`, or `issue_comment` (as
  `dev-deploy-pr.yml` does by design on a maintainer's `/deploy-dev`). A wider
  `permissions:` block. Text from `${{ github.event.* }}`, such as a comment body or PR
  title, interpolated straight into a `run:` script instead of passed through an env var.
- **New dependencies.** Check that the package is maintained and widely used, that its
  name is spelled as intended, and whether it runs an install script.
- **Sessions and cross-site requests.** A route that changes state on `GET`, a
  state-changing route that accepts a plain form post, or a change to the session cookie's
  options (`sameSite`, `secure`, `httpOnly`) in `apps/api/src/index.ts`.
- **Window messages.** A `message` listener that acts on the data it receives (saving
  state, submitting a score) must check `event.source` or `event.origin`. A `postMessage`
  that carries user data names its target origin rather than `"*"`.
- **Error paths.** An error message that leaks internals to the client, or an error path
  that skips a permission check the success path makes.

This repository is public and has no private reporting channel. Report a vulnerability in
code already on `main` only to the person you are working for, and keep it out of
everything that reaches GitHub: PR descriptions, review comments, commit messages and
issues.

## Run the code

Reading is not verification. Where a finding can be settled by executing something —
a scratch Vitest test against the local database, a `curl` against the dev server, a
Cypress component test — write the smallest one that decides it, and report what it
actually did. Choose the input most likely to break the change rather than the one most
likely to show it working; a passing example proves less than a failing one. Delete any
scratch file before you finish.

API tests need a MySQL database with migrations and seed applied (`npm run db:setup`).
Check first whether one is reachable. If it is not, do not spend the review standing one
up: settle what you can by other means and label the rest accordingly.

Say how you established each claim: **ran it**, **read the code**, or **assumed**. A review
that does not distinguish these is hard to act on, because the reader cannot tell which
parts to re-check.

## Check prose against code, not against other prose

Every factual or quantitative claim — in the PR description, the `AGENTS.md` files, the
code comments, and the commit messages — must be traceable to the code that makes it true.
Cite the file and line, or delete the claim.

This matters most when a claim appears on several surfaces. A sentence written once and
then paraphrased into each new place tends to get checked against the earlier wording
rather than against the code, so one error propagates and every later reader finds it
reassuringly consistent with everything around it. Go back to the code each time,
including for the copy you have already read somewhere else.

## Scope

Prefer changes that live inside the PR's own diff. If you find a worthwhile refactor that
would mean editing files this PR does not touch — extracting shared machinery, folding
duplicated helpers together, reconciling pre-existing drift — **report it rather than
performing it**. It probably belongs in a PR of its own, and if this PR is part of a
stack, editing a lower layer forces every branch above it to be replayed.

## Simplification and maintainability

Once correctness is settled: look for code that can be made more concise, redundancy that
can be eliminated, and simplifications that would perform the same function. Abstract
repeated code into helper functions where that increases readability and where it stays in
scope as described above. Follow the conventions in the `AGENTS.md` for each workspace the
PR touches (`apps/api/AGENTS.md` for routes, errors and UUIDs; `apps/app/AGENTS.md` for
loaders and actions).

Review comments for accuracy and clarity of intent. Add doc strings where they would
clarify intent, and correct or remove any comment that no longer describes what the code
does.

`apps/app/src/types.ts` and `apps/api/src/types.ts` are meant to mirror each other but
have already drifted, and nothing in CI checks them. Flag a type the PR edits in one file
and not the other; report pre-existing drift as out of scope.

## Deploy safety

Every merged PR deploys to production on its own, so each one must be safe to run against
the database and clients that exist the moment it lands. Database and API changes follow
**expand-migrate-contract** across separate PRs: add the new column or endpoint, move
callers over, then remove the old one.

- A PR that drops or renames a column, field, or endpoint still used by code already
  deployed is a correctness finding, not a style one. Check that an earlier PR expanded
  and migrated first.
- A migration under `apps/api/prisma/migrations/` must match the `schema.prisma` diff,
  and a schema change with no migration (or the reverse) is a defect.
- If the schema changes, check whether `apps/api/prisma/seed.ts` and `prisma/seed/` need
  to change with it.
- Changes under `infra/` take effect only when someone runs `aws-deploy`, not on merge.
  If the code in the PR depends on an infra change being live first (a new env var, secret,
  IAM permission, queue, bucket or other resource the new image reads), the PR description
  must have a section headed `## Infra Updates Before Merge` (see "Pull Requests" in
  `AGENTS.md`). A PR whose code needs infra that its description doesn't flag is a
  deploy-safety finding.
- Test-only switches (`ENABLE_TEST_AUTH_BYPASS`, `ENABLE_TEST_ROUTES`,
  `MOCK_SIGNIN_EMAIL`) must stay confined to tests; nothing in production code may depend
  on them being set.

## Test coverage

Review whether the PR includes adequate tests:

- New behavior or bug fixes should have a test: Vitest for the API
  (`apps/api/src/test/*.test.ts` or colocated `*.test.ts`) and `packages/shared`, Cypress
  component tests for the app, Cypress e2e tests in `packages/e2e-tests` for flows that
  cross the two.
- A new or changed API route needs at least one **denied** case alongside the allowed
  one: a different user, an anonymous user, or content at a visibility level that should
  refuse. A route tested only by its owner documents nothing about its access control.
- A new Cypress spec must carry a `@groupN` tag (`@brittleN` for known-flaky ones). An
  untagged component test is silently skipped by every CI job.
- If the PR modifies existing behavior, confirm that existing tests covering it were
  updated to the new expected behavior.
- Check that the tests exercise the scenario the PR describes, not an adjacent one.
- A test written for a bug fix should **fail without the fix**. Where it is cheap to do so,
  confirm that by reverting the fix and watching the test fail; a test that passes either
  way documents nothing.

## Documentation and PR description

- If the PR changes a convention, command, or workflow that an `AGENTS.md` file or
  `CONTRIBUTING.md` describes, those files must change with it.
- The PR description must still describe everything in the diff. Check it explicitly
  rather than assuming an earlier pass left it accurate: it is the one surface that no
  test, no CI job and no reader of the code will catch when it goes stale. When rewriting
  it, follow the PR description rules under "Pull Requests" in `AGENTS.md`.
- If the PR adds an ADR under `docs/adr/`, its number must not already be taken on
  `main` or by another open PR. Two ADRs with the same number don't conflict in git,
  because their filenames differ, so the duplicate merges silently. Check
  `docs/adr/` on `main` and the open PRs that add ADRs.
