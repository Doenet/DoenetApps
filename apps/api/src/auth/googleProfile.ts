import { z } from "zod";

/**
 * Google's OpenID Connect user info payload, as reached through
 * `profile._json` on a `passport-google-oauth20` profile.
 *
 * Why validate `_json` rather than trust `profile`?
 *
 * `profile.name.familyName` is not a field Google sends. Google sends
 * `family_name`, and `passport-google-oauth20` reshapes it in
 * `lib/profile/openid.js`:
 *
 *     if (json.family_name || json.given_name) {
 *       profile.name = { familyName: json.family_name,
 *                        givenName:  json.given_name };
 *     }
 *
 * Both branches of that reshape produced production crashes. A user with a
 * given name but no family name yielded `familyName: undefined`, which reached
 * Prisma as a missing required argument. A user with neither yielded no `name`
 * key at all, so reading `.givenName` off it threw a TypeError.
 *
 * `@types/passport` declares that shape as `{ familyName: string; givenName:
 * string }` -- non-optional, and wrong. That is the general problem with
 * answering this with types alone: a `.d.ts` is a claim about a third party's
 * payload, checked at build time and never again. This schema is a claim that
 * is checked on every login, at the point the data crosses into our system --
 * the same discipline `queryLoggedIn` already applies to request bodies.
 *
 * Fields are optional here because OIDC says they are. `family_name` and
 * `given_name` are listed as optional standard claims; only `sub` is
 * guaranteed. Unknown keys are stripped rather than rejected, so Google adding
 * a claim cannot break a login.
 *
 * @see https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
 */
export const googleProfileJsonSchema = z.object({
  sub: z.string().min(1),
  email: z.string().optional(),
  // Spec'd as a boolean, but string forms appear in the wild often enough that
  // rejecting them would mean failing real logins over a formatting detail.
  email_verified: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

export type GoogleProfileJson = z.infer<typeof googleProfileJsonSchema>;

/** The fields this application actually stores for a Google account. */
export type GoogleAccount = {
  email: string;
  firstNames: string | null;
  lastNames: string;
};

/**
 * Validate a Google profile payload and reduce it to the fields we store.
 *
 * Throws `ZodError` if the payload is not recognizably a Google profile, which
 * `asyncPassport` routes to `done(err)` -- a failed login rather than a failed
 * process.
 *
 * A missing family name becomes `""`, which is how this codebase already
 * represents an unknown last name: the magic-link path creates users with
 * `lastNames: ""`, and `findOrCreateUser` treats `""` as the sentinel that lets
 * a real name backfill it later. Making the column nullable instead would add a
 * third state without adding meaning, and would break that backfill.
 */
export function toGoogleAccount(raw: unknown): GoogleAccount {
  const json = googleProfileJsonSchema.parse(raw);

  const verified =
    json.email_verified === true || json.email_verified === "true";

  return {
    // An unverified or absent address must not claim the namespace of a real
    // one, so it falls back to a value derived from the Google account id.
    email: json.email && verified ? json.email : `${json.sub}@google.com`,
    firstNames: json.given_name ?? null,
    lastNames: json.family_name ?? "",
  };
}
