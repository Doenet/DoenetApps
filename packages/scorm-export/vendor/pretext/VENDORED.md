# Vendored files

These files are copied from upstream projects. Except where a local
modification is recorded below, they are verbatim copies and must not be edited.
To update, diff upstream's current version against the commit recorded below,
review the changes, and re-copy (re-applying any recorded local modification).

License: these PreTeXt files are GPL v2 or v3 (see PreTeXt's `COPYING` file).
Attribution and this notice must be preserved.

Note: `lz-string` (MIT) is **not** vendored here — it is a pinned npm
dependency (see `../package.json`) that `build.mjs` copies into the package
from `node_modules` at build time.

## ptx_scorm_events.js

- Source: https://github.com/PreTeXtBook/pretext — `js/ptx_scorm_events.js`
- Copied at commit: `83e8f200248383d1bdbe009d8b57f3d91f379d3e` (2026-07-17)
- Upstream history of interest: PR #2685 (initial SCORM tracking),
  PR #2887 (Doenet/SPLICE support), PR #3040 (Blackboard fixes)
- Local modifications: **YES** — search the file for `VENDOR-MOD`. Purpose:
  persist the Doenet activity state through the SCORM data model instead of
  localStorage only, so student work restores on a fresh LMS launch (upstream
  stores it in localStorage, which LMSes do not carry across launches). The
  `_doenetStates` map is compressed (LZ-string, base64) into `cmi.suspend_data`
  by `buildSuspendData()` and rehydrated by `restoreDoenetStates()` on session
  start; `SUSPEND_TOTAL_LIMIT` was raised to 60000 for the 4th-Edition
  suspend_data cap. A size guard drops the blob (falling back to localStorage)
  if it would overflow the budget. A second gap is also fixed: upstream only
  saves the Doenet state blob when Runestone is present (the save is gated on
  `RunestoneBase.__ptxScormHooked`), so in a Runestone-free standalone package
  the state was never captured at all; the SPLICE `message` handler now forwards
  `state` (and the real subject, so the init-guard runs) into `recordInteraction`.
  Two further fixes guard the failure path when state outgrows the budget.
  (1) Dropping the blob used to overwrite `cmi.suspend_data` with a blob-less
  payload, so a session that crossed the budget did not merely fail to save new
  work — it erased the last snapshot that had fit, and since Doenet state grows
  monotonically it never recovered. `_lastGoodDz` remembers the last blob known
  to fit (seeded on restore, updated on each successful write) and is
  re-attached instead of clearing, so the failure mode is "state stops updating"
  rather than "state is destroyed"; grading fields stay current and the
  gradebook value is unaffected either way, since it lives in `cmi.score.*`.
  (2) `saveDoenetState()`'s localStorage write was in an empty `catch`, which
  hid the second half of a total-loss case — localStorage is the documented
  fallback once the blob is dropped, and an LMS runs the SCO as a cross-site
  iframe where storage may be partitioned or over quota. It now warns once per
  divId (`_lsWarned`).
  A third change removes the "Submit Assignment" button. A Doenet activity has
  no single end-of-page submission: the viewer reports
  `SPLICE.reportScoreAndState` after every answer carrying the whole document's
  score, which `recordInteraction()` writes and commits, so the grade is already
  correct at all times. The button only added `completion_status` and
  `success_status` on top of a score that was already in the gradebook — and it
  set `success_status` to `passed` unconditionally, recording a student who
  scored 0 as having passed. `addSubmitButton()` is no longer called (the call
  is commented out rather than the function deleted, to keep an upstream
  re-copy a small diff), and `handlePageExit()` sets `completion_status` when at
  least one score was reported, keeping `exit="suspend"` so the attempt stays
  resumable. Nothing writes `success_status` any more; pass/fail is the LMS's
  call from its mastery score, which is what the per-answer path already said.
  This diverges from upstream on purpose — PreTeXt's multi-exercise pages, where
  one page holds many independent exercises, are a case an explicit submit
  genuinely fits — so it is the least likely of these mods to be wanted back
  upstream. It also adds an element to the unload batch that Blackboard testing
  validated, so it wants checking on a real Blackboard install.
  Touch points, all marked `VENDOR-MOD`: `_doenetStates` comment, `_lastGoodDz`
  and `_lsWarned` declarations, `SUSPEND_TOTAL_LIMIT` + `buildSuspendData()`,
  `saveDoenetState()`, `restoreDoenetStates()`, the two
  restore paths (`initSession`, `loadRestoreData`), the SPLICE
  `reportScoreAndState` → `recordInteraction` call, the commented-out
  `addSubmitButton()` call, `handlePageExit()`, and `submitSession()`'s dropped
  `success_status` write. This is a candidate to
  contribute upstream to PreTeXt (Oscar Levin); if accepted, drop the local mod
  and re-copy verbatim.
- Requires the `lz-string` npm dependency (loaded as `window.LZString`) and the
  manifest declaring SCORM 2004 4th Edition.

## lti_iframe_resizer.js

- Source: https://github.com/PreTeXtBook/pretext — `js/lti_iframe_resizer.js`
- Copied at commit: `83e8f200248383d1bdbe009d8b57f3d91f379d3e` (2026-07-17)
- Handles the SPLICE `lti.frameResize` postMessage so the activity iframe
  grows to fit its content.
- Local modifications: none
