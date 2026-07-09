import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { StatusCodes } from "http-status-codes";
import { handleErrors } from "../errors/routeErrorHandler";
import { InvalidRequestError } from "../utils/error";
import { fromUUID } from "../utils/uuid";
import { canUserUploadImages, createImageContent } from "./imageContent";
import { deleteImage, headImage, presignPut } from "./s3";
import { loadMediaConfig } from "./config";
import {
  completeUploadImageBodySchema,
  initUploadImageBodySchema,
  MIME_TO_EXT,
  PRESIGN_EXPIRES_SECONDS,
} from "./upload.schema";

// The random half of the upload key. Kept in sync with `parseUploadKey` — if
// the format here changes, the parser must accept both old and new.
function makeUploadKey(mimeType: keyof typeof MIME_TO_EXT): string {
  return `images/${randomUUID()}.${MIME_TO_EXT[mimeType]}`;
}

// Only accept keys we minted ourselves — a UUID under `images/` with a known
// extension. Prevents `/complete` from being tricked into recording an
// attacker-chosen key.
const UPLOAD_KEY_RE = /^images\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

function requireLoggedIn(
  req: Request,
  res: Response,
): req is Request & {
  user: NonNullable<Request["user"]>;
} {
  if (!req.user) {
    res.status(StatusCodes.FORBIDDEN).json({ error: "Must be logged in" });
    return false;
  }
  return true;
}

async function requireCanUploadImages(
  userId: Uint8Array,
  res: Response,
): Promise<boolean> {
  if (!(await canUserUploadImages(userId))) {
    res.status(StatusCodes.FORBIDDEN).json({
      error: "Image uploads are not enabled for this account",
      code: "IMAGE_UPLOAD_NOT_ENABLED",
    });
    return false;
  }
  return true;
}

// Step 1: mint a presigned PUT URL scoped to a fresh key + declared MIME +
// declared size. The client uploads directly to S3, then calls /complete with
// the key we returned here. No DB row is written yet.
export async function handleInitUpload(req: Request, res: Response) {
  try {
    if (!requireLoggedIn(req, res)) return;
    if (!(await requireCanUploadImages(req.user!.userId, res))) return;

    const body = initUploadImageBodySchema.parse(req.body);
    const uploadKey = makeUploadKey(body.mimeType);
    const uploadUrl = await presignPut({
      key: uploadKey,
      contentType: body.mimeType,
      contentLength: body.sizeBytes,
      expiresIn: PRESIGN_EXPIRES_SECONDS,
    });

    res.status(StatusCodes.OK).json({
      uploadKey,
      uploadUrl,
      expiresIn: PRESIGN_EXPIRES_SECONDS,
    });
  } catch (e) {
    handleErrors(res, e);
  }
}

// Step 2: verify the S3 object exists and matches what the client declared,
// then insert the content row. On any failure past the S3 write we clean up
// the object so the bucket doesn't accumulate orphans.
export async function handleCompleteUpload(req: Request, res: Response) {
  try {
    if (!requireLoggedIn(req, res)) return;
    if (!(await requireCanUploadImages(req.user!.userId, res))) return;

    const body = completeUploadImageBodySchema.parse(req.body);

    if (!UPLOAD_KEY_RE.test(body.uploadKey)) {
      throw new InvalidRequestError(
        "Invalid uploadKey",
        StatusCodes.BAD_REQUEST,
      );
    }
    if (!body.uploadKey.endsWith(`.${MIME_TO_EXT[body.mimeType]}`)) {
      throw new InvalidRequestError(
        "uploadKey extension does not match mimeType",
        StatusCodes.BAD_REQUEST,
      );
    }

    let head;
    try {
      head = await headImage(body.uploadKey);
    } catch {
      // Missing object, expired presign, or key never uploaded.
      throw new InvalidRequestError(
        "Uploaded object not found",
        StatusCodes.NOT_FOUND,
      );
    }
    if (head.contentType && head.contentType !== body.mimeType) {
      // Should be prevented by the presigned URL, but defense in depth.
      await deleteImage(body.uploadKey).catch(() => {});
      throw new InvalidRequestError(
        "Uploaded content-type does not match",
        StatusCodes.UNSUPPORTED_MEDIA_TYPE,
      );
    }
    if (head.contentLength !== body.sizeBytes) {
      await deleteImage(body.uploadKey).catch(() => {});
      throw new InvalidRequestError(
        "Uploaded size does not match",
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }

    const fallbackName = "Untitled Image";
    const name = body.name?.trim() || fallbackName;

    let contentId, persistedName;
    try {
      const created = await createImageContent({
        loggedInUserId: req.user!.userId,
        parentId: body.parentId,
        name,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        storageKey: body.uploadKey,
      });
      contentId = created.contentId;
      persistedName = created.name;
    } catch (dbErr) {
      // Row never landed — the S3 object is orphaned, drop it.
      await deleteImage(body.uploadKey).catch(() => {});
      throw dbErr;
    }

    const { cdnBaseUrl } = loadMediaConfig();
    const imageUrl = `${cdnBaseUrl}/${body.uploadKey}`;

    res.status(StatusCodes.CREATED).json({
      contentId: fromUUID(contentId),
      name: persistedName,
      imageUrl,
    });
  } catch (e) {
    handleErrors(res, e);
  }
}
