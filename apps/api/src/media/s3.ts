import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";
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

export async function putImage({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getImageStream(key: string): Promise<{
  body: Readable;
  contentType?: string;
  contentLength?: number;
}> {
  const response = await client.send(
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
  );
  if (!response.Body) {
    throw new Error(`Empty body for ${key}`);
  }
  return {
    body: response.Body as Readable,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}

export async function deleteImage(key: string) {
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}
