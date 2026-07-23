import express, { Request, Response } from "express";
import crypto from "crypto";
import { getAllCategories } from "../categories";
import {
  getAllDoenetmlVersions,
  getContentDescription,
  getDefaultDoenetmlVersion,
} from "../query/activity";
import {
  queryLoggedIn,
  queryOptionalLoggedIn,
  queryOptionalLoggedInNoArguments,
} from "../middleware/queryMiddleware";
import { contentIdSchema } from "../schemas/contentSchema";
import { getRecentContentSchema } from "../schemas/infoSchemas";
import { getAllLicenses } from "../query/license";
import { getRecentContent } from "../query/recent";
import { updateTrackedDoenetmlVersion } from "../query/doenetmlVersion";
import { updateTrackedDoenetmlVersionSchema } from "../schemas/doenetmlVersionSchemas";
import { handleErrors } from "../errors/routeErrorHandler";

export const infoRouter = express.Router();

infoRouter.get(
  "/getAllCategories",
  queryOptionalLoggedInNoArguments(getAllCategories),
);

infoRouter.get(
  "/getAllDoenetmlVersions",
  queryOptionalLoggedInNoArguments(getAllDoenetmlVersions),
);

infoRouter.get(
  "/getDefaultDoenetmlVersion",
  queryOptionalLoggedInNoArguments(getDefaultDoenetmlVersion),
);

infoRouter.get(
  "/getAllLicenses",
  queryOptionalLoggedInNoArguments(getAllLicenses),
);

infoRouter.get(
  "/getContentDescription/:contentId",
  queryOptionalLoggedIn(getContentDescription, contentIdSchema),
);

infoRouter.get(
  "/getRecentContent",
  queryLoggedIn(getRecentContent, getRecentContentSchema),
);

function timingSafeEqualStrings(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  // timingSafeEqual requires equal-length buffers; the length check itself is
  // not secret (the shared secret's length is fixed), so an early return is ok.
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Machine-to-machine endpoint (no session) used by DoenetML's publish workflow
 * to pin a tracked DoenetML version to the concrete version it just published.
 * Authenticated with a shared secret bearer token, mirroring the shared-secret
 * pattern used for Discourse SSO. Idempotent, so retries are safe.
 */
infoRouter.post(
  "/updateTrackedDoenetmlVersion",
  async (req: Request, res: Response) => {
    const secret = process.env.DOENETML_VERSION_UPDATE_SECRET;
    if (!secret) {
      console.log("DOENETML_VERSION_UPDATE_SECRET not configured");
      res.status(500).json({ error: "Update secret not configured" });
      return;
    }

    const authHeader = req.headers.authorization ?? "";
    const bearer = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!bearer || !timingSafeEqualStrings(bearer, secret)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const params = updateTrackedDoenetmlVersionSchema.parse(req.body);
      const result = await updateTrackedDoenetmlVersion(params);
      res.send(result);
    } catch (e) {
      handleErrors(res, e);
    }
  },
);
