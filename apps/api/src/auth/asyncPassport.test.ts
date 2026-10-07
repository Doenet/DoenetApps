import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import passportLib from "passport";
import { asyncPassport } from "./asyncPassport";

type Done = (err: unknown, result?: unknown) => void;

// `Authenticator` is a runtime export of `passport` but only an interface in
// `@types/passport`, so the constructor has to be reached through the default
// export. Only `serializeUser` is needed here.
const Authenticator = (
  passportLib as unknown as {
    Authenticator: new () => {
      serializeUser: (...args: unknown[]) => void;
    };
  }
).Authenticator;

describe("asyncPassport", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes through a successful result", async () => {
    const done = vi.fn();
    const wrapped = asyncPassport("ok", async (value: string, cb: Done) => {
      cb(null, value.toUpperCase());
    });

    wrapped("hi" as never, done as never);
    await vi.waitFor(() => expect(done).toHaveBeenCalledWith(null, "HI"));
  });

  it("routes a rejection to done(err) instead of letting it escape", async () => {
    const done = vi.fn();
    const boom = new Error("boom");
    const wrapped = asyncPassport("rejects", async (_cb: Done) => {
      throw boom;
    });

    wrapped(done as never);
    await vi.waitFor(() => expect(done).toHaveBeenCalledTimes(1));
    expect(done.mock.calls[0][0]).toBe(boom);
  });

  it("catches a handler dereferencing an absent nested field", async () => {
    // The shape of the 2026-08-23 outage: a handler read a field off an object
    // the provider had not sent. What Google actually sends, and how it is
    // validated, is covered in `googleProfile.test.ts`; this test is only about
    // the resulting TypeError reaching `done` instead of the process.
    const done = vi.fn();
    const wrapped = asyncPassport(
      "deref",
      async (user: { name?: { givenName: string } }, _cb: Done) => {
        return user.name!.givenName;
      },
    );

    wrapped({} as never, done as never);
    await vi.waitFor(() => {
      expect(done).toHaveBeenCalledTimes(1);
      expect(done.mock.calls[0][0]).toBeInstanceOf(TypeError);
    });
  });

  it("catches synchronous throws from a non-async handler", async () => {
    const done = vi.fn();
    const throwsSync = (_cb: Done): Promise<unknown> => {
      throw new Error("sync boom");
    };
    const wrapped = asyncPassport("sync", throwsSync);

    wrapped(done as never);
    await vi.waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  });

  it("does not call done twice when a handler succeeds and then throws", async () => {
    const done = vi.fn();
    const wrapped = asyncPassport("late-throw", async (cb: Done) => {
      cb(null, "first");
      throw new Error("after the fact");
    });

    wrapped(done as never);
    await vi.waitFor(() => expect(done).toHaveBeenCalledTimes(1));
    expect(done).toHaveBeenCalledWith(null, "first");
  });

  it("preserves arity, which is how Passport decides what to pass", () => {
    const three = asyncPassport(
      "three",
      async (_req: unknown, _user: unknown, _cb: Done) => {},
    );
    const two = asyncPassport("two", async (_user: unknown, _cb: Done) => {});

    // Passport calls `layer(req, user, done)` only when `layer.length === 3`.
    expect(three.length).toBe(3);
    expect(two.length).toBe(2);
  });

  it("receives (req, user, done) in the right order through real Passport", async () => {
    // Regression test for the wrapper reporting `.length === 0`, which made
    // Passport call it as `layer(user, done)` and shift every argument by one.
    const passport = new Authenticator();
    const seen: { req: unknown; user: unknown }[] = [];

    passport.serializeUser(
      asyncPassport(
        "serialize",
        async (req: { marker: string }, user: { id: string }, cb: Done) => {
          seen.push({ req: req.marker, user: user.id });
          cb(null, user.id);
        },
      ),
    );

    const serialized = await new Promise((resolve, reject) => {
      passport.serializeUser(
        { id: "user-1" },
        { marker: "the-request" },
        (err: unknown, obj?: unknown) => (err ? reject(err) : resolve(obj)),
      );
    });

    expect(seen).toEqual([{ req: "the-request", user: "user-1" }]);
    expect(serialized).toBe("user-1");
  });

  it("throws immediately if the last argument is not a callback", () => {
    const wrapped = asyncPassport("bad-args", async (_cb: Done) => {});
    expect(() => wrapped("not-a-function" as never)).toThrow(TypeError);
  });
});
