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
The recorded number of database queries each perf scenario makes. Any increase has to be accepted explicitly by updating the snapshot.

**Perf dataset**:
The synthetic, reproducible data that perf runs execute against, shaped to resemble prod's distributions: course sizes, folder depth, library size and so on. It can be generated at different scales.
_Avoid_: seed data (that is the minimal reference data every database gets), fixtures

**Page load marks**:
The three points a page load is measured to:

- **Shell ready**: the app's code has loaded and the page frame is drawn.
- **Data ready**: the route's data from the API has arrived and is rendered.
- **Content ready**: any embedded DoenetML is rendered and can be interacted with.

Responsiveness after load is not a page load mark.

**Passive measurement**:
Measuring prod by observing real users' traffic, never by sending synthetic requests that write data.
_Avoid_: monitoring (too broad), RUM
