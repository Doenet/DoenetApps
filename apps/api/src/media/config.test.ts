import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// loadMediaConfig caches its result at module scope, so each test must reload
// the module to get a clean slate.
async function loadFresh() {
  vi.resetModules();
  const mod = await import("./config.js");
  return mod.loadMediaConfig;
}

const ALL_VARS = [
  "MEDIA_S3_MODE",
  "MEDIA_S3_REGION",
  "MEDIA_S3_BUCKET",
  "MEDIA_S3_LOCAL_ENDPOINT",
  "MEDIA_S3_LOCAL_ACCESS_KEY_ID",
  "MEDIA_S3_LOCAL_SECRET_ACCESS_KEY",
  "MEDIA_CDN_BASE_URL",
] as const;

describe("loadMediaConfig", () => {
  beforeEach(() => {
    for (const v of ALL_VARS) vi.stubEnv(v, "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("throws when MEDIA_S3_MODE is missing", async () => {
    const loadMediaConfig = await loadFresh();
    expect(() => loadMediaConfig()).toThrow(/MEDIA_S3_MODE/);
  });

  test("throws when MEDIA_S3_MODE is an unknown value", async () => {
    vi.stubEnv("MEDIA_S3_MODE", "minio");
    const loadMediaConfig = await loadFresh();
    expect(() => loadMediaConfig()).toThrow(/MEDIA_S3_MODE/);
  });

  test("aws mode requires REGION, BUCKET, and CDN base URL", async () => {
    vi.stubEnv("MEDIA_S3_MODE", "aws");
    const loadMediaConfig = await loadFresh();
    expect(() => loadMediaConfig()).toThrow(/MEDIA_S3_REGION/);

    vi.stubEnv("MEDIA_S3_REGION", "us-east-1");
    const loadMediaConfig2 = await loadFresh();
    expect(() => loadMediaConfig2()).toThrow(/MEDIA_S3_BUCKET/);

    vi.stubEnv("MEDIA_S3_BUCKET", "doenet-media");
    const loadMediaConfig3 = await loadFresh();
    expect(() => loadMediaConfig3()).toThrow(/MEDIA_CDN_BASE_URL/);
  });

  test("aws mode returns the aws-shaped config and ignores local-only vars", async () => {
    vi.stubEnv("MEDIA_S3_MODE", "aws");
    vi.stubEnv("MEDIA_S3_REGION", "us-east-1");
    vi.stubEnv("MEDIA_S3_BUCKET", "doenet-media");
    vi.stubEnv("MEDIA_CDN_BASE_URL", "https://media.example.com");
    // Local vars set but should be ignored in aws mode.
    vi.stubEnv("MEDIA_S3_LOCAL_ENDPOINT", "http://localhost:9090");
    vi.stubEnv("MEDIA_S3_LOCAL_ACCESS_KEY_ID", "ignored");
    vi.stubEnv("MEDIA_S3_LOCAL_SECRET_ACCESS_KEY", "ignored");

    const loadMediaConfig = await loadFresh();
    expect(loadMediaConfig()).toEqual({
      mode: "aws",
      region: "us-east-1",
      bucket: "doenet-media",
      cdnBaseUrl: "https://media.example.com",
    });
  });

  test("strips trailing slashes from MEDIA_CDN_BASE_URL", async () => {
    vi.stubEnv("MEDIA_S3_MODE", "aws");
    vi.stubEnv("MEDIA_S3_REGION", "us-east-1");
    vi.stubEnv("MEDIA_S3_BUCKET", "doenet-media");
    vi.stubEnv("MEDIA_CDN_BASE_URL", "https://media.example.com///");

    const loadMediaConfig = await loadFresh();
    expect(loadMediaConfig().cdnBaseUrl).toBe("https://media.example.com");
  });

  test("local mode requires the LOCAL_* vars", async () => {
    vi.stubEnv("MEDIA_S3_MODE", "local");
    vi.stubEnv("MEDIA_S3_REGION", "us-east-1");
    vi.stubEnv("MEDIA_S3_BUCKET", "doenet-media");
    vi.stubEnv("MEDIA_CDN_BASE_URL", "http://localhost:9090/doenet-media");

    const loadMediaConfig = await loadFresh();
    expect(() => loadMediaConfig()).toThrow(/MEDIA_S3_LOCAL_ENDPOINT/);

    vi.stubEnv("MEDIA_S3_LOCAL_ENDPOINT", "http://localhost:9090");
    const loadMediaConfig2 = await loadFresh();
    expect(() => loadMediaConfig2()).toThrow(/MEDIA_S3_LOCAL_ACCESS_KEY_ID/);

    vi.stubEnv("MEDIA_S3_LOCAL_ACCESS_KEY_ID", "test");
    const loadMediaConfig3 = await loadFresh();
    expect(() => loadMediaConfig3()).toThrow(
      /MEDIA_S3_LOCAL_SECRET_ACCESS_KEY/,
    );
  });

  test("local mode returns the local-shaped config when fully configured", async () => {
    vi.stubEnv("MEDIA_S3_MODE", "local");
    vi.stubEnv("MEDIA_S3_REGION", "us-east-1");
    vi.stubEnv("MEDIA_S3_BUCKET", "doenet-media");
    vi.stubEnv("MEDIA_CDN_BASE_URL", "http://localhost:9090/doenet-media");
    vi.stubEnv("MEDIA_S3_LOCAL_ENDPOINT", "http://localhost:9090");
    vi.stubEnv("MEDIA_S3_LOCAL_ACCESS_KEY_ID", "test");
    vi.stubEnv("MEDIA_S3_LOCAL_SECRET_ACCESS_KEY", "test");

    const loadMediaConfig = await loadFresh();
    expect(loadMediaConfig()).toEqual({
      mode: "local",
      region: "us-east-1",
      bucket: "doenet-media",
      cdnBaseUrl: "http://localhost:9090/doenet-media",
      endpoint: "http://localhost:9090",
      accessKeyId: "test",
      secretAccessKey: "test",
    });
  });

  test("caches the resolved config across calls", async () => {
    vi.stubEnv("MEDIA_S3_MODE", "aws");
    vi.stubEnv("MEDIA_S3_REGION", "us-east-1");
    vi.stubEnv("MEDIA_S3_BUCKET", "doenet-media");
    vi.stubEnv("MEDIA_CDN_BASE_URL", "https://media.example.com");

    const loadMediaConfig = await loadFresh();
    const a = loadMediaConfig();
    const b = loadMediaConfig();
    expect(a).toBe(b);
  });

  test("treats a whitespace-only value as missing", async () => {
    vi.stubEnv("MEDIA_S3_MODE", "aws");
    vi.stubEnv("MEDIA_S3_REGION", "   ");
    vi.stubEnv("MEDIA_S3_BUCKET", "doenet-media");
    vi.stubEnv("MEDIA_CDN_BASE_URL", "https://media.example.com");

    const loadMediaConfig = await loadFresh();
    expect(() => loadMediaConfig()).toThrow(/MEDIA_S3_REGION/);
  });
});
