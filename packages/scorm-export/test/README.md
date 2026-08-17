# What these tests prove, and what they don't

A SCORM package is only "correct" relative to an LMS we do not control, so no
suite here can say it works. What the suite can do is remove whole classes of
doubt, cheaply and on every commit, and leave a short list of things that still
need a human and a real LMS.

Run with `npm test --workspace @doenet-tools/scorm-export`. No server, no
database, no network — a few seconds.

## The two boundaries that make this testable

`ptx_scorm_events.js` looks like untestable integration glue, but it only talks
to two interfaces:

1. the SCORM API object (`window.API_1484_11`), and
2. SPLICE `postMessage`s from the activity iframe.

Drive both and the runtime becomes an ordinary logic test. That matters most
for the state-size edge cases: rather than hoping a real activity happens to
emit a 73 KB state blob, `helpers/sco.js` sends exactly the size we want.

The LMS side is **not** a mock of the protocol. `helpers/lms.js` wraps
[`scorm-again`](https://github.com/jcputney/scorm-again) (MIT), a real SCORM
2004 runtime — the same kind of adapter LMSes and course authors ship — and adds
only a call recorder and a variant that truncates `suspend_data` instead of
rejecting it. A mock would test the parts of the spec whoever wrote it happened
to remember, and would agree with the content under test by construction.
scorm-again enforces the actual data model: vocabularies, read-only and
undefined elements, value ranges, and the string SPMs, with the spec's error
codes. `cmi.suspend_data` over 64,000 chars is **refused** with error 406 and
the previous value stands; some real players truncate instead, hence the
`truncateAt` option.

This paid for itself immediately — see "A real deviation it found" below.

Each case builds a real package and boots it in a fresh JSDOM, so the templates
and the vendored bridge under test are the ones that ship.

## Layers

| Layer             | File               | Covers                                                                                                       |
| ----------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Builder           | `build.test.js`    | placeholder substitution, title escaping, `</script>` and U+2028 in the source, zip layout, determinism      |
| Package coherence | `build.test.js`    | manifest declares 2004 4th Ed; every referenced file is in the zip; flat structure                           |
| Manifest schema   | `manifest.test.js` | the generated `imsmanifest.xml` validates against the official SCORM 2004 4th Ed XSDs, titles included       |
| Data model        | `bridge.test.js`   | no write a conformant LMS would refuse; the SPM is genuinely enforced                                        |
| Runtime behaviour | `bridge.test.js`   | session start, score + state writes, cross-launch restore                                                    |
| State-size edges  | `bridge.test.js`   | the SPM invariant, growth past the budget, nothing-ever-fit, truncating player, localStorage refusing writes |

## The manifest is checked against the spec, not against our expectations

`manifest.test.js` validates the generated `imsmanifest.xml` with libxml2
(`xmllint-wasm` — WASM, so no native build, no Java, no binary on PATH) against
ADL's own SCORM 2004 4th Edition schemas — read out of the built package rather
than out of `../vendor/scorm`, so what is checked is the copy that actually ships
inside the zip alongside the manifest. That catches
structural mistakes nobody thought to assert: element order, missing required
attributes, identifiers that do not match their declared type.

It doubles as an end-to-end check of XML escaping, since the activity title is
interpolated into the document — a title containing `&`, `<`, `]]>` or an XML
declaration produces something that is not even well-formed if the escaping is
wrong.

Three deliberately broken manifests are asserted to _fail_. Without them, a
validator that silently could not resolve its schemas would pass everything and
the rest of the file would be worthless.

## A real deviation it found

The bridge keys each interaction record by the exercise's div id, and a
single-document package has exactly one. So the second answer writes an id
already used at index 0, which a strict player refuses (error 351 — an id is
immutable once set and may not repeat across the collection); the dependent
fields then fail with 408.

The gradebook is unaffected — the score lives in `cmi.score.*` and still gets
through — but per-attempt interaction detail after the first answer is lost on
a strict player. Left as-is deliberately: changing the id scheme changes what
the records mean, and it is a question for upstream PreTeXt, whose
multi-exercise pages do not hit it. A test pins the current behaviour so that
fixing it is a visible decision rather than a silent change.

No mock we wrote ourselves would have caught this.

## The invariant worth keeping

> No write to `cmi.suspend_data` may exceed the field's SPM, for any state the
> activity produces.

That is asserted across state sizes from 1 KB to 1 MB. It is the one property
that, if it ever breaks, corrupts data on a real LMS — on Blackboard an
oversized write takes the score persist down with it.

## Where the budget actually runs out

Measured, not assumed (`bridge.test.js`, last block): lz-string manages only
**~1.2x** on low-repetition state, and real Doenet state measured 1.15-1.8x.
Repetitive synthetic filler compresses 5-20x and will tell you the ceiling is
far away; it isn't. At 1.2x the 60,000-char budget is gone by **~72 KB of raw
state** — inside the "10-100 KB" range this file's own comments cite for Doenet
state. Treat the limit as reachable in normal use, not a pathological corner.

## What is still unverified

- **Real LMS behaviour.** scorm-again implements the spec; real players deviate
  from it in both directions. Canvas resets `suspend_data` between attempts,
  Blackboard has its own finalization ordering, and players differ on whether an
  over-SPM write truncates or fails. The vendored bridge carries hard-won
  workarounds for these — nothing here exercises them.
- **Whether real activities reach these sizes.** The generator is a stand-in.
  Worth sampling actual state blobs from real activities.
- **The real viewer.** `@doenet/standalone` is loaded from a CDN at runtime and
  never runs in these tests, so the SPLICE message shape is assumed, not
  observed. A change on Doenet's side would pass this suite and break in an LMS.
- **JSDOM is not a browser.** Storage partitioning, third-party cookie policy,
  and the parent-frame walk in `discoverApi()` behave differently for real.

## Suggested manual pass before a release

1. Build a package and upload to at least Canvas and one other LMS.
2. Answer, close the tab, relaunch: state and score both come back.
3. Repeat in a different browser (proves the LMS copy, not localStorage).
4. Open the console — no `[PTX-SCORM]` warnings during a normal session.
5. **On Blackboard specifically**: answer, close the tab, and check the attempt
   is not stuck at "draft saved" and shows a grade. Page exit now writes
   `completion_status` alongside `exit="suspend"`, which adds an element to the
   unload batch that Blackboard testing validated before the submit button was
   removed. Nothing automated covers this.
6. For the size path, build with `--debug` and watch `[DOENET-SIZE-PROBE]` for
   what the LMS actually returns.

Heavier options, in increasing order of fidelity and cost, if this ever ships
widely:

- **ADL SCORM 2004 4th Ed Conformance Test Suite** — the official certification
  suite from ADL. Authoritative for "is this a conformant package", but it is an
  interactive Java application: a per-release manual gate, not a CI step.
- **SCORM Cloud** (Rustici) — a real commercial player with a REST API, so a
  package can be uploaded, launched and its registration results fetched from a
  script. Needs an account and credentials, so it belongs in a nightly job
  rather than PR CI.
- **A real LMS in Docker** (Moodle has official images) driven by Cypress. The
  most faithful thing that can be automated, and the most expensive to keep
  working.
