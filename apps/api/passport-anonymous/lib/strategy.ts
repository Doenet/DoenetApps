/**
 * Module dependencies.
 */
import { Strategy as _Strategy } from "passport-strategy";

/**
 * Creates an instance of `Strategy`.
 *
 * The anonymous authentication strategy passes authentication without verifying
 * credentials.
 *
 * Applications typically use this as a fallback on endpoints that can respond
 * to both authenticated and unauthenticated requests.  If credentials are not
 * supplied, this strategy passes authentication while leaving `req.user` set to
 * `undefined`, allowing the route to handle unauthenticated requests as
 * desired.
 *
 * Examples:
 *
 *     passport.use(new AnonymousStrategy());
 *
 * @constructor
 * @api public
 */
class Strategy extends _Strategy {
  constructor() {
    super();
  }
  name = "anonymous";

  /**
   * Pass authentication without verifying credentials.
   */
  authenticate() {
    // Duane Nykamp, August 2025: made two modifications from original `passport-anonymous`
    // - call `this.success` rather than `this.pass` so that `passport.serializeUser` is called.
    // - wait 1000 ms before calling to mitigate a race condition where we get a failure of the anonymous user being logged in
    //   when the log out of the previous session occurs after this anonymous session is logged in and supersedes it
    setTimeout(() => {
      this.success({ anonymous: true });
    }, 1000);
  }
}

/**
 * Expose `Strategy`.
 */
export { Strategy };
