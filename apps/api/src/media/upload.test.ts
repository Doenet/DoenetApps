import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Replace the s3 module so importing upload.ts does not trigger
// loadMediaConfig() at module load time (it would demand real env vars).
vi.mock("./s3", () => ({
  getImageStream: vi.fn(),
  putImage: vi.fn(),
  deleteImage: vi.fn(),
}));
// Mock image-size so dimension-handling branches are deterministic.
vi.mock("image-size", () => ({ imageSize: vi.fn() }));

import { imageSize } from "image-size";
// `imageSize` has a sync overload `(input) => ISizeCalculationResult` and a
// callback overload that returns `void`. vi.mocked resolves to the callback
// overload, which makes mockReturnValue think it takes `void`. Pin the sync
// overload here so test mocks line up with the call site in upload.ts.
type SyncImageSize = (input: Uint8Array) => {
  width?: number;
  height?: number;
  type?: string;
};
const mockedImageSize = imageSize as unknown as SyncImageSize;
import { prisma } from "../model";
import { createTestUser } from "../test/utils";
import { toUUID } from "../utils/uuid";

// Test users default to canUploadImages=false (matches real users). Use this
// helper everywhere we want to test the happy path; bypass it to test the gate.
async function createUploader() {
  const user = await createTestUser();
  await prisma.users.update({
    where: { userId: user.userId },
    data: { canUploadImages: true },
  });
  return user;
}
import * as s3 from "./s3";
import { handleUploadImage } from "./upload";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  uploadImageBodySchema,
} from "./upload.schema";

function mockReq({
  user,
  file,
  body,
}: {
  user?: { userId: Uint8Array };
  file?: Partial<Express.Multer.File>;
  body?: Record<string, unknown>;
}): Request {
  return {
    user,
    file,
    body: body ?? {},
  } as unknown as Request;
}

function mockRes() {
  const res = {
    statusCode: 200,
    jsonBody: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.jsonBody = body;
      return this;
    },
  };
  return res;
}

function fileFor(buffer: Buffer): Partial<Express.Multer.File> {
  return {
    buffer,
    size: buffer.byteLength,
    mimetype: "image/png",
    originalname: "donut.png",
  };
}

const FAKE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe("uploadImageBodySchema", () => {
  test("accepts an empty parentId as null (upload to root)", () => {
    const parsed = uploadImageBodySchema.parse({ parentId: "" });
    expect(parsed.parentId).toBeNull();
  });

  test("accepts a missing parentId as null", () => {
    const parsed = uploadImageBodySchema.parse({});
    expect(parsed.parentId).toBeNull();
  });

  test("rejects a malformed parentId string", () => {
    expect(() =>
      uploadImageBodySchema.parse({ parentId: "not-a-uuid" }),
    ).toThrow();
  });

  test("accepts an optional name", () => {
    const parsed = uploadImageBodySchema.parse({ name: "donut" });
    expect(parsed.name).toBe("donut");
  });
});

describe("upload constants", () => {
  test("MIME list matches RFC scope", () => {
    expect([...ALLOWED_IMAGE_MIME_TYPES]).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
  });

  test("size and dimension caps match RFC", () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_IMAGE_DIMENSION).toBe(2560);
  });
});

