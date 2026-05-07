import express, { Request, Response } from "express";
import passportLib from "passport";
import { getUser, getUserInfoFromEmail } from "../query/user";
import axios from "axios";
import { convertUUID } from "../utils/uuid";
import { UserInfoWithEmail } from "../types";

// Type assertion to work around passport type declaration issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const passport = passportLib as any;

export const loginRouter = express.Router();

if (
  process.env.ENABLE_TEST_AUTH_BYPASS &&
  process.env.ENABLE_TEST_AUTH_BYPASS.toLocaleLowerCase() !== "false"
) {
  loginRouter.post(
    "/createOrLoginAsTest",
    passport.authenticate("anonymous"),
    (_req: Request, res: Response) => {
      res.send();
    },
  );
}

loginRouter.get(
  "/google",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  }),
);

loginRouter.get(
  "/magiclink",
  passport.authenticate("magiclink", {
    action: "acceptToken",
    userPrimaryKey: "email",
  }),
  async (req: Request, res: Response) => {
    const user = await getUserInfoFromEmail(
      (req.user as { email: string }).email,
    );
    res.send({ user });
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
