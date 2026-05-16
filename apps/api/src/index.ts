import express, { Express, Request, Response } from "express";
import * as path from "path";
import bodyParser from "body-parser";

import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { prisma } from "./model";
import session from "express-session";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";

import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as MagicLinkStrategy } from "passport-magic-link";
import { Strategy as AnonymIdStrategy } from "../passport-anonymous/lib/strategy";
import { Strategy as LocalStrategy } from "passport-local";

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import { nanoid } from "nanoid";
import * as fs from "fs/promises";
import { fromUUID, toUUID } from "./utils/uuid";
import { formatApiReadyMessage } from "./utils/cli";
import { UserInfo, UserInfoWithEmail } from "./types";
import {
  findOrCreateUser,
  getMyUserInfo,
  updateUser,
  upgradeAnonymousUser,
} from "./query/user";
import { userRouter } from "./routes/userRoutes";
import { loginRouter } from "./routes/loginRoutes";
import { assignRouter } from "./routes/assignRoutes";
import { updateContentRouter } from "./routes/updateContentRoutes";
import { shareRouter } from "./routes/shareRoutes";
import { scoreRouter } from "./routes/scoreRoutes";
import { classificationRouter } from "./routes/classificationRoutes";
import { activityEditViewRouter } from "./routes/activityEditViewRoutes";
import { exploreRouter } from "./routes/exploreRoutes";
import { remixRouter } from "./routes/remixRoutes";
import { contentListRouter } from "./routes/contentListRoutes";
import { infoRouter } from "./routes/infoRoutes";
import { copyMoveRouter } from "./routes/copyMoveRoutes";
import { testRouter } from "./test/testRoutes";
import { curateRouter } from "./routes/curateRoutes";
import { compareRouter } from "./routes/compareRoutes";
import { editorRouter } from "./routes/editorRoutes";
import { discourseRouter } from "./routes/discourseLoginRoutes";
import passportLib from "passport";
import bcrypt from "bcryptjs";
import { generateHandle } from "./utils/names";
import { codeRouter } from "./routes/code";
import { metricsRouter } from "./routes/metricsRoutes";
import { contentRouter } from "./routes/content.route";
import { initRequestLogger } from "./middleware/requestLogger";

// Type assertion to work around passport type declaration issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const passport = passportLib as any;

dotenv.config();

declare module "express-serve-static-core" {
  interface Request {
    user: UserInfoWithEmail;
  }
}

const app: Express = express();
app.use(cookieParser());

// make sure that when log out, it doesn't use old cached pages
app.use(function (req, res, next) {
  if (!req.user) {
    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.header("Expires", "-1");
    res.header("Pragma", "no-cache");
  }
  next();
});

function getEnvVar(name: string, required: true): string;
function getEnvVar(name: string, required?: boolean): string | undefined;
function getEnvVar(name: string, required = false): string | undefined {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }
  if (required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return undefined;
}

const mockSigninEmail =
  process.env.MOCK_SIGNIN_EMAIL?.trim().toLowerCase() === "true";
const awsSesArn = getEnvVar("EMAIL_SES_ARN");
const appUrl = getEnvVar("APP_URL", true).replace(/\/$/, "");

let awsSesRegion: string | undefined;
let sendingEmailAddress: string | undefined;
let client: SESClient | undefined;

if (mockSigninEmail) {
  awsSesRegion = undefined;
  sendingEmailAddress = undefined;
  client = undefined;
} else {
  awsSesRegion = getEnvVar("EMAIL_SES_REGION", true);
  sendingEmailAddress = getEnvVar("EMAIL_SES_FROM_ADDRESS", true);
  client = new SESClient({ region: awsSesRegion });
}

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

passport.use(
  new GoogleStrategy(
    {
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: `${appUrl}/api/login/google`,
      scope: ["profile", "email"],
      passReqToCallback: true,
    },
    (req, _accessToken, _refreshToken, profile, done) => {
      if (req.user?.isAnonymous) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
        profile.fromAnonymous = fromUUID((req.user as UserInfo).userId);
      }

      done(null, profile);
    },
  ),
);

