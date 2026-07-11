import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loadMediaConfig } from "./config";

const config = loadMediaConfig();
const client =
  config.mode === "aws"
    ? new S3Client({ region: config.region })
    : new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });

// Mint a presigned PUT URL scoped to a specific key + content-type + size.
// The client uploads directly to S3 using this URL; the server never sees the
// bytes. Signing Content-Type + Content-Length means S3 rejects a mismatched
// or oversized upload without any check on our side.
export async function presignPut({
  key,
  contentType,
  contentLength,
  expiresIn,
}: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(client, command, {
    expiresIn,
    signableHeaders: new Set(["content-type", "content-length"]),
  });
}

export async function headImage(key: string): Promise<{
  contentType?: string;
  contentLength?: number;
}> {
  const response = await client.send(
    new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
  );
  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}

export async function deleteImage(key: string) {
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}
