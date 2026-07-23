# doenet-scorm-export

Prototype for a "Download SCORM" button on doenet.org: wraps a single
DoenetML activity in an LMS-ready SCORM 2004 package, **without** the PreTeXt
toolchain. The SCORM runtime intelligence is reused from PreTeXt as two
verbatim-vendored JavaScript files (see `vendor/VENDORED.md`).

## Try it

```sh
node build.mjs sample/sample.doenet --title "Sample Doenet Activity"
```

This writes `dist/sample-scorm.zip`. Upload that zip to an LMS as a SCORM
package (Canvas: Settings → Navigation → enable SCORM, then SCORM → Upload;
Moodle: add a "SCORM package" activity; Brightspace/Blackboard: content
upload menus). The page shows the activity plus a "Submit Assignment"
button; scores flow to the LMS gradebook.

## What's in a package

A SCORM package here is just five static files in a flat zip:

| File                    | Role                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ |
| `imsmanifest.xml`       | Minimal SCORM 2004 3rd Ed. manifest: one item, one SCO, launch `index.html`    |
| `index.html`            | Chrome-free shell: `div[data-component="doenet"]` wrapping the activity iframe |
| `activity.html`         | The iframe content: DoenetML source + `@doenet/standalone` viewer from CDN     |
| `ptx_scorm_events.js`   | Vendored SCORM bridge (LMS API discovery, scoring, state save/restore, submit) |
| `lti_iframe_resizer.js` | Vendored SPLICE `lti.frameResize` handler so the iframe fits its content       |

Only `activity.html` (DoenetML) and the title/id substitutions vary per
activity; everything else is constant.

## How scoring works at runtime

1. The LMS launches `index.html` in an iframe and exposes the SCORM API
   (`window.API_1484_11` or `window.API`) on a parent window.
2. `activity.html`'s viewer has `data-doenet-message-parent="true"`, so it
   speaks SPLICE to its parent: `SPLICE.getState` on load (state restore)
   and `SPLICE.reportScoreAndState` on each answer (score in [0,1] plus a
   state blob encoding the student's work).
3. `ptx_scorm_events.js` in `index.html` translates those messages into
   SCORM calls: `cmi.interactions.*` records, `cmi.score.scaled/raw`, and
   completion status. Doenet state blobs are persisted in localStorage
   (they exceed the 4 KB `cmi.suspend_data` limit); score bookkeeping goes
   in `suspend_data` so it survives across devices.
4. "Submit Assignment" commits the final grade; the attempt is finalized
   when the student leaves the page (this ordering is a hard-won Blackboard
   requirement — see the comments in the vendored file).

## Toward production on doenet.org

- The build is template substitution + zip, so it can run entirely
  client-side behind the button: fetch the five files, substitute, zip with
  JSZip, trigger the download. `build.mjs` exists only so the package can be
  produced and tested from a shell.
- Keep `--id` stable across re-exports of the same activity: it keys the
  student's saved score and state in the LMS and in localStorage.
- The viewer loads from `cdn.jsdelivr.net`; pin `--doenet-version` for
  reproducible packages. A fully offline package would need the standalone
  viewer bundled into the zip instead.
- `</script>` cannot appear in the DoenetML source (it terminates the inline
  script element); `build.mjs` rejects such sources. A production version
  could instead ship the source as a separate `.doenet` file fetched at
  runtime, which also removes any escaping concerns.
- The vendored files are GPL (v2 or v3) from PreTeXt — preserve
  `vendor/VENDORED.md`, don't edit the copies, and pull upstream fixes by
  re-copying (instructions in that file).

## DOM contract with the vendored bridge

`ptx_scorm_events.js` expects: an element `div[data-component="doenet"]`
with the activity id, containing the iframe whose `contentWindow` sends the
SPLICE messages, all inside `<main>` (where the submit button is appended).
`index.html` provides exactly this; if you restructure it, keep those
invariants.
