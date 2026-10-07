/**
 * The payload shapes that reach `passport.serializeUser`.
 *
 * Passport's own types assume a single `Express.User` that round-trips: the
 * value `serializeUser` receives is the same type `deserializeUser` produces.
 * That is not true here. Four strategies each hand `serializeUser` a different
 * shape, and `index.ts` augments `Request["user"]` to `UserInfoWithEmail` --
 * the *deserialized* type, which none of these are. So the shapes are declared
 * here instead of borrowed from `@types/passport`.
 *
 * Each strategy's payload is produced by the corresponding `passport.use(...)`
 * call in `index.ts`; the anonymous one comes from
 * `passport-anonymous/lib/strategy.ts`, which calls `this.success({ anonymous:
 * true })`.
 */

/**
 * A `passport-google-oauth20` profile, narrowed to what `serializeUser` reads.
 *
 * `_json` is deliberately `unknown`: it is Google's raw payload, and the point
 * of `toGoogleAccount` is that nothing may read it before it is validated. The
 * reshaped `profile.name` is not declared at all, because that reshape is where
 * the production crashes came from.
 */
export type GoogleSessionUser = {
  provider: "google";
  _json: unknown;
  /** Set by the Google verify callback when upgrading an anonymous session. */
  fromAnonymous?: string;
};

export type MagicLinkSessionUser = {
  provider: "magiclink";
  email: string;
  fromAnonymous: string;
};

export type LocalSessionUser = {
  provider: "local";
  userId: Uint8Array;
};

export type AnonymousSessionUser = {
  provider?: undefined;
  anonymous: true;
};

export type SessionUser =
  | GoogleSessionUser
  | MagicLinkSessionUser
  | LocalSessionUser
  | AnonymousSessionUser;
