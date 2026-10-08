# Performance harness

Tooling for the performance harness tracked in [#3059](https://github.com/Doenet/DoenetApps/issues/3059). Terms such as _perf dataset_ are defined in the Performance section of [`CONTEXT.md`](../../CONTEXT.md).

## Prod shape

[`prod-shape.sql`](./prod-shape.sql) measures prod's data distributions (students per course, folder depth, items per owner, library size, table sizes and so on) so the perf dataset can be generated at a prod-like scale. It returns aggregate numbers only: no ids, names, emails or content.

### Running it

A maintainer with access to the prod database runs it with any MySQL client that can reach it:

```bash
mysql -h <host> -u <user> -p --table <database> < packages/perf/prod-shape.sql > packages/perf/prod-shape.results.txt
```

- Connect as a user that has only `SELECT` on the database, not as the app's user or the admin. The read-only setting is a statement inside the script, so it protects only as far as the script is unchanged; the user's privileges are what actually stop a write. Our infra doesn't provide such a user yet ([#3067](https://github.com/Doenet/DoenetApps/issues/3067)). Until it does, run the script on a database restored from a snapshot and create one there with the admin credentials:

  ```sql
  CREATE USER 'prod_shape'@'%' IDENTIFIED BY '<password>';
  GRANT SELECT ON `<database>`.* TO 'prod_shape'@'%';
  ```

  The script needs nothing beyond `SELECT`. Delete the restored database when you're done: it holds a full copy of prod's data, including emails and sessions.

- Run it on a database restored from a recent snapshot, or, once #3067 provides a `SELECT`-only user, on a read replica. Users can't be created on a replica, since it is read-only. Avoid the primary: the script scans the largest tables, including `submittedResponses` and `Session`, and a long-running read on the primary holds back InnoDB's undo purge.
- Check the output before committing it: every row should be a count, a percentile or a table size.
- Commit `prod-shape.results.txt` together with the date it was taken. The dataset generator's prod-shaped scale is derived from it.
- Re-run it about once a semester, ideally mid-semester when course sizes and attempts are near their peak, or after a noticeable change in usage. If the numbers have moved, update the results and the generator's prod-shaped scale.

To try the script locally, run the same command against your dev database, using the connection details in `apps/api/.env`. Pass the host as `127.0.0.1` and add `-P <port>`: with `-h localhost`, the `mysql` client connects through the Unix socket and ignores `-P`, which reaches a different server or none.

### Keeping it in step with the schema

CI runs the script against the migrated and seeded test database (the `Run prod-shape queries` step in `.github/workflows/checks.yml`). A migration that renames or drops a table or column the script reads fails that step, so fix the script in the same PR. CI can't tell whether a metric still means what it should, so when a migration changes what a table or column represents, check the matching query by hand.

### Reading the output

- **Counts:** one number per metric, such as `courses` or `content_public_activities`. A content type the script doesn't know yet shows up as its own `content_<visibility>_unknown_<type>` row; add it to the `CASE` in the script.
- **Distributions:** for each metric, the number of groups measured, the sum over them, the p50, p95 and p99 (nearest rank) and the max. A distribution only covers groups with at least one member; for example, `students_per_course` leaves out courses with no students, and `courses` minus `courses_with_students` gives how many there are. Deleted content is left out.
- **Table sizes:** approximate row counts and on-disk sizes from InnoDB statistics, largest first. These include deleted content.
