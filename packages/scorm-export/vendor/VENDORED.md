# Vendored files

These files are copied from upstream projects. Except where a local
modification is recorded below, they are verbatim copies and must not be edited.
To update, diff upstream's current version against the commit recorded below,
review the changes, and re-copy (re-applying any recorded local modification).

License: the two PreTeXt files are GPL v2 or v3 (see PreTeXt's `COPYING` file);
`lz-string.min.js` is MIT. Attribution and these notices must be preserved.

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
  Touch points, all marked `VENDOR-MOD`: `_doenetStates` comment,
  `SUSPEND_TOTAL_LIMIT` + `buildSuspendData()`, `restoreDoenetStates()`, the two
  restore paths (`initSession`, `loadRestoreData`), and the SPLICE
  `reportScoreAndState` → `recordInteraction` call. This is a candidate to
  contribute upstream to PreTeXt (Oscar Levin); if accepted, drop the local mod
  and re-copy verbatim.
- Requires `lz-string.min.js` and the manifest declaring SCORM 2004 4th Edition.

## lti_iframe_resizer.js

- Source: https://github.com/PreTeXtBook/pretext — `js/lti_iframe_resizer.js`
- Copied at commit: `83e8f200248383d1bdbe009d8b57f3d91f379d3e` (2026-07-17)
- Handles the SPLICE `lti.frameResize` postMessage so the activity iframe
  grows to fit its content.
- Local modifications: none

## lz-string.min.js

- Source: https://github.com/pieroxy/lz-string — `libs/lz-string.min.js`
- Version: 1.5.0, fetched from `https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js` (2026-07-23)
- License: MIT (© 2013 pieroxy)
- Used by `ptx_scorm_events.js` (via `window.LZString`) to compress the Doenet
  activity state before storing it in `cmi.suspend_data`. `compressToBase64` /
  `decompressFromBase64` are used so the payload is JSON- and transport-safe.
- Local modifications: none
