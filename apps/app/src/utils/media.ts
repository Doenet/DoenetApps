// Base URL of the media CDN, injected at build time. `VITE_MEDIA_CDN_BASE_URL`
// mirrors the API's `MEDIA_CDN_BASE_URL` (the bucket/distribution root).
const mediaCdnBaseUrl = (
  import.meta.env.VITE_MEDIA_CDN_BASE_URL as string | undefined
)?.replace(/\/+$/, "");

// Passed to the DoenetML viewer/editor as the `doenetImagesUrl` flag so it can
// resolve `doenet:<short-uuid>` image sources at render time — keeping the CDN
// domain out of users' documents. Points at the images root: the embedded
// reference is a bare short-uuid, so `images/` (the API's UPLOAD_KEY_PREFIX) is
// re-supplied here rather than stored in the document.
export const doenetImagesUrl = mediaCdnBaseUrl
  ? `${mediaCdnBaseUrl}/images`
  : undefined;

// The scheme used by the domain-independent image reference stored on content
// rows (`doenet:<short-uuid>`), mirroring the DoenetML viewer's resolver.
const doenetSourcePrefix = "doenet:";

/**
 * Resolves a stored `imageSource` (`doenet:<short-uuid>`) to a browsable CDN
 * URL — `${doenetImagesUrl}/<short-uuid>` — the same composition the DoenetML
 * viewer performs at render time. Returns `undefined` when the source is
 * missing (the S3 PUT hasn't completed), when the CDN base URL isn't configured
 * for this build, or when the source isn't a `doenet:` reference.
 */
export function resolveImageSource(
  imageSource: string | null | undefined,
): string | undefined {
  if (!imageSource || !doenetImagesUrl) {
    return undefined;
  }
  if (!imageSource.startsWith(doenetSourcePrefix)) {
    return undefined;
  }
  const shortUuid = imageSource.slice(doenetSourcePrefix.length);
  return `${doenetImagesUrl}/${shortUuid}`;
}
