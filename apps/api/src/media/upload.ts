import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { handleErrors } from "../errors/routeErrorHandler";
import { InvalidRequestError } from "../utils/error";
import { fromUUID, newUUID } from "../utils/uuid";
import { uuidSchema } from "../schemas/uuid";
import {
  canUserUploadImages,
  createImageContent,
  setImageAttribution,
} from "./imageContent";
import { deleteImage, headImage, presignPut } from "./s3";
import {
  completeUploadImageBodySchema,
  imageSourceFromStorageKey,
  initUploadImageBodySchema,
  PRESIGN_EXPIRES_SECONDS,
  setImageAttributionSchema,
  UPLOAD_KEY_PREFIX,
} from "./upload.schema";

// A fresh, unguessable storage key: `images/<short-uuid>`. The random half is a
// short-uuid — the same 122 bits of entropy as a canonical UUID (the
// unguessability the CDN-serving model relies on), just base58-encoded to keep
// embedded references short. No extension: the object's stored Content-Type and
// the row's `mimeType` carry the type, and CloudFront serves `nosniff`, so
// nothing ever consults a URL suffix.
function makeUploadKey(): string {
  return `${UPLOAD_KEY_PREFIX}${fromUUID(newUUID())}`;
}

// Only accept keys we minted ourselves — `images/<short-uuid>`. The random half
// is validated through the same short-uuid schema the rest of the app uses
// (rather than a bespoke regex) so the two never drift. Prevents `/complete`
// from being tricked into recording an attacker-chosen key.
function isValidUploadKey(key: string): boolean {
  if (!key.startsWith(UPLOAD_KEY_PREFIX)) return false;
  const id = key.slice(UPLOAD_KEY_PREFIX.length);
  return uuidSchema.safeParse(id).success;
}

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
    const uploadKey = makeUploadKey();
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

    if (!isValidUploadKey(body.uploadKey)) {
      throw new InvalidRequestError(
        "Invalid uploadKey",
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
        attribution: {
          imageAuthorName: body.imageAuthorName,
          imageAuthorUrl: body.imageAuthorUrl,
          imageTitle: body.imageTitle,
          imageOriginalUrl: body.imageOriginalUrl,
          imageLicenseCodes: body.imageLicenseCodes,
          imageLicenseVersion: body.imageLicenseVersion,
        },
      });
      contentId = created.contentId;
      persistedName = created.name;
    } catch (dbErr) {
      // Row never landed — the S3 object is orphaned, drop it.
      await deleteImage(body.uploadKey).catch(() => {});
      throw dbErr;
    }

    res.status(StatusCodes.CREATED).json({
      contentId: fromUUID(contentId),
      name: persistedName,
      // Domain-independent reference; the viewer resolves it via doenetMediaUrl.
      imageSource: imageSourceFromStorageKey(body.uploadKey),
    });
  } catch (e) {
    handleErrors(res, e);
  }
}

// Set the DoenetML `<image>` attribution/licensing on an image content item the
// caller owns. Requires login (but not the upload gate — editing metadata on an
// image you already own is always allowed). The zod schema validates and
// normalizes the license codes/version; the owner check lives in the query.
export async function handleSetAttribution(req: Request, res: Response) {
  try {
    if (!requireLoggedIn(req, res)) return;

    const body = setImageAttributionSchema.parse(req.body);

    await setImageAttribution({
      contentId: body.contentId,
      ownerId: req.user!.userId,
      imageAuthorName: body.imageAuthorName,
      imageAuthorUrl: body.imageAuthorUrl,
      imageTitle: body.imageTitle,
      imageOriginalUrl: body.imageOriginalUrl,
      imageLicenseCodes: body.imageLicenseCodes,
      imageLicenseVersion: body.imageLicenseVersion,
    });

    res.status(StatusCodes.OK).json({ success: true });
  } catch (e) {
    handleErrors(res, e);
  }
}
