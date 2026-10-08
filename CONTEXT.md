# Doenet Apps

The Doenet web app: where authors create and share DoenetML activities, and instructors assign them to students.

## Language

### Performance

**Perf proxy**:
A deterministic stand-in for speed that does not vary between runs on the same code and data, such as database queries per request or bytes of JavaScript shipped. Perf proxies are the only performance numbers allowed to fail a PR.
_Avoid_: metric (taken by the product usage metrics), benchmark

**Wall-clock timing**:
Elapsed time as a user or client would experience it. Noisy, so it is only compared between runs in the same environment and never fails a PR on its own.
_Avoid_: latency (ambiguous between server and client), speed

**Perf run**:
One execution of the performance harness against one deployed build, in one environment, on the perf dataset. It is void if the deployed build changes during the run.

**Baseline run**:
The perf run of `main` that another perf run is compared against. Comparisons are only meaningful between runs in the same environment.

**Perf scenario**:
A named user journey that the harness measures: one page load and the API calls behind it, performed as one perf user. Example: "instructor opens the scores of a 200-student course".
_Avoid_: test case, benchmark, endpoint test

**Perf user**:
A user that exists only in the perf dataset and plays one role (guest, student, instructor or author) in perf scenarios.

**Query count snapshot**:
The recorded number of database queries each perf scenario makes. Any change, up or down, has to be accepted explicitly by updating the snapshot.

**Perf dataset**:
The synthetic, reproducible data that perf runs execute against, shaped to resemble prod's distributions: course sizes, folder depth, library size and so on. It can be generated at different scales.
_Avoid_: seed data (taken by the reference data loaded into dev and CI databases, and by the load tests' setup data), fixtures

**Page load marks**:
The three points a page load is measured to:

- **Shell ready**: the app's code has loaded and the page frame is drawn.
- **Data ready**: the route's data from the API has arrived and is rendered.
- **Content ready**: any embedded DoenetML is rendered and can be interacted with.

Responsiveness after load is not a page load mark.

**Passive measurement**:
Measuring prod by observing real users' traffic, never by sending synthetic requests that write data.
_Avoid_: monitoring (too broad), RUM

### API boundary

**API contract**:
The published description of the operations the API offers: what each one accepts and what it returns. Both the server and the app are checked against it.
_Avoid_: schema (too vague), types

**Operation**:
One callable unit of the API, identified by a stable name independent of its URL.
_Avoid_: route, endpoint (refer to the transport, not the contract)

**Covered operation**:
An **Operation** described in the **API contract**, all of whose callers in our code are type-checked against it. An operation that isn't covered yet is only an Express route; nothing checks changes to it.

**Internal operation**:
An **Operation** whose only callers are ones we build and deploy (the app, the e2e tests), so we can know whether it is still called.

**External operation**:
An **Operation** that something outside our deployments calls (Discourse SSO, OAuth callbacks). We can never show it is unused, so migrating our own callers never makes removing it safe.

**Stale client**:
A copy of the app running in a browser that was built against an older **API contract** than the one the server now runs: a tab left open across a deploy, or a page loaded mid-rollout.

**Breaking change**:
A change to the **API contract** that would break a client built against the previous one: removing an **Operation** or field, requiring a new input, or letting a response return values it couldn't before. Allowed only once the replacement has been deployed long enough that no **Stale client** still needs the old shape.

### Database

**Destructive migration**:
A database migration that would break the backend code still serving while it runs: dropping or renaming a table or column, adding `NOT NULL` without a default, narrowing a type, or adding a unique constraint. Allowed only once the code that used the old shape is no longer deployed.

**Ignored field**:
A model or field marked with Prisma's `@ignore`: the column stays in the database but leaves the generated client, so no new code can use it. The usual step before dropping it.

## Relationships

- The **API contract** lists the **Covered operations**; each one is either **Internal** or **External**
- Every new **Operation** is a **Covered operation**; the number of uncovered ones may only go down
- A **Stale client** may still call **Operations** that newer code has changed; it picks up the latest build on its next navigation
- A **Breaking change** or **Destructive migration** is the second of two PRs: the first adds the replacement and migrates every caller
- An **External operation** never becomes safe to remove by migrating our own callers

## Flagged ambiguities

- "endpoint" and "route" were used for both the URL and the contract-level unit; resolved: **Operation** is the contract-level unit, route/endpoint is the URL.