passport.use(
  new MagicLinkStrategy(
    {
      secret: process.env.MAGIC_LINK_SECRET || "",
      allowReuse: true,
      userFields: ["email", "fromAnonymous"],
      tokenField: "token",
    },
    async (user, token) => {
      const confirmURL = `${appUrl}/confirmSignIn?token=${token}`;

      if (mockSigninEmail) {
        console.log(`Confirm email link: ${confirmURL}`);
        return;
      }

      let email_html: string = "";

      try {
        const filePath = path.join(__dirname, "assets", "signin_email.html");

        email_html = await fs.readFile(filePath, { encoding: "utf8" });
      } catch (err) {
        console.log(err);
        throw Error("Could not send email");
      }

      email_html = email_html.replace(/CONFIRM_LINK/g, confirmURL);

      const params = {
        Source: sendingEmailAddress,
        ...(awsSesArn ? { SourceArn: awsSesArn } : {}),
        Destination: {
          ToAddresses: [user.email],
        },
        Message: {
          Subject: {
            Data: "Finish logging into Doenet",
          },
          Body: {
            Text: {
              Data: `To finish your login into Doenet, go to the URL: ${confirmURL}`,
            },
            Html: {
              Data: email_html,
            },
          },
        },
      };

      // Send the email
      const sendEmail = async () => {
        if (!client) {
          console.error("SES client not initialized");
          return;
        }
        try {
          const command = new SendEmailCommand(params);
          await client.send(command);
          console.log("Email sent successfully");
        } catch (error) {
          console.error("Error sending email", error);
        }
      };

      sendEmail();
    },
    (user: { email: string; fromAnonymous: string }) => {
      return {
        provider: "magiclink",
        email: user.email as string,
        fromAnonymous: user.fromAnonymous,
      };
    },
  ),
);

passport.use(
  new LocalStrategy(async function (username, password, done) {
    try {
      // 1. Find the user by the unique ID/username in your database.
      const { userId, passwordHash } = await prisma.users.findUniqueOrThrow({
        where: { username: username },
        select: {
          passwordHash: true,
          userId: true,
        },
      });

      // 2. Compare the provided password with the stored, hashed password.
      const isMatch = await bcrypt.compare(
        password,
        passwordHash ?? "no password, fail",
      );

      if (!isMatch) {
        // Password mismatch
        return done(null, false, { message: "Incorrect password." });
      }

      // 3. Success! Pass the authenticated user object.
      const payload = {
        userId,
        provider: "local",
      };
      return done(null, payload);
    } catch (err) {
      // Handle server/database error
      return done(err);
    }
  }),
);

passport.use(new AnonymIdStrategy());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
passport.serializeUser(async (req: any, user: any, done: any) => {
  if (user.provider === "magiclink") {
    const email: string = user.email;
    const fromAnonymous: string = user.fromAnonymous;

    let u;

    if (fromAnonymous !== " ") {
      try {
        u = await upgradeAnonymousUser({
          userId: toUUID(fromAnonymous),
          email,
        });
      } catch (_e) {
        console.log("Error upgrading anonymous user", _e);
        /// ignore any error
      }
    }

    if (!u) {
      u = await findOrCreateUser({
        email,
        firstNames: null,
        lastNames: "",
      });
    }

    return done(undefined, fromUUID(u.userId));
  } else if (user.provider === "google") {
    let email = user.id + "@google.com";
    if (user.emails[0].verified) {
      email = user.emails[0].value;
    }
    const fromAnonymous: string = user.fromAnonymous;

    let u;

    if (fromAnonymous) {
      try {
        u = await upgradeAnonymousUser({
          userId: toUUID(fromAnonymous),
          email,
        });

        // Use name from google account
        await updateUser({
          loggedInUserId: u.userId,
          firstNames: user.name.givenName,
          lastNames: user.name.familyName,
        });
      } catch (_e) {
        console.log("Error upgrading anonymous user", _e);
        /// ignore any error
      }
    }

    if (!u) {
      u = await findOrCreateUser({
        email,
        firstNames: user.name.givenName,
        lastNames: user.name.familyName,
      });
    }

    return done(undefined, fromUUID(u.userId));
    // TODO: upgrade from anonymous user?
  } else if (user.provider === "local") {
    const pause1000 = function () {
      return new Promise((resolve, _reject) => {
        setTimeout(resolve, 1000);
      });
    };
    await pause1000();

    return done(undefined, fromUUID(user.userId));
  } else if (user.anonymous) {
    let email = nanoid() + "@anonymous.doenet.org";

    let firstNames = "";
    let lastNames = generateHandle({});
    let isAnonymous = true;
    let isEditor = false;
    let isAuthor = false;

    if (
      process.env.ENABLE_TEST_AUTH_BYPASS &&
      process.env.ENABLE_TEST_AUTH_BYPASS.toLocaleLowerCase() !== "false"
    ) {
      if (req.body.email && !req.body.isAnonymous) {
        email = req.body.email;
        if (req.body.firstNames) {
          firstNames = req.body.firstNames;
        }
        if (req.body.lastNames) {
          lastNames = req.body.lastNames;
        }

        isEditor = Boolean(req.body.isEditor);
        isAuthor = Boolean(req.body.isAuthor);
        isAnonymous = false;
      }
    }

    const u = await findOrCreateUser({
      email,
      lastNames,
      firstNames,
      isAnonymous,
      isEditor,
      isAuthor,
    });
    return done(undefined, fromUUID(u.userId));
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
passport.deserializeUser(async (userId: string, done: any) => {
  const { user } = await getMyUserInfo({ loggedInUserId: toUUID(userId) });
  done(null, user);
});

app.use(
  session({
    cookie: {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year, in ms
    },
    secret: process.env.SESSION_SECRET || "",
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, //ms
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  }),
);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
  }),
);

