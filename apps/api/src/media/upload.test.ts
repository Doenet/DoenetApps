import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Replace the s3 module so importing upload.ts does not trigger
// loadMediaConfig() at module load time (it would demand real env vars).
vi.mock("./s3", () => ({
  presignPut: vi.fn(),
  headImage: vi.fn(),
  deleteImage: vi.fn(),
}));

// Skip config validation for the tests — the presign-url composition only
// needs `cdnBaseUrl` on the complete path.
vi.mock("./config", () => ({
  loadMediaConfig: () => ({
    mode: "aws",
    region: "us-east-1",
    bucket: "test-bucket",
    cdnBaseUrl: "https://cdn.test",
  }),
}));

import { prisma } from "../model";
import { createTestUser } from "../test/utils";
import { fromUUID, toUUID } from "../utils/uuid";
import * as s3 from "./s3";
import { handleCompleteUpload, handleInitUpload } from "./upload";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  initUploadImageBodySchema,
} from "./upload.schema";

async function createUploader() {
  const user = await createTestUser();
  await prisma.users.update({
    where: { userId: user.userId },
    data: { canUploadImages: true },
  });
  return user;
}

function mockReq({
  user,
  body,
}: {
  user?: { userId: Uint8Array };
  body?: Record<string, unknown>;
}): Request {
  return { user, body: body ?? {} } as unknown as Request;
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

describe("initUploadImageBodySchema", () => {
  test("accepts a valid init body", () => {
    const parsed = initUploadImageBodySchema.parse({
      mimeType: "image/png",
      sizeBytes: 1024,
    });
    expect(parsed.mimeType).toBe("image/png");
    expect(parsed.sizeBytes).toBe(1024);
  });

  test("rejects an unknown mimeType", () => {
    expect(() =>
      initUploadImageBodySchema.parse({
        mimeType: "image/bmp",
        sizeBytes: 1024,
      }),
    ).toThrow();
  });

  test("rejects a size over the cap", () => {
    expect(() =>
      initUploadImageBodySchema.parse({
        mimeType: "image/png",
        sizeBytes: MAX_IMAGE_BYTES + 1,
      }),
    ).toThrow();
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

  test("size cap matches RFC", () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("handleInitUpload", () => {
  beforeEach(() => {
    vi.mocked(s3.presignPut).mockReset();
    vi.mocked(s3.presignPut).mockResolvedValue("https://s3/presigned");
  });
  afterEach(() => {
    vi.mocked(s3.presignPut).mockReset();
  });

  test("403 when no user is on the request", async () => {
    const res = mockRes();
    await handleInitUpload(
      mockReq({ body: { mimeType: "image/png", sizeBytes: 1 } }),
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(StatusCodes.FORBIDDEN);
    expect(vi.mocked(s3.presignPut)).not.toHaveBeenCalled();
  });

  test("403 when the user is not in the image-upload early-access cohort", async () => {
    const user = await createTestUser();
    const res = mockRes();
    await handleInitUpload(
      mockReq({
        user: { userId: user.userId },
        body: { mimeType: "image/png", sizeBytes: 1 },
      }),
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(StatusCodes.FORBIDDEN);
    expect((res.jsonBody as { code?: string }).code).toBe(
      "IMAGE_UPLOAD_NOT_ENABLED",
    );
    expect(vi.mocked(s3.presignPut)).not.toHaveBeenCalled();
  });

  test("returns a presigned URL and uploadKey with the right extension", async () => {
    const user = await createUploader();
    const res = mockRes();
    await handleInitUpload(
      mockReq({
        user: { userId: user.userId },
        body: { mimeType: "image/jpeg", sizeBytes: 2048 },
      }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBe(StatusCodes.OK);
    const body = res.jsonBody as { uploadKey: string; uploadUrl: string };
    expect(body.uploadUrl).toBe("https://s3/presigned");
    expect(body.uploadKey).toMatch(/^images\/[0-9a-f-]{36}\.jpg$/);

    const presignArgs = vi.mocked(s3.presignPut).mock.calls[0][0];
    expect(presignArgs.contentType).toBe("image/jpeg");
    expect(presignArgs.contentLength).toBe(2048);
    expect(presignArgs.key).toBe(body.uploadKey);
  });
});

describe("handleCompleteUpload", () => {
  beforeEach(() => {
    vi.mocked(s3.headImage).mockReset();
    vi.mocked(s3.deleteImage).mockReset();
    // Mirror production: deleteImage is async and returns a promise, so the
    // handler's `deleteImage(...).catch(...)` cleanup relies on a thenable.
    vi.mocked(s3.deleteImage).mockResolvedValue(undefined);
  });

  function validBody(uploadKey: string) {
    return {
      uploadKey,
      parentId: null,
      name: "donut",
      mimeType: "image/png",
      sizeBytes: 42,
    };
  }

  const validKey = "images/00000000-0000-0000-0000-000000000000.png";

  test("400 when uploadKey has a bad shape", async () => {
    const user = await createUploader();
    const res = mockRes();
    await handleCompleteUpload(
      mockReq({
        user: { userId: user.userId },
        body: { ...validBody("../evil"), uploadKey: "../evil" },
      }),
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(vi.mocked(s3.headImage)).not.toHaveBeenCalled();
  });

  test("400 when uploadKey extension does not match mimeType", async () => {
    const user = await createUploader();
    const res = mockRes();
    await handleCompleteUpload(
      mockReq({
        user: { userId: user.userId },
        body: {
          ...validBody(validKey),
          mimeType: "image/jpeg",
        },
      }),
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(vi.mocked(s3.headImage)).not.toHaveBeenCalled();
  });

  test("404 when the object is not present at the uploadKey", async () => {
    const user = await createUploader();
    vi.mocked(s3.headImage).mockRejectedValue(new Error("NoSuchKey"));

    const res = mockRes();
    await handleCompleteUpload(
      mockReq({
        user: { userId: user.userId },
        body: validBody(validKey),
      }),
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND);
    const orphans = await prisma.content.count({
      where: { ownerId: user.userId, type: "image" },
    });
    expect(orphans).toBe(0);
  });

  test("415 when uploaded object's content-type does not match", async () => {
    const user = await createUploader();
    vi.mocked(s3.headImage).mockResolvedValue({
      contentType: "image/jpeg",
      contentLength: 42,
    });

    const res = mockRes();
    await handleCompleteUpload(
      mockReq({
        user: { userId: user.userId },
        body: validBody(validKey),
      }),
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(StatusCodes.UNSUPPORTED_MEDIA_TYPE);
    expect(vi.mocked(s3.deleteImage)).toHaveBeenCalledWith(validKey);
  });

  test("422 when uploaded object's size does not match declared size", async () => {
    const user = await createUploader();
    vi.mocked(s3.headImage).mockResolvedValue({
      contentType: "image/png",
      contentLength: 999,
    });

    const res = mockRes();
    await handleCompleteUpload(
      mockReq({
        user: { userId: user.userId },
        body: validBody(validKey),
      }),
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
    expect(vi.mocked(s3.deleteImage)).toHaveBeenCalledWith(validKey);
  });

  test("happy path: inserts row with storageKey and returns imageUrl", async () => {
    const user = await createUploader();
    vi.mocked(s3.headImage).mockResolvedValue({
      contentType: "image/png",
      contentLength: 42,
    });

    const res = mockRes();
    await handleCompleteUpload(
      mockReq({
        user: { userId: user.userId },
        body: validBody(validKey),
      }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBe(StatusCodes.CREATED);
    const body = res.jsonBody as {
      contentId: Uint8Array;
      name: string;
      imageUrl: string;
    };
    expect(body.name).toBe("donut");
    expect(body.imageUrl).toBe(`https://cdn.test/${validKey}`);

    const contentIdBytes =
      body.contentId instanceof Uint8Array
        ? body.contentId
        : toUUID(fromUUID(body.contentId as unknown as Uint8Array));
    const row = await prisma.content.findUniqueOrThrow({
      where: { id: contentIdBytes },
      select: {
        type: true,
        mimeType: true,
        storageKey: true,
        sizeBytes: true,
        ownerId: true,
      },
    });
    expect(row.type).toBe("image");
    expect(row.mimeType).toBe("image/png");
    expect(row.storageKey).toBe(validKey);
    expect(row.sizeBytes).toBe(42n);
    expect(row.ownerId).toEqual(user.userId);
  });

  test("falls back to 'Untitled Image' when no name is supplied", async () => {
    const user = await createUploader();
    vi.mocked(s3.headImage).mockResolvedValue({
      contentType: "image/png",
      contentLength: 42,
    });

    const res = mockRes();
    await handleCompleteUpload(
      mockReq({
        user: { userId: user.userId },
        body: { ...validBody(validKey), name: undefined },
      }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBe(StatusCodes.CREATED);
    expect((res.jsonBody as { name: string }).name).toBe("Untitled Image");
  });
});
