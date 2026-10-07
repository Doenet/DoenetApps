/**
 * Last-resort process-level guard against a single request killing the server.
 *
 * Every deliberate error path in this codebase is already handled — see
 * `handleErrors` for routes and `asyncPassport` for the auth callbacks. This
 * exists for the failures nobody anticipated: since Node 15, an unhandled
 * rejection anywhere terminates the process, so one unguarded `await` in one
 * request path is enough to take the whole API down for every user.
 *
 * Registering a listener overrides that default. A dropped request is a far
 * better outcome than a crash loop, and the log line below is the signal that
 * something needs a real fix upstream.
 */
export function installProcessErrorHandlers() {
  process.on("unhandledRejection", (reason: unknown) => {
    console.error(
      "[process] Unhandled promise rejection — request dropped, server continuing. " +
        "This is a bug: the failing path should handle its own errors.",
      reason,
    );
  });

  // `uncaughtException` is deliberately NOT handled. A rejected promise leaves
  // the process healthy — only that one request is lost — but a synchronous
  // throw that unwinds to the top can leave state half-mutated, and continuing
  // from there risks serving corrupt data. Crashing and letting ECS replace the
  // task is the safer response to that one.
}
