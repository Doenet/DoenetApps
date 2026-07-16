import express from "express";
import { queryOptionalLoggedIn } from "../middleware/queryMiddleware";
import { contentIdSchema } from "../schemas/contentSchema";
import {
  handleCompleteUpload,
  handleInitUpload,
  handleSetAttribution,
} from "./upload";
import { getImageDetails } from "./imageContent";

export const mediaRouter = express.Router();

// Two-step upload: the client asks for a presigned URL, PUTs the bytes to S3
// directly, then tells us it's done so we can record the row. Image reads
// don't touch this API — CloudFront serves them directly.
mediaRouter.post("/image/init", handleInitUpload);
mediaRouter.post("/image/complete", handleCompleteUpload);

// Edit the DoenetML `<image>` attribution/licensing on an owned image item.
mediaRouter.patch("/image/attribution", handleSetAttribution);

// Metadata for the image details page (name + attribution + resolvable source).
// The `/details` suffix makes clear this returns the row, not the image bytes —
// the bytes come straight from the CDN, never through this API.
mediaRouter.get(
  "/image/:contentId/details",
  queryOptionalLoggedIn(getImageDetails, contentIdSchema),
);