describe("handleUploadImage", () => {
  beforeEach(() => {
    vi.mocked(s3.putImage).mockReset();
    vi.mocked(s3.deleteImage).mockReset();
    vi.mocked(mockedImageSize).mockReset();
    vi.mocked(mockedImageSize).mockReturnValue({
      width: 100,
      height: 80,
      type: "png",
    });
  });
  afterEach(() => {
    vi.mocked(s3.putImage).mockReset();
    vi.mocked(s3.deleteImage).mockReset();
    vi.mocked(mockedImageSize).mockReset();
  });

  test("403 when no user is on the request", async () => {
    const res = mockRes();
    await handleUploadImage(
      mockReq({ file: fileFor(FAKE_PNG) }),
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(StatusCodes.FORBIDDEN);
    expect(vi.mocked(s3.putImage)).not.toHaveBeenCalled();
  });

  test("403 when the user is not in the image-upload early-access cohort", async () => {
    const user = await createTestUser();
    const res = mockRes();
    await handleUploadImage(
      mockReq({
        user: { userId: user.userId },
        file: fileFor(FAKE_PNG),
      }),
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(StatusCodes.FORBIDDEN);
    expect((res.jsonBody as { code?: string }).code).toBe(
      "IMAGE_UPLOAD_NOT_ENABLED",
    );
    expect(vi.mocked(s3.putImage)).not.toHaveBeenCalled();
    const orphans = await prisma.content.count({
      where: { ownerId: user.userId, type: "image" },
    });
    expect(orphans).toBe(0);
  });

  test("415 when no file is on the request", async () => {
    const user = await createUploader();
    const res = mockRes();
    await handleUploadImage(
      mockReq({ user: { userId: user.userId } }),
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(StatusCodes.UNSUPPORTED_MEDIA_TYPE);
    expect(vi.mocked(s3.putImage)).not.toHaveBeenCalled();
  });

  test("415 when image-size cannot read dimensions", async () => {
    const user = await createUploader();
    vi.mocked(mockedImageSize).mockReturnValue({ type: "png" });

    const res = mockRes();
    await handleUploadImage(
      mockReq({
        user: { userId: user.userId },
        file: fileFor(FAKE_PNG),
      }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBe(StatusCodes.UNSUPPORTED_MEDIA_TYPE);
    expect(vi.mocked(s3.putImage)).not.toHaveBeenCalled();
    const orphans = await prisma.content.count({
      where: { ownerId: user.userId, type: "image" },
    });
    expect(orphans).toBe(0);
  });

  test("415 when client-claimed MIME does not match detected format", async () => {
    const user = await createUploader();
    // Client says PNG, but the bytes (per image-size) are actually JPEG.
    vi.mocked(mockedImageSize).mockReturnValue({
      width: 100,
      height: 80,
      type: "jpg",
    });

    const res = mockRes();
    await handleUploadImage(
      mockReq({
        user: { userId: user.userId },
        file: fileFor(FAKE_PNG),
      }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBe(StatusCodes.UNSUPPORTED_MEDIA_TYPE);
    expect(vi.mocked(s3.putImage)).not.toHaveBeenCalled();
    const orphans = await prisma.content.count({
      where: { ownerId: user.userId, type: "image" },
    });
    expect(orphans).toBe(0);
  });

  test("415 when detected format is not in the allowlist", async () => {
    const user = await createUploader();
    vi.mocked(mockedImageSize).mockReturnValue({
      width: 100,
      height: 80,
      type: "bmp",
    });

    const res = mockRes();
    await handleUploadImage(
      mockReq({
        user: { userId: user.userId },
        file: fileFor(FAKE_PNG),
      }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBe(StatusCodes.UNSUPPORTED_MEDIA_TYPE);
    expect(vi.mocked(s3.putImage)).not.toHaveBeenCalled();
  });

  test("422 when image dimensions exceed the cap", async () => {
    const user = await createUploader();
    vi.mocked(mockedImageSize).mockReturnValue({
      width: MAX_IMAGE_DIMENSION + 1,
      height: 100,
      type: "png",
    });

    const res = mockRes();
    await handleUploadImage(
      mockReq({
        user: { userId: user.userId },
        file: fileFor(FAKE_PNG),
      }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
    expect(vi.mocked(s3.putImage)).not.toHaveBeenCalled();
    const orphans = await prisma.content.count({
      where: { ownerId: user.userId, type: "image" },
    });
    expect(orphans).toBe(0);
  });

  test("happy path: creates row, uploads to storage, patches storage key, returns 201", async () => {
    const user = await createUploader();
    vi.mocked(s3.putImage).mockResolvedValue(undefined);

    const res = mockRes();
    await handleUploadImage(
      mockReq({
        user: { userId: user.userId },
        file: fileFor(FAKE_PNG),
      }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBe(StatusCodes.CREATED);
    const body = res.jsonBody as { contentId: string; name: string };
    expect(body.name).toBe("donut.png");
    expect(body.contentId).toMatch(/^[0-9A-Za-z_-]{22}$/);

    expect(vi.mocked(s3.putImage)).toHaveBeenCalledTimes(1);
    const putArgs = vi.mocked(s3.putImage).mock.calls[0][0];
    expect(putArgs.contentType).toBe("image/png");
    expect(putArgs.body).toBe(FAKE_PNG);
    expect(putArgs.key).toBe(`images/${body.contentId}.png`);

    const row = await prisma.content.findUniqueOrThrow({
      where: { id: toUUID(body.contentId) },
      select: {
        type: true,
        mimeType: true,
        storageKey: true,
        imageWidth: true,
        imageHeight: true,
        sizeBytes: true,
        ownerId: true,
      },
    });
    expect(row.type).toBe("image");
    expect(row.mimeType).toBe("image/png");
    expect(row.storageKey).toBe(`images/${body.contentId}.png`);
    expect(row.imageWidth).toBe(100);
    expect(row.imageHeight).toBe(80);
    expect(row.sizeBytes).toBe(BigInt(FAKE_PNG.byteLength));
    expect(row.ownerId).toEqual(user.userId);
  });

  test("uses a request-supplied name when present", async () => {
    const user = await createUploader();
    vi.mocked(s3.putImage).mockResolvedValue(undefined);

    const res = mockRes();
    await handleUploadImage(
      mockReq({
        user: { userId: user.userId },
        file: fileFor(FAKE_PNG),
        body: { name: "Lemon" },
      }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBe(StatusCodes.CREATED);
    expect((res.jsonBody as { name: string }).name).toBe("Lemon");
  });

  test("rolls back the DB row and best-effort deletes S3 when putImage throws", async () => {
    const user = await createUploader();
    vi.mocked(s3.putImage).mockRejectedValue(new Error("S3 down"));

    const res = mockRes();
    await handleUploadImage(
      mockReq({
        user: { userId: user.userId },
        file: fileFor(FAKE_PNG),
      }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    const orphans = await prisma.content.count({
      where: { ownerId: user.userId, type: "image" },
    });
    expect(orphans).toBe(0);
    expect(vi.mocked(s3.deleteImage)).toHaveBeenCalledTimes(1);
  });
});
