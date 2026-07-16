# Legacy content migration

Copies every user's Portfolio and Course content from legacy.doenet.org into
their account on the new doenet.org, under a private "Copied Legacy Content"
folder. See `legacy-content-migration-plan.md` (in the legacy repo root) for
the full plan and decisions.

What each user gets:

- `Copied Legacy Content/Portfolio/` — their portfolio activities.
- `Copied Legacy Content/Courses/<course>/<sections...>` — every course they
  own (each co-owner gets an independent copy), with the legacy section
  structure reproduced as folders.
- Single-page activities become Documents; multi-page activities and banks
  become Problem Sets with their pages flattened in document order.
- Everything is private, licensed CCDUAL, DoenetML version 0.6.
- Referenced images are uploaded to the media bucket, created as image
  content (license CC-BY) in the same folder as the referencing activity,
  and `doenet:cid=<cid>` references in document sources are rewritten to the
  new `doenet:<id>` form (requires @doenet/standalone >= 0.6.15 for 0.6 docs).

## Prerequisites

- The target database has the `imageContent` migration (PR #2993) applied and
  seeded licenses / doenetmlVersions (0.6 must exist and not be removed).
- The legacy data is on disk (see "Refreshing the legacy data" below):
  `~/legacy-migration/input/legacy-data.sql` and
  `~/legacy-migration/input/media/` (extracted from media.tgz).
- `MEDIA_S3_*` env vars point at the target media bucket, `DATABASE_URL` at
  the target database (apps/api/.env for local dev).

## Stages

All commands run from `apps/api`. Artifacts land in
`scripts/legacy-migration/build/` (gitignored).

```bash
# 0. load the dump into a scratch MySQL database (drops + recreates it)
scripts/legacy-migration/00-load-scratch.sh

# 1. read scratch DB + media tree -> build/model.json + extract-report.md
npx tsx scripts/legacy-migration/01-extract.ts

# review build/extract-report.md before continuing

# 2. upload referenced images to S3 -> build/image-map.json (idempotent)
npx tsx scripts/legacy-migration/02-upload-images.ts

# 3. dry-run the import (no writes; journals to id-map.dry-run.tsv)
npx tsx scripts/legacy-migration/03-import.ts --dry-run

# 4. import one test user, check it in the UI
npx tsx scripts/legacy-migration/03-import.ts --user=someone@example.com

# 5. full import (journals to build/id-map.tsv; re-run to resume)
npx tsx scripts/legacy-migration/03-import.ts

# 6. verify
npx tsx scripts/legacy-migration/04-verify.ts
```

Writing to a non-local database additionally requires
`--yes-target=<db-host>` on 03-import.

### Flags

- `--dry-run` — plan + report everything, write nothing (02 and 03).
- `--user=<email>` — restrict to one legacy user (01 is unaffected; 02/03/04 honor it).
- `--yes-target=<host>` — confirm writing to a non-local DATABASE_URL host.

### Environment overrides

- `LEGACY_SCRATCH_DATABASE_URL` (default `mysql://root:root@127.0.0.1:3307/legacy_migration`)
- `LEGACY_MEDIA_DIR` (default `~/legacy-migration/input/media`)
- `LEGACY_BUILD_DIR` (default `scripts/legacy-migration/build`)

## Idempotency / resume

Every created row is appended to `build/id-map.tsv` _before_ the next create.
Re-running 03-import skips journaled items, so a crashed run resumes where it
stopped. If a user already has a "Copied Legacy Content" folder that is not
in the journal, that user is skipped with an error (protects against
double-importing with a lost journal). 02-upload-images re-verifies existing
map entries with a HEAD request before skipping them.

`build/id-map.tsv` is also the deliverable mapping legacy ids to new-site
short ids (kind: user / folder / activity / page / image), for back-links and
user support.

## Refreshing the legacy data

```bash
# database (any host that can reach the UMN MySQL):
mysqldump -h mysql-prod5.oit.umn.edu -u csedoenetprod -p \
  --single-transaction --skip-lock-tables \
  --default-character-set=utf8mb4 --set-gtid-purged=OFF \
  cse_doenet_prod \
  user course course_role course_user course_content pages link_pages support_files \
  > ~/legacy-data.sql

# media (on the legacy web host):
cd /var/www/html/legacy.doenet.org && tar -czf ~/media.tgz media

# then transfer both into ~/legacy-migration/input/ and extract media.tgz there
```

## Tests

```bash
npx vitest run scripts/legacy-migration
```
