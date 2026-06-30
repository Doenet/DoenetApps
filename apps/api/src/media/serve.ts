import type { Request, Response } from "express";
import { NoSuchKey } from "@aws-sdk/client-s3";
import type { Visibility } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { handleErrors } from "../errors/routeErrorHandler";
import { findViewableImage } from "./imageContent";
import { getImageStream } from "./s3";
import { serveImageParamSchema } from "./serve.schema";

// Unlisted/private must stay out of shared caches; max-age kept short so a
// flip to private propagates within a few minutes.
function cacheControlFor(visibility: Visibility): string {
  if (visibility === "public") {
    return "public, max-age=3600";
  }
  return "private, max-age=300";
}

export async function handleServeImage(req: Request, res: Response) {
  try {
    const { contentId } = serveImageParamSchema.parse(req.params);
    const image = await findViewableImage({
      contentId,
      loggedInUserId: req.user?.userId,
    });

    if (!image) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Not found" });
      return;
    }

    let body, contentType, contentLength;
    try {
      ({ body, contentType, contentLength } = await getImageStream(
        image.storageKey,
      ));
    } catch (err) {
      // The row claims the object is ready, but storage disagrees. Surface
      // this as 404 (matches what the client sees for a missing image) rather
      // than 500.
      if (err instanceof NoSuchKey) {
        res.status(StatusCodes.NOT_FOUND).json({ error: "Not found" });
        return;
      }
      throw err;
    }

    res.setHeader("Content-Type", contentType ?? image.mimeType);
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    } else if (image.sizeBytes) {
      res.setHeader("Content-Length", image.sizeBytes.toString());
    }
    res.setHeader("Cache-Control", cacheControlFor(image.visibility));

    body.on("error", (err) => {
      console.error("Media stream error", err);
      if (!res.headersSent) {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: "Stream error" });
      } else {
        res.destroy(err);
      }
    });
    body.pipe(res);
  } catch (e) {
    handleErrors(res, e);
  }
}
