# Vendored files

Everything under `vendor/` is copied from an upstream project and kept
byte-for-byte as published. **Do not edit these files.** To update, diff
upstream's current version against the commit recorded alongside, review the
changes, and re-copy — re-applying any modification recorded there.

One directory per origin, each with its own `VENDORED.md` recording provenance,
licensing, and local modifications:

| Directory  | What                                                   | Details                                    |
| ---------- | ------------------------------------------------------ | ------------------------------------------ |
| `pretext/` | PreTeXt's SCORM bridge and SPLICE iframe resizer (GPL) | [pretext/VENDORED.md](pretext/VENDORED.md) |
| `scorm/`   | ADL/IMS SCORM 2004 4th Ed. schemas (reference data)    | [scorm/VENDORED.md](scorm/VENDORED.md)     |

Both are excluded from Prettier (see the repo's `.prettierignore`) so
reformatting can never obscure a diff against upstream. Where a local change
was unavoidable, it is marked in the source with `VENDOR-MOD` and explained in
that directory's `VENDORED.md`.

Not vendored, despite also being copied into built packages: `lz-string.min.js`
comes from the pinned `lz-string` npm dependency (see `../package.json`) and is
read out of `node_modules` at build time.
