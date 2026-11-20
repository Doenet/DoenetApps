# Repeated Review of a PR

After creating a PR, use this procedure to iteratively improve it through a series of
subagent reviews. Each cycle spawns one subagent, which reviews the PR as the previous
cycle left it.

## Before the first cycle

Put these in every subagent's brief, not just the first:

- **The working directory, as an absolute path**, and an instruction to verify it before
  starting. More than one checkout or worktree of this repository may exist on the
  machine, and a review agent that starts in the wrong one will commit to the wrong one.
- **What to review.** By default, `git diff $(git merge-base upstream/main HEAD)...HEAD`.
  If the PR is part of a stack, its GitHub diff includes every PR beneath it: point the
  reviewer at `git diff <parent-branch>...HEAD`, name the branches it must not touch, and
  say plainly that a finding in a lower PR is to be **reported, not fixed**.
- **What is already settled**: decisions taken, refactors deliberately deferred, traps
  already hit. Without this each cycle re-derives the same conclusions and re-proposes the
  same declined changes.
- **The ledger path**: `.review-ledger.md` at the root of the working directory
  (gitignored). Create it before the first cycle.

## Cycle 0: approach

Before the first review cycle, run one agent that asks only the question in the Approach
section of `docs/PR_REVIEW_GUIDELINES.md`: what small change, inside or outside this PR,
would make most of this diff unnecessary? It tests the PR description's `## Approach`
claim, if there is one. It **does not commit**: it appends its result to the ledger and
reports back either "no structural finding" or a structural finding (one that passes the
size test in the guidelines), with the proposed fix and roughly how much of the diff it
would remove.

This cycle comes first because it is the only one whose finding can make the others
wasted work: every correctness cycle run before it would harden code that may be deleted.

## Halting on a structural finding

When any cycle — cycle 0 or a later one — reports a structural finding, the orchestrator
**halts the loop** and puts it to the user: the problem, the proposed fix, how much of the
diff it would remove, and the options (restructure this PR, land a prerequisite PR first,
or proceed as is). Do not spawn the next cycle until the user decides. A later cycle that
finds a structural problem reports it instead of fixing it, and does not make other
changes in that cycle that the restructure would discard.

Record the user's answer in the ledger as a **decision**, so later cycles do not
re-propose it.

- **Proceed as is**: continue the loop from where it stopped.
- **Restructure, or rebase onto a prerequisite PR**: the PR is now a different diff, and
  earlier cycles reviewed code that no longer exists. Once the restructure is pushed,
  **reset the cycle count** and start again from cycle 0. Keep the ledger, but mark where
  the reset happened; entries above it describe the old diff.

A structural observation that fails the size test is not a reason to halt. Report it in
the ledger and the final report as a follow-up, as the Scope section of the guidelines
describes.

## The review cycle

Give the subagent these instructions:

1. Read the ledger. Verify the previous cycle's changes (skip on the first cycle). Take
   its ledger entry as a set of claims, not as settled fact, and check the ones it
   recorded as _assumed_ or _read_ rather than _ran_. Confirming a change was unnecessary,
   or wrong, is as useful an outcome as a new finding — say so and revert it.
2. Review the PR according to `docs/PR_REVIEW_GUIDELINES.md`, through this cycle's lens.
3. Address the issues identified during the review — but **confirm a finding before
   changing code for it**. If the guidelines' test says you established it by _assuming_,
   either settle it by running something or report it without acting on it. A wrong
   correctness fix is worse here than a wrong report, because it is committed, pushed, and
   inherited by every later cycle as a decision already taken. A vulnerability in code
   already on `main` is the exception: leave it unfixed and out of commits and the PR
   description, and report it only to the orchestrator, who reports it only to the user.
4. Run `npm run format && npm run lint`, and the tests covering what you changed.
5. Verify the PR description still describes everything in the diff; update it with
   `gh pr edit` if not, following the PR description rules in `AGENTS.md`. Don't skip
   this — nothing else in the pipeline checks it.