app.use(passport.initialize());
app.use(passport.session());
app.use("/api", initRequestLogger());

const port = process.env.PORT || 3000;

app.use(express.static(path.resolve(__dirname, "../public")));

app.use("/api/user", userRouter);
app.use("/api/login", loginRouter);
app.use("/api/assign", assignRouter);
app.use("/api/updateContent", updateContentRouter);
app.use("/api/share", shareRouter);
app.use("/api/score", scoreRouter);
app.use("/api/classifications", classificationRouter);
app.use("/api/activityEditView", activityEditViewRouter);
app.use("/api/explore", exploreRouter);
app.use("/api/remix", remixRouter);
app.use("/api/contentList", contentListRouter);
app.use("/api/info", infoRouter);
app.use("/api/copyMove", copyMoveRouter);
app.use("/api/curate", curateRouter);
app.use("/api/compare", compareRouter);
app.use("/api/editor", editorRouter);
app.use("/api/code", codeRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/content", contentRouter);

// Discourse uses this endpoint to sign on
app.use("/api/discourse", discourseRouter);

if (
  process.env.ENABLE_TEST_ROUTES &&
  process.env.ENABLE_TEST_ROUTES.toLocaleLowerCase() !== "false"
) {
  app.use("/api/test", testRouter);
}
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server" + JSON.stringify(req?.user));
});

// app.get(
//   "/api/auth/google",
//   passport.authenticate("google", { scope: ["profile", "email"] }),
// );

app.post(
  "/api/auth/magiclink",
  // 1) if we're already signed‑in as an anonymous user, pluck their id out of req.user
  (req, _res, next) => {
    if (req.user?.isAnonymous) {
      // req.user.userId is the string you serialized in serializeUser
      req.body.fromAnonymous = fromUUID(req.user.userId);
    } else {
      // add blank `fromAnonymous` field as magic link is configured to expect `userFields: ["email", "fromAnonymous"]`
      req.body.fromAnonymous = " ";
    }
    next();
  },
  // 2) hand off to passport‑magic‑link
  passport.authenticate("magiclink", { action: "requestToken" }),
);

// app.get(
//   "/api/loadSupportingFileInfo/:contentId",
//   (_req: Request, res: Response) => {
//     // const contentId = toUUID(req.params.contentId);
//     res.send({
//       success: true,
//       supportingFiles: [],
//       canUpload: true,
//       userQuotaBytesAvailable: 1000000,
//       quotaBytes: 9000000,
//     });
//   },
// );

app.listen(port, () => {
  const localUrl = `http://localhost:${port}`;
  console.log(formatApiReadyMessage(localUrl));
});
