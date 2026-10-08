---
name: review-pr
description: Review a DoenetApps PR or branch for correctness, access control, security and deploy safety, following docs/PR_REVIEW_GUIDELINES.md. Use when the user asks to review a PR, a branch, or work-in-progress changes in this repo.
---

# review-pr

1. **Pick the diff.**
   - Given a PR number or URL: `gh pr checkout <n>` if the working tree is clean
     (otherwise read it with `gh pr diff <n>`), then diff against its base.
   - Given a parent branch (stacked PR): `git diff <parent>...HEAD`. Findings in the
     parent are reported, not fixed.
   - Otherwise: the current branch, `git diff $(git merge-base upstream/main HEAD)...HEAD`
     (run `git fetch upstream` first).
2. **Read [`docs/PR_REVIEW_GUIDELINES.md`](../../../docs/PR_REVIEW_GUIDELINES.md)** in
   full and apply every section to the diff. Done when each section has either a finding
   or an explicit "nothing found".
3. **Report in the terminal**, most severe first. Each finding carries `file:line`, what
   breaks and for whom, and how it was established: **ran it**, **read the code**, or
   **assumed**.

The review is read-only: report, don't edit. Post it to GitHub (`gh pr review`) only
when the user asks, and end the body with an agent footer such as
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`. To review
and fix iteratively, use the `review-pr-repeatedly` skill instead.