6. Commit and push the results to `origin`.
7. Append to the ledger, and report back a short summary of what was changed (or "no
   changes" if nothing needed updating).

Run cycles **sequentially**: each new subagent must see the prior subagent's commits, so
wait for one to finish before spawning the next, and pull the latest branch state in
between.

## Lenses

Repeating one prompt has steep diminishing returns; asking a different question does not.
Give each cycle a lens of its own. Cycle 0 asks whether the diff should exist in this
shape; the four lenses after it take the approach as settled. Those four are different
questions, not four attempts at the same one, and each covers a class of defect the others
do not:

| Cycle | Lens                                                                                                                                                                                                                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | **Approach.** What small change, inside or outside this PR, would make most of the diff unnecessary? Report only; see "Cycle 0: approach" above.                                                                                                                              |
| 1     | **Correctness, access control and edge cases.** Does it do what it claims, for every user who can reach it — the owner, another user, an anonymous visitor — at every visibility level, on empty, deleted and boundary input?                                                 |
| 2     | **Security.** Read the diff as an attacker would, following the Security section of `docs/PR_REVIEW_GUIDELINES.md`: for each new input, who controls it and where does it end up? What do secrets, personal data, prod credentials, CI workflows and new dependencies expose? |
| 3     | **Behavior delta.** What changed that is not visible in the diff — permission helpers, visibility rules, query wrappers, `packages/shared`? What regressed? Is it safe to deploy on its own?                                                                                  |
| 4     | **Claims against code.** Every statement in the PR description, `AGENTS.md` files, comments and commit messages, traced to the code that makes it true. Plus test and documentation coverage.                                                                                 |
| 5+    | The reviewer's own judgment, informed by the ledger.                                                                                                                                                                                                                          |

A lens is a starting point, not a restriction: a cycle that notices a bug outside its lens
should still fix it, unless it is a vulnerability already on `main` (step 3) or a
structural finding (see "Halting on a structural finding").

## The ledger

Each cycle appends a short entry recording what it verified and how, what it found, and
what it deliberately did not do and why. The next cycle reads the ledger first, so settled
ground is not re-derived and deferred items are reconsidered rather than forgotten.

Keep two kinds of entry apart, because the next cycle must treat them differently:

- **Decisions**: a refactor declined as out of scope, an approach chosen, a trap already
  hit. These are closed. Do not re-litigate them.
- **Findings and the changes made for them**, each recorded with how it was established:
  **ran it**, **read the code**, or **assumed**. These are open. They are the previous
  agent's conclusions about code it was editing at the time, and the next cycle is the only
  independent reader they will get.

A ledger that blurs the two suppresses the loop's own check: fresh eyes on the last cycle's
work are what a sequential loop has instead of a separate verification stage, and an entry
written as "fixed, verified" spends that for nothing.

## When to stop

- Cycle 0 does not count toward these numbers.
- Run at least **four** cycles, one for each lens. The minimum is four because there
  are four lenses, not because four passes are better than three: stopping at three skips the
  claims-against-code pass entirely, which is the one that catches a false statement
  repeated across the PR description, the comments and the `AGENTS.md` files. A quiet
  cycle under one lens says nothing about what the next lens would find.
- From the fifth cycle on, stop when a cycle finds **no correctness issue**: no bug or vulnerability, no
  inaccurate claim, no missing coverage for behavior that is in the diff. Wording changes
  and typo fixes do not by themselves justify another cycle.
- The orchestrator judges this against the ledger. Do not leave it to the agent that made
  the changes to decide whether its own changes were significant.
- A cycle that reports "no changes" is a real result and is how this loop is meant to end.
  A cycle that produces a finding in order to look productive costs the next cycle the time
  to disprove it, so the brief should say so.

When the loop ends on a cycle that _made_ changes — at the cap, or because the user
called it — those changes are the only ones no other cycle has seen. Run one more agent
that reviews and reports without committing, rather than treating the last cycle's own
account of its work as verification.

**Six cycles is a soft cap, not a hard one.** If a sixth cycle is still turning up real
problems, do not simply keep going, and do not stop merely because a number was reached.
Put it to the user: report what the last two cycles found, say why the evidence suggests
more remain, and let them decide whether to continue. A PR still yielding defects at cycle
six may need something other than another cycle — it may need to be split, or its approach
reconsidered — and that is a judgment for a person to make.

## Final report

After the last cycle, summarize for the user:

- How many cycles ran and why they stopped, including any halt for a structural finding,
  what the user decided, and whether the count was reset.
- The most important changes made across all cycles.
- Anything reported but deliberately not fixed, and why. This includes structural
  observations below the size test, as candidate follow-up PRs.
- A link to the PR.
