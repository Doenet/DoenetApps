export type DoneCallback = (err: unknown, result?: unknown) => void;

/**
 * Wraps an `async` Passport callback so a rejection can never escape.
 *
 * Passport's callbacks are callback-style: they signal completion by calling
 * `done`, and Passport does not await their return value. Handing Passport an
 * `async` function therefore produces a floating promise — any throw becomes an
 * unhandled rejection, which (since Node 15) terminates the process. A single
 * malformed OAuth profile takes down the whole server.
 *
 * This is the auth-path equivalent of `queryLoggedIn` in
 * `middleware/queryMiddleware.ts`: it guarantees that every failure reaches one
 * error path instead of relying on each call site to remember a try/catch.
 *
 * Errors are reported through `done(err)`, which is what Passport expects and
 * what routes the failure into normal Express error handling.
 *
 * The returned function reports the same `.length` as the handler it wraps.
 * Passport dispatches on arity -- see `authenticator.js`, which calls
 * `layer(req, user, done)` only when `layer.length === 3` and otherwise calls
 * `layer(user, done)` -- so a wrapper using rest parameters (`.length === 0`)
 * would silently shift every argument by one.
 */
export function asyncPassport<F extends (...args: never[]) => Promise<unknown>>(
  label: string,
  handler: F,
): (...args: Parameters<F>) => void {
  const wrapper = (...args: Parameters<F>) => {
    const done = args[args.length - 1] as DoneCallback;

    if (typeof done !== "function") {
      throw new TypeError(
        `asyncPassport(${label}): expected the last argument to be a done callback`,
      );
    }

    // Passport misbehaves if `done` fires twice, which can happen when a handler
    // succeeds and then throws afterwards. Only the first call is forwarded.
    let settled = false;
    const guardedDone: DoneCallback = (err, result) => {
      if (settled) {
        return;
      }
      settled = true;
      done(err, result);
    };

    const guardedArgs = [
      ...args.slice(0, -1),
      guardedDone,
    ] as unknown as Parameters<F>;

    // `Promise.resolve().then(...)` also captures synchronous throws, so this
    // stays correct if a non-async function is ever passed in.
    void Promise.resolve()
      .then(() => handler(...guardedArgs))
      .catch((e: unknown) => {
        console.error(`[auth] ${label} failed`, e);
        guardedDone(e);
      });
  };

  // `Function.prototype.length` is configurable, so this is the least invasive
  // way to keep Passport's arity dispatch working through the wrapper.
  Object.defineProperty(wrapper, "length", { value: handler.length });

  return wrapper;
}
