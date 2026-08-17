# doenet-scorm-export

Backs the "Download SCORM" button on doenet.org: wraps a single DoenetML
activity in an LMS-ready SCORM 2004 package. The SCORM runtime intelligence is reused from PreTeXt as two
verbatim-vendored JavaScript files (see `vendor/VENDORED.md`).

## Layout

Building a package is pure string substitution plus a zip, so that work lives
in `src/index.js` with no `fs`, no `child_process`, and no DOM — it runs
unchanged in Node and in the browser. Three thin callers wrap it:

| Caller                                     | Loads the constant files with         |
| ------------------------------------------ | ------------------------------------- |
| `build.mjs` (this package's CLI)           | `src/node-assets.js` (`readFileSync`) |
| `test/` (the suite)                        | the same `src/node-assets.js`         |
| `apps/app/src/utils/scorm.ts` (the button) | Vite's `?raw` imports                 |

All of them hand those files to `buildScormPackage(assets, options)` as
strings, which is why `vendor/` stays the single verbatim copy of the GPL
sources rather than being duplicated into a generated module. `node-assets.js`
is deliberately separate from `index.js`: the browser bundles `index.js`, so it
must stay free of `fs`.

The CLI is not a second implementation — it is argument parsing plus
`writeFileSync` around the same builder the button calls. It earns its keep as
the only way to produce a `--debug` package (see Debugging below) and the only
way to build one without running the whole dev stack, which is what you want
when the next step is uploading to a real LMS.

## Try it

```sh
node build.mjs sample/sample.doenet --title "Sample Doenet Activity"
```

This writes `dist/sample-scorm.zip`. Upload that zip to an LMS as a SCORM
package (Canvas: Settings → Navigation → enable SCORM, then SCORM → Upload;
Moodle: add a "SCORM package" activity; Brightspace/Blackboard: content
upload menus). The page shows the activity; scores flow to the LMS gradebook
as the student answers, with no submit step.

## What's in a package

A SCORM package here is 21 static files in a flat zip — six that do the work,
plus the 15 SCORM control documents:

| File                    | Role                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `imsmanifest.xml`       | Minimal SCORM 2004 4th Ed. manifest: one item, one SCO, launch `index.html`        |
| `index.html`            | Chrome-free shell: `div[data-component="doenet"]` wrapping the activity iframe     |
| `activity.html`         | The iframe content: DoenetML source + `@doenet/standalone` viewer from CDN         |
| `ptx_scorm_events.js`   | Vendored SCORM bridge (LMS API discovery, scoring, state save/restore)             |
| `lti_iframe_resizer.js` | Vendored SPLICE `lti.frameResize` handler so the iframe fits its content           |
| `lz-string.min.js`      | `lz-string` npm dep, copied in at build time; compresses state for suspend_data    |
| `*.xsd` (15 files)      | SCORM 2004 4th Ed. schemas the manifest's `schemaLocation` names (`vendor/scorm/`) |

Only `activity.html` (DoenetML) and the title/id substitutions vary per
activity; everything else is constant. The two `ptx_*`/`lti_*` files are
vendored (see `vendor/VENDORED.md`); `lz-string.min.js` comes from the pinned
`lz-string` npm dependency, not from `vendor/`. The schemas are vendored too
(see `vendor/VENDORED.md`) and ship at the zip root, which is where a content
package traditionally carries its control documents — so a strict validator can
resolve `xsi:schemaLocation` without network access. They add ~88 KB.

## How scoring works at runtime

1. The LMS launches `index.html` in an iframe and exposes the SCORM API
   (`window.API_1484_11` or `window.API`) on a parent window.
2. `activity.html`'s viewer has `data-doenet-message-parent="true"`, so it
   speaks SPLICE to its parent: `SPLICE.getState` on load (state restore)
   and `SPLICE.reportScoreAndState` on each answer (score in [0,1] plus a
   state blob encoding the student's work).
3. `ptx_scorm_events.js` in `index.html` translates those messages into
   SCORM calls: `cmi.interactions.*` records, `cmi.score.scaled/raw`, and
   completion status. The Doenet state blob is compressed (lz-string) into
   `cmi.suspend_data` — the manifest declares SCORM 2004 4th Edition for its
   64,000-char `suspend_data` limit — so both score and state persist
   server-side and restore on a fresh LMS launch (localStorage is kept only
   as a same-device cache). A size guard drops the state blob, falling back to
   localStorage, if it would ever overflow the budget — keeping the last
   snapshot that did fit rather than clearing the field, so an activity that
   outgrows the budget stops updating its saved state instead of losing it.
   Scores are unaffected: they live in `cmi.score.*`, not in `suspend_data`.
4. There is no submit button. A Doenet activity has no single end-of-page
   submission — the score in step 3 is the whole document's, so the gradebook
   is already correct after every answer. Leaving the page marks the SCO
   completed (only if something was answered) and finalizes the attempt with
   `exit="suspend"`, so it stays resumable. Terminating only on real page
   unload is a hard-won Blackboard requirement — see the comments in the
   vendored file.

## Debugging

`debug/size-probe.html` is a passive diagnostic that logs, to the browser
console: the size of each state blob Doenet emits and what the LMS actually
returned in `cmi.suspend_data` on launch (`[DOENET-SIZE-PROBE] …`), and each
`lti.frameResize` — the height reported, the height applied to the activity
iframe, and whether `index.html` overflows the box the LMS gave it
(`[DOENET-RESIZE-PROBE] …`; the "OUTER frame overflows" clause means the
scrollbar is the LMS player's, not ours). It is **not** part of a normal
package. Pass `--debug` to inline it into `index.html`:

```sh
node build.mjs sample/sample.doenet --debug
```

The file count is unchanged (it is inlined, not added as a separate file);
without `--debug` the package contains no trace of it.

## Testing

```sh
npm test --workspace @doenet-tools/scorm-export
```

No server, network, or LMS: the builder is checked directly, and the runtime is
driven through the real vendored bridge in JSDOM, against a real SCORM 2004
runtime (`scorm-again`) and synthesized SPLICE messages — which makes the
`suspend_data` size edge cases ordinary deterministic tests and checks every
write against the actual data model. The generated `imsmanifest.xml` is
validated against ADL's own 4th Edition schemas (vendored in `schemas/`, see the
`VENDORED.md` there). `test/README.md` records what all of that does and does
not prove, and what still needs a real LMS.

## Notes and remaining limits

- Only single documents can be exported. A package is one SCO wrapping one
  DoenetML source in one iframe, so problem sets and sequences would need a
  different manifest and a different shell; the button is hidden for them.
- Keep the id stable across re-exports of the same activity: it keys the
  student's saved score and state in the LMS and in localStorage. The website
  passes the activity's `contentId` so renames don't orphan student work.
- The viewer loads from `cdn.jsdelivr.net`. The website pins the activity's
  own `doenetmlVersion`; from the CLI, pass `--doenet-version`. A fully
  offline package would need the standalone viewer bundled into the zip.
- The DoenetML source is injected into `activity.html` at runtime from a JS
  string literal with every `<` escaped, so a source containing `</script>`
  can't terminate the enclosing element — there is no source this rejects.
- Zips use a fixed timestamp, so re-exporting an unchanged activity produces
  the same bytes rather than embedding the build time.
- The vendored files are GPL (v2 or v3) from PreTeXt — preserve
  `vendor/VENDORED.md`, don't edit the copies, and pull upstream fixes by
  re-copying (instructions in that file).

## DOM contract with the vendored bridge

`ptx_scorm_events.js` expects: an element `div[data-component="doenet"]`
with the activity id, containing the iframe whose `contentWindow` sends the
SPLICE messages, all inside `<main>` (which upstream's now-unused
submit button would append to).
`index.html` provides exactly this; if you restructure it, keep those
invariants.
