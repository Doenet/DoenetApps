// `auth` — helpers for the Passport authentication path.
//
//   asyncPassport      — wrap an async Passport callback so a rejection reaches
//                        `done(err)` instead of escaping as an unhandled rejection
//   toGoogleAccount    — validate Google's raw OIDC payload and reduce it to the
//                        fields we store
//   parseFromAnonymous — read the anonymous account id carried through a login
//   SessionUser        — the payload shapes that reach `serializeUser`
//
// Import from here, not from a source file.

export { asyncPassport } from "./asyncPassport";
export type { DoneCallback } from "./asyncPassport";
export { toGoogleAccount, googleProfileJsonSchema } from "./googleProfile";
export { parseFromAnonymous } from "./fromAnonymous";
export type { GoogleAccount, GoogleProfileJson } from "./googleProfile";
export type {
  SessionUser,
  GoogleSessionUser,
  MagicLinkSessionUser,
  LocalSessionUser,
  AnonymousSessionUser,
} from "./sessionUser";
