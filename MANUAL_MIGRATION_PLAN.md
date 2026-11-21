# Manual migration plan — `20260814120000_problem_set_description_doc`

Runbook for adding `content.isDescription` to **prod** by hand.

```sql
ALTER TABLE `content` ADD COLUMN `isDescription` BOOLEAN NOT NULL DEFAULT false;
```

A one-line additive column, but on `content` it is a full table rebuild that
takes longer than the deploy's health-check timeout. Left to the deploy it fails
partway and leaves prod undeployable ([why](#why-this-cannot-just-be-deployed)).
So it is applied out-of-band, and the migration ships in this PR alone — ahead
of any code that reads the column.

**Cost:** ~8–9 min of writes blocked (estimated from 7 min 3 s on dev3). Reads
keep working; the site is read-only during the window, not down. Budget 15–20
minutes and decide the abort point before starting.

---

## The sequence

Run steps 1–4 against prod's MySQL, then merge and deploy this PR.

### 1. Pre-flight

Take a database backup and open a maintenance window.

Confirm prod is at exactly 20 applied migrations with nothing broken — otherwise
the deploy in step 5 will also run whatever else is outstanding:

```sql
SELECT COUNT(*) FROM _prisma_migrations
WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;          -- expect 20

SELECT migration_name, started_at FROM _prisma_migrations
WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL;           -- expect empty
```

Both must match before continuing. If the count is not 20, stop and find out
what else landed.

### 2. Apply the migration

Exactly the SQL from
`apps/api/prisma/migrations/20260814120000_problem_set_description_doc/migration.sql`:

```sql
ALTER TABLE `content` ADD COLUMN `isDescription` BOOLEAN NOT NULL DEFAULT false;
```

**Run it somewhere that survives a dropped connection** — `screen`, `tmux`, or
`nohup mysql -e "…" &`. An ECS exec session dying at minute 7 kills the `ALTER`.
That is recoverable (`ALGORITHM=COPY` discards the temp table and leaves the
original intact) but means starting over.

To watch progress from a second session:

```sql
SHOW PROCESSLIST;   -- the ALTER shows State = "copy to tmp table"
```

### 3. Record it in Prisma's bookkeeping

Prisma did not run the migration, so it has no row for it. Insert one, or the
next deploy tries the `ALTER` again:

```sql
INSERT INTO _prisma_migrations
  (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
VALUES
  (UUID(),
   'cffbbc8e54852ec48adcffca534a0c8eeb0c0d10ae13101f8b84274cd1985a2b',
   '20260814120000_problem_set_description_doc',
   NOW(3), NOW(3), 1);
```

`logs` and `rolled_back_at` are nullable and correctly left unset.

The checksum is the SHA-256 of `migration.sql`, verified against the row Prisma
itself wrote on dev3. It must be exact — Prisma checks applied migrations against
it and a mismatch fails the next deploy with "migration has been modified". If
`migration.sql` is ever edited, this value changes.

> `prisma migrate resolve --applied` would normally do this, but it requires the
> migration directory to exist locally, and the currently-running prod image
> predates it — that path fails with `P3017`.

### 4. Verify

```sql
SHOW COLUMNS FROM content LIKE 'isDescription';
-- expect: tinyint(1), Null = NO, Default = 0

SELECT COUNT(*) FROM _prisma_migrations
WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;          -- now 21
```

Both must pass before step 5. This is the gate — nothing above has been executed
against prod before.

### 5. Merge and deploy this PR

Deploy normally. `prisma migrate deploy` finds 21 of 21 applied and goes straight
to `npm run start`; the task should reach steady state in about a minute, as
healthy rollouts do. Nothing in this PR reads the column, so there is no
user-visible change.

If it instead sits unhealthy for 5 minutes, step 3 did not take. **Do not simply
retry** — a retry cannot fix a bookkeeping problem. Read the task's stdout first:

```bash
aws logs tail prod --region us-east-2 --since 15m \
  --log-stream-name-prefix doenet/doenet/ --format short
```

### Backing out

Reverting the schema means another full rebuild of the same length and another
write freeze:

```sql
ALTER TABLE content DROP COLUMN isDescription;
DELETE FROM _prisma_migrations
WHERE migration_name = '20260814120000_problem_set_description_doc';
```

Usually the better option is to leave the column and roll back only the
application image. The column is additive, and the old code neither reads nor
writes it.

---

## Why this cannot just be deployed

`content` carries two FULLTEXT indexes (`content_name_idx`, `content_source_idx`).
InnoDB cannot use `ALGORITHM=INSTANT` or `INPLACE` for `ADD COLUMN` on such a
table, so it falls all the way back to `ALGORITHM=COPY` — a full table rebuild.
MySQL says so itself:

```
mysql> ALTER TABLE content ADD COLUMN _x BOOLEAN NOT NULL DEFAULT false, ALGORITHM=INSTANT;
ERROR 1846 (0A000): ALGORITHM=INSTANT is not supported. Reason: InnoDB presently
supports one FULLTEXT index creation at a time. Try ALGORITHM=COPY/INPLACE.
```

Measured on dev3 (403 MB): **7 min 3 s**. The backend deploy allows **5 minutes**
(`timeout-minutes` defaults to `5` in `.github/actions/update-cluster-with-rollback`,
not overridden by `reusable-deploy-backend.yml`), and `entrypoint.sh` runs
`prisma migrate deploy` _before_ the server listens — so the task never passes a
health check while the rebuild runs, and the deploy kills it partway.

MySQL has no transactional DDL: the column commits but Prisma never writes
`finished_at`. Every later deploy then fails with `P3009` — **including a
rollback to `main`** — until someone runs `prisma migrate resolve` by hand. This
happened on dev3 on 2026-08-15 and left it undeployable until cleared manually.

Tracked in #3027. Until that is addressed, migrations touching `content` must be
applied out-of-band.

| Table size      | dev3      | prod                    |
| --------------- | --------- | ----------------------- |
| `content` data  | 383 MB    | 459 MB                  |
| `content` index | 20 MB     | 24 MB                   |
| Rebuild time    | 7 min 3 s | **~8–9 min (estimate)** |

Scale from dev3 with care — prod's MySQL container may not perform identically,
and the FULLTEXT rebuild may not scale linearly.

## Alternative to steps 2–3: let Prisma do its own bookkeeping

Avoids the manual `ALTER` and `INSERT` entirely, at the cost of a manual image
push. The deploy pushes to a **mutable** image tag and only runs
`update-service --force-new-deployment` — it never registers a new task
definition — so a one-off task launched after the push picks up the new image:

1. Build and push the image to the prod tag **without** updating the service
   (the workflow does both in one job, so this means running the docker
   build/push steps by hand).
2. `aws ecs run-task --cluster prod --task-definition <current def>` — no load
   balancer and no health-check clock, so the migration can take as long as it
   needs, and Prisma writes its own row.
3. Watch the task's logs; stop it once the migration completes.
4. Verify as in step 4, then deploy normally.

More faithful to what Prisma expects.

## Provenance

The rebuild timing, the `ALGORITHM=INSTANT` error, the checksum, and the
`_prisma_migrations` schema were all verified against **dev3**, and the deploy
timings against the workflows in `.github/`. **None of it has been executed
against prod.**

Prod facts confirmed 2026-08-17: cluster `prod`, service `doenet-FARGATE`,
`HealthCheckGracePeriod` 600s (the deploy script still gives up at 300s),
`content` at 459 MB + 24 MB index, 20 migrations applied and none broken.
