// Validated media-storage config. `loadMediaConfig` is the single source of
// truth — every consumer in `src/media/` calls it (and `src/index.ts` calls
// it at startup) so a misconfigured deployment crashes immediately rather
// than failing the first upload request.
import { getEnvVar } from "../utils/env";

export type MediaConfig =
  | { mode: "aws"; region: string; bucket: string; cdnBaseUrl: string }
  | {
      mode: "local";
      region: string;
      bucket: string;
      cdnBaseUrl: string;
      endpoint: string;
      accessKeyId: string;
      secretAccessKey: string;
    };

let cached: MediaConfig | undefined;

export function loadMediaConfig(): MediaConfig {
  if (cached) return cached;

  const mode = getEnvVar("MEDIA_S3_MODE");
  if (mode !== "local" && mode !== "aws") {
    throw new Error(
      `MEDIA_S3_MODE must be "local" or "aws" (got ${JSON.stringify(mode ?? null)})`,
    );
  }

  const region = getEnvVar("MEDIA_S3_REGION", true);
  const bucket = getEnvVar("MEDIA_S3_BUCKET", true);
  // Public base URL where clients read image bytes (CloudFront in prod;
  // path-style s3mock in dev). Trailing slash stripped so callers can compose
  // with `${cdnBaseUrl}/${storageKey}`.
  const cdnBaseUrl = getEnvVar("MEDIA_CDN_BASE_URL", true).replace(/\/+$/, "");

  if (mode === "aws") {
    cached = { mode, region, bucket, cdnBaseUrl };
    return cached;
  }

  cached = {
    mode,
    region,
    bucket,
    cdnBaseUrl,
    endpoint: getEnvVar("MEDIA_S3_LOCAL_ENDPOINT", true),
    accessKeyId: getEnvVar("MEDIA_S3_LOCAL_ACCESS_KEY_ID", true),
    secretAccessKey: getEnvVar("MEDIA_S3_LOCAL_SECRET_ACCESS_KEY", true),
  };
  return cached;
}
