import { PassThrough } from "stream";
import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Replace the s3 module so importing serve.ts does not trigger loadMediaConfig
// at module load time (it would demand real env vars). Tests drive the mock
// directly via the imported module reference below.
vi.mock("./s3", () => ({
  getImageStream: vi.fn(),
  putImage: vi.fn(),
  deleteImage: vi.fn(),
}));

import { prisma } from "../model";
import { fromUUID } from "../utils/uuid";
import { createTestUser } from "../test/utils";
import { createImageContent, setImageStorageKey } from "./imageContent";
import * as s3 from "./s3";
import { handleServeImage } from "./serve";

type MockRes = PassThrough & {
  statusCode: number;
  headers: Record<string, string | number>;
  jsonBody: unknown;
  headersSent: boolean;
  status: (code: number) => MockRes;
  json: (body: unknown) => MockRes;
  setHeader: (name: string, value: string | number) => MockRes;
};

function mockRes(): MockRes {
  const res = new PassThrough() as MockRes;
  res.statusCode = 200;
  res.headers = {};
  res.jsonBody = undefined;
  res.headersSent = false;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.jsonBody = body;
    return res;
  };
  res.setHeader = (name, value) => {
    res.headers[name] = value;
    return res;
  };
  return res;
}

function mockReq({
  contentId,
  userId,
}: {
  contentId: Uint8Array;
  userId?: Uint8Array;
}) {
  return {
    params: { contentId: fromUUID(contentId) },
    user: userId ? { userId } : undefined,
  } as unknown as Request;
}

async function call(req: Request, res: MockRes) {
  await handleServeImage(req, res as unknown as Response);
  // Drain the piped body so 'finish' fires deterministically.
  await new Promise<void>((resolve) => {
    if (res.writableEnded) resolve();
    else res.on("finish", () => resolve());
    // For 404 paths the response is closed via .json() — no pipe attached.
    // Resolve on next tick if no data path is active.
    setImmediate(() => resolve());
  });
}

function mockBody(bytes: Buffer = Buffer.from([1, 2, 3])) {
  const body = new PassThrough();
  setImmediate(() => body.end(bytes));
  return body;
}

async function makeImage(
  ownerId: Uint8Array,
  opts: { withStorageKey?: boolean } = {},
) {
  const withStorageKey = opts.withStorageKey ?? true;
  const { contentId } = await createImageContent({
    loggedInUserId: ownerId,
    parentId: null,
    name: "img.png",
    mimeType: "image/png",
    sizeBytes: 7,
    imageWidth: 4,
    imageHeight: 4,
  });
  if (withStorageKey) {
    await setImageStorageKey({
      contentId,
      ownerId,
      storageKey: `images/${fromUUID(contentId)}.png`,
    });
  }
  return contentId;
}

