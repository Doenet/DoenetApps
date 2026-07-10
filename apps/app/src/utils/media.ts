// Base URL of the media CDN, injected at build time. `VITE_MEDIA_CDN_BASE_URL`
// mirrors the API's `MEDIA_CDN_BASE_URL` (the bucket/distribution root).
const mediaCdnBaseUrl = (
  import.meta.env.VITE_MEDIA_CDN_BASE_URL as string | undefined
)?.replace(/\/+$/, "");

// Passed to the DoenetML viewer/editor as the `doenetMediaUrl` flag so it can
// resolve `doenet:<short-uuid>` image sources at render time — keeping the CDN
// domain out of users' documents. Points at the images root: the embedded
// reference is a bare short-uuid, so `images/` (the API's UPLOAD_KEY_PREFIX) is
// re-supplied here rather than stored in the document.
export const doenetMediaUrl = mediaCdnBaseUrl
  ? `${mediaCdnBaseUrl}/images`
  : undefined;
