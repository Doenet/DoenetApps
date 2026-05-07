import express from "express";
import {
  contentIdEmailSchema,
  setLicenseCodeSchema,
  contentIdUserIdSchema,
  setContentIsPublicSchema,
} from "../schemas/shareSchema";
import {
  setContentIsPublic,
  shareContentWithEmail,
  unshareContent,
} from "../query/share";
import { queryLoggedIn } from "../middleware/queryMiddleware";
import { setContentLicense } from "../query/license";

export const shareRouter = express.Router();

shareRouter.post(
  "/setContentLicense",
  queryLoggedIn(setContentLicense, setLicenseCodeSchema),
);

shareRouter.post(
  "/setContentIsPublic",
  queryLoggedIn(setContentIsPublic, setContentIsPublicSchema),
);

shareRouter.post(
  "/shareContent",
  queryLoggedIn(shareContentWithEmail, contentIdEmailSchema),
);

shareRouter.post(
  "/unshareContent",
  queryLoggedIn(unshareContent, contentIdUserIdSchema),
);