describe("handleServeImage", () => {
  beforeEach(() => {
    vi.mocked(s3.getImageStream).mockReset();
  });
  afterEach(() => {
    vi.mocked(s3.getImageStream).mockReset();
  });

  test("owner can fetch their own private image", async () => {
    const owner = await createTestUser();
    const contentId = await makeImage(owner.userId);
    vi.mocked(s3.getImageStream).mockResolvedValue({
      body: mockBody(),
      contentType: "image/png",
      contentLength: 7,
    });

    const res = mockRes();
    await call(mockReq({ contentId, userId: owner.userId }), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toBe("image/png");
    expect(res.headers["Content-Length"]).toBe(7);
    expect(res.headers["Cache-Control"]).toBe("private, max-age=300");
  });

  test("falls back to sizeBytes for Content-Length when stream lacks it", async () => {
    const owner = await createTestUser();
    const contentId = await makeImage(owner.userId);
    vi.mocked(s3.getImageStream).mockResolvedValue({
      body: mockBody(),
      contentType: "image/png",
    });

    const res = mockRes();
    await call(mockReq({ contentId, userId: owner.userId }), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Length"]).toBe("7");
  });

  test("stranger gets 404 on a private image", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const contentId = await makeImage(owner.userId);

    const res = mockRes();
    await call(mockReq({ contentId, userId: stranger.userId }), res);

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND);
    expect(res.jsonBody).toEqual({ error: "Not found" });
    expect(vi.mocked(s3.getImageStream)).not.toHaveBeenCalled();
  });

  test("anonymous request gets 404 on a private image", async () => {
    const owner = await createTestUser();
    const contentId = await makeImage(owner.userId);

    const res = mockRes();
    await call(mockReq({ contentId }), res);

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND);
    expect(vi.mocked(s3.getImageStream)).not.toHaveBeenCalled();
  });

  test("anonymous request can fetch a public image", async () => {
    const owner = await createTestUser();
    const contentId = await makeImage(owner.userId);
    await prisma.content.update({
      where: { id: contentId },
      data: { visibility: "public", isPublic: true },
    });
    vi.mocked(s3.getImageStream).mockResolvedValue({
      body: mockBody(),
      contentType: "image/png",
      contentLength: 7,
    });

    const res = mockRes();
    await call(mockReq({ contentId }), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["Cache-Control"]).toBe("public, max-age=3600");
  });

  test("anonymous request can fetch an unlisted image", async () => {
    const owner = await createTestUser();
    const contentId = await makeImage(owner.userId);
    await prisma.content.update({
      where: { id: contentId },
      data: { visibility: "unlisted" },
    });
    vi.mocked(s3.getImageStream).mockResolvedValue({
      body: mockBody(),
      contentType: "image/png",
      contentLength: 7,
    });

    const res = mockRes();
    await call(mockReq({ contentId }), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["Cache-Control"]).toBe("private, max-age=300");
  });

  test("shared-with user can fetch a private image", async () => {
    const owner = await createTestUser();
    const friend = await createTestUser();
    const contentId = await makeImage(owner.userId);
    await prisma.contentShares.create({
      data: { contentId, userId: friend.userId },
    });
    vi.mocked(s3.getImageStream).mockResolvedValue({
      body: mockBody(),
      contentType: "image/png",
      contentLength: 7,
    });

    const res = mockRes();
    await call(mockReq({ contentId, userId: friend.userId }), res);

    expect(res.statusCode).toBe(200);
  });

  test("404 when the image has no storage key yet", async () => {
    const owner = await createTestUser();
    const contentId = await makeImage(owner.userId, { withStorageKey: false });

    const res = mockRes();
    await call(mockReq({ contentId, userId: owner.userId }), res);

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND);
    expect(vi.mocked(s3.getImageStream)).not.toHaveBeenCalled();
  });

  test("404 when the content is not type=image", async () => {
    const owner = await createTestUser();
    const contentId = await makeImage(owner.userId);
    await prisma.content.update({
      where: { id: contentId },
      data: { type: "folder" },
    });

    const res = mockRes();
    await call(mockReq({ contentId, userId: owner.userId }), res);

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND);
    expect(vi.mocked(s3.getImageStream)).not.toHaveBeenCalled();
  });

  test("404 when the content has been soft-deleted", async () => {
    const owner = await createTestUser();
    const contentId = await makeImage(owner.userId);
    await prisma.content.update({
      where: { id: contentId },
      data: { isDeletedOn: new Date() },
    });

    const res = mockRes();
    await call(mockReq({ contentId, userId: owner.userId }), res);

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test("404 when the storage object is missing (NoSuchKey)", async () => {
    const owner = await createTestUser();
    const contentId = await makeImage(owner.userId);
    // Construct a NoSuchKey error the way @aws-sdk/client-s3 raises it.
    const { NoSuchKey } = await import("@aws-sdk/client-s3");
    const noSuchKey = new NoSuchKey({
      $metadata: {},
      message: "The specified key does not exist.",
    });
    vi.mocked(s3.getImageStream).mockRejectedValue(noSuchKey);

    const res = mockRes();
    await call(mockReq({ contentId, userId: owner.userId }), res);

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND);
    expect(res.jsonBody).toEqual({ error: "Not found" });
  });
});
