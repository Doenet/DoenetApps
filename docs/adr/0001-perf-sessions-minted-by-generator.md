# dev3 perf users get sessions minted by the dataset generator

Perf runs on dev3 need to act as logged-in perf users, but dev3 is publicly reachable and runs with `ENABLE_TEST_AUTH_BYPASS=false` and `ENABLE_TEST_ROUTES=false`. Turning the bypass on would let anyone log in as any user, with any flags. Instead, the perf dataset generator runs as a one-off task inside dev3. It writes the perf dataset and a session for each perf user directly, and hands the harness the signed session cookies. This adds no public attack surface. Don't turn the test auth bypass on in dev3 to make perf runs easier.
