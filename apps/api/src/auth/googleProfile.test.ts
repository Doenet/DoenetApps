import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { toGoogleAccount } from "./googleProfile";

/**
 * Payloads are written the way Google sends them -- snake_case OIDC claims --
 * rather than the way `passport-google-oauth20` reshapes them, because the
 * reshape is what this module exists to bypass.
 */
describe("toGoogleAccount", () => {
  it("reads a complete profile", () => {
    expect(
      toGoogleAccount({
        sub: "108000000000000000001",
        email: "ada@example.com",
        email_verified: true,
        given_name: "Ada",
        family_name: "Lovelace",
        name: "Ada Lovelace",
      }),
    ).toEqual({
      email: "ada@example.com",
      firstNames: "Ada",
      lastNames: "Lovelace",
    });
  });

  it("handles an account with no family name", () => {
    // The 2026-08-23 outage. `family_name` is an optional OIDC claim and Google
    // omits it for mononymous accounts; it reached Prisma as a missing required
    // argument and killed the process.
    expect(
      toGoogleAccount({
        sub: "108000000000000000002",
        email: "gavin@example.com",
        email_verified: true,
        given_name: "Gavin",
        name: "Gavin",
      }),
    ).toEqual({
      email: "gavin@example.com",
      firstNames: "Gavin",
      lastNames: "",
    });
  });

  it("handles an account with no name claims at all", () => {
    // The second failure mode: with neither name claim, passport builds no
    // `profile.name` object, so reading `.givenName` off it threw a TypeError.
    expect(
      toGoogleAccount({
        sub: "108000000000000000003",
        email: "someone@example.com",
        email_verified: true,
      }),
    ).toEqual({
      email: "someone@example.com",
      firstNames: null,
      lastNames: "",
    });
  });

  it("does not trust an unverified email address", () => {
    expect(
      toGoogleAccount({
        sub: "108000000000000000004",
        email: "not-really-mine@example.com",
        email_verified: false,
        given_name: "Mallory",
      }),
    ).toEqual({
      email: "108000000000000000004@google.com",
      firstNames: "Mallory",
      lastNames: "",
    });
  });

  it("falls back to the account id when no email is present", () => {
    // `email` is only sent when the `email` scope was granted.
    expect(toGoogleAccount({ sub: "108000000000000000005" })).toEqual({
      email: "108000000000000000005@google.com",
      firstNames: null,
      lastNames: "",
    });
  });

  it("accepts email_verified as a string", () => {
    expect(
      toGoogleAccount({
        sub: "108000000000000000006",
        email: "stringly@example.com",
        email_verified: "true",
      }).email,
    ).toBe("stringly@example.com");
  });

  it("ignores claims it does not know about", () => {
    // Google adding a claim must not be able to fail a login.
    expect(
      toGoogleAccount({
        sub: "108000000000000000007",
        email: "future@example.com",
        email_verified: true,
        given_name: "Future",
        family_name: "Claim",
        some_claim_added_in_2027: { nested: true },
      }),
    ).toEqual({
      email: "future@example.com",
      firstNames: "Future",
      lastNames: "Claim",
    });
  });

  it("rejects a payload with no subject", () => {
    // `sub` is the one claim OIDC guarantees, and the account identity depends
    // on it. Failing here fails one login; `asyncPassport` turns it into
    // `done(err)`.
    expect(() => toGoogleAccount({ email: "nobody@example.com" })).toThrow(
      ZodError,
    );
  });

  it("rejects a payload that is not an object", () => {
    expect(() => toGoogleAccount(undefined)).toThrow(ZodError);
    expect(() => toGoogleAccount("not a profile")).toThrow(ZodError);
  });

  it("rejects a claim of the wrong type", () => {
    expect(() =>
      toGoogleAccount({ sub: "108000000000000000008", family_name: 42 }),
    ).toThrow(ZodError);
  });
});
