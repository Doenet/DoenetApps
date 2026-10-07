import express, { NextFunction, Request, Response } from "express";
import passportLib from "passport";
import jwt from "jsonwebtoken";
import { getUser, getUserInfoFromEmail } from "../query/user";
import axios from "axios";
import { convertUUID } from "../utils/uuid";
import { isTestAuthBypassEnabled } from "../utils/env";
import { UserInfoWithEmail } from "../types";
import { toGoogleAccount } from "../auth";

// Type assertion to work around passport type declaration issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const passport = passportLib as any;

export const loginRouter = express.Router();

if (isTestAuthBypassEnabled()) {
  loginRouter.post(
    "/createOrLoginAsTest",
    passport.authenticate("anonymous"),
    (_req: Request, res: Response) => {
      res.send();
    },
  );
}

/**
 * Where to send the browser after a successful Google login.
 *
 * `family_name` is an optional OIDC standard claim, so a Google account can
 * authenticate perfectly well and still arrive with no last name -- the same
 * state every magic-link user starts in. The magic-link flow asks for a name at
 * exactly this point (`ConfirmSignIn.tsx`) and the assignment flow refuses to
 * start without one (`AssignmentViewer.tsx`). This gives Google logins the same
 * gate, rather than being the one entry path that drops a nameless user into
 * the app.
 */
async function landingPageAfterGoogleLogin(req: Request): Promise<string> {
  try {
    // `req.user` here is the Google profile that `serializeUser` consumed, not
    // a deserialized user: Passport sets it to whatever the strategy produced.
    // The stored record is therefore looked up by re-deriving the email with
    // the same `toGoogleAccount` call `serializeUser` used, so the two
    // derivations cannot drift apart.
    const { email } = toGoogleAccount(
      (req.user as unknown as { _json?: unknown })._json,
    );
    const user = await getUserInfoFromEmail(email);

    return user.lastNames ? "/" : "/changeName?redirect=/";
  } catch (e) {
    // The login itself already succeeded -- only the name check failed. Letting
    // them in beats failing a good login: `AssignmentViewer` still refuses to
    // start an assignment without a name.
    console.error("[Auth] Could not check name after Google login", e);
    return "/";
  }
}

loginRouter.get(
  "/google",
  // No `successRedirect`, so Passport calls the next handler on success.
  passport.authenticate("google", { failureRedirect: "/login" }),
  // `landingPageAfterGoogleLogin` handles its own errors and never rejects,
  // which matters because Express 4 ignores a rejected handler promise.
  async (req: Request, res: Response) => {
    res.redirect(await landingPageAfterGoogleLogin(req));
  },
);

loginRouter.get(
  "/magiclink",

  (req: Request, res: Response, next: NextFunction) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const tokenPrefix = token ? `${token.slice(0, 12)}…` : "<missing>";
    const decoded = token
      ? (jwt.decode(token) as {
          user?: { email?: string };
          iat?: number;
          exp?: number;
        } | null)
      : null;
    const tokenCtx = {
      tokenPrefix,
      claimedEmail: decoded?.user?.email ?? "<unparseable>",
      issuedAt: decoded?.iat
        ? new Date(decoded.iat * 1000).toISOString()
        : undefined,
      expiresAt: decoded?.exp
        ? new Date(decoded.exp * 1000).toISOString()
        : undefined,
    };

    passport.authenticate(
      "magiclink",
      {
        action: "acceptToken",
        userPrimaryKey: "email",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any, user: Express.User | false | null, info: any) => {
        if (err) {
          console.error(`[Auth Error] Server error during magic link login:`, {
            ...tokenCtx,
            err,
          });
          return next(err);
        }

        if (!user) {
          console.warn(`[Auth Failed] Magic link login failed.`, {
            ...tokenCtx,
            reason: info?.message ?? "Unknown reason",
          });
          return res
            .status(401)
            .send({ error: "Invalid or expired magic link." });
        }

        req.logIn(user, async (loginErr) => {
          if (loginErr) {
            console.error(`[Auth Error] Session creation failed:`, {
              ...tokenCtx,
              err: loginErr,
            });
            return next(loginErr);
          }

          try {
            const userInfo = await getUserInfoFromEmail(
              (user as { email: string }).email,
            );
            return res.send({ user: userInfo });
          } catch (fetchErr) {
            console.error(
              `[Auth Error] Authentication succeeded but DB failed to fetch user info:`,
              { ...tokenCtx, err: fetchErr },
            );
            return next(fetchErr);
          }
        });
      },
    )(req, res, next);
  },
);

loginRouter.post(
  "/handle",
  passport.authenticate("local", {}),
  async (req: Request, res: Response) => {
    const user = await getUser(req.user as { userId: Uint8Array });
    res.send({ user: convertUUID(user) });
  },
);

loginRouter.post(
  "/anonymous",
  passport.authenticate("anonymous"),
  (req: Request, res: Response) => {
    res.send(req.user);
  },
);

loginRouter.get(
  "/logout",
  async function (req, _res, next) {
    if (req.user) {
      // Try to log the user out of Discourse, but don't block logout if it fails
      logoutFromDiscourse(req.user);
    }
    return next();
  },
  function (req, res, next) {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  },
);

async function logoutFromDiscourse(user: UserInfoWithEmail) {
  try {
    const { data: discourseUser } = await axios.get(
      `${process.env.DISCOURSE_URL}/u/by-external/${user.userId}.json`,
      {
        headers: {
          "Api-Key": process.env.DISCOURSE_API_KEY || "",
          "Api-Username": process.env.DISCOURSE_API_USERNAME || "",
        },
      },
    );
    const discourseUserId = discourseUser.user.id;

    await axios.post(
      `${process.env.DISCOURSE_URL}/admin/users/${discourseUserId}/log_out.json`,
      {},
      {
        headers: {
          "Api-Key": process.env.DISCOURSE_API_KEY || "",
          "Api-Username": process.env.DISCOURSE_API_USERNAME || "",
        },
      },
    );
  } catch (error) {
    console.error(`Failed to logout of Discourse: ${error}`);
  }
}
