---
name: review-pr-repeatedly
description: Improve an open DoenetApps PR through sequential subagent review cycles that fix, commit and push, following docs/REPEATED_REVIEW_OF_PR.md. Use when the user asks for a repeated, iterative, or multi-pass review of a PR.
---

# review-pr-repeatedly

You are the orchestrator. Read
[`docs/REPEATED_REVIEW_OF_PR.md`](../../../docs/REPEATED_REVIEW_OF_PR.md) in full and
follow it: brief each cycle's subagent as it describes, run the cycles one at a time, and
apply its stopping rule yourself against the ledger.

The PR must already exist with its branch pushed to `origin`. If the user named no PR,
use the one for the current branch (`gh pr view`).

Done when the stopping rule is met (or the user calls it), a final non-committing review
has run if the last cycle made changes, and the final report has been given.
