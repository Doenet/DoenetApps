# media

Image uploads and serving. Images are **direct-to-S3**: the API never touches
the image bytes. It signs uploads and records rows; the bytes flow straight
between the browser, S3, and CloudFront.

## Upload (two steps)

```
API (this package)              browser                          S3
│                                  │                              │
│◀─── POST /api/media/image/init ──│                              │
│── { uploadKey, uploadUrl } ─────▶│                              │
│                                  │                              │
│                                  │──────── PUT bytes ──────────▶│
│                                  │                              │
│◀─ POST /api/media/image/complete │                              │
│╌╌╌╌╌╌╌╌ HEAD object ╌╌╌╌╌╌╌╌╌╌╌╌╌┼╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌▶│
│◀╌╌╌╌╌╌╌╌╌ type + size ╌╌╌╌╌╌╌╌╌╌╌┼╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌│
│─ { contentId, imageSource } ────▶│                              │
```

1. **`/init`** (`upload.ts`) — checks the user is logged in and in the
   image-upload cohort (`canUserUploadImages`), mints a fresh
   `images/<short-uuid>` key (no extension), and returns a short-lived presigned
   `PUT` URL.
   The URL signs `Content-Type` and `Content-Length`, so S3 itself rejects a
   mismatched or oversized upload. No DB row yet.
2. Browser **`PUT`s the bytes directly to S3** using that URL.
3. **`/complete`** — re-checks auth, validates the key shape, `HEAD`s the
   object to confirm it exists and matches the declared type/size, then writes
   the content row (`imageContent.ts`) with the key as `storageKey`. Failures
   past the S3 write delete the orphaned object.

Because the server never sees the bytes, it does **not** validate image
contents or dimensions. `svg` is intentionally excluded from allowed types.

## Serving

There is **no serve endpoint**. `contentStructure.ts` exposes the row's
`storageKey` to the client as a minimal, domain-independent `imageSource =
doenet:<short-uuid>` — the `images/` storage prefix is stripped, so only the
short-uuid is embedded. Neither the CDN domain nor the storage layout is stored:
the DoenetML viewer resolves `doenet:<short-uuid>` against its `doenetMediaUrl`
flag at render time — `${doenetMediaUrl}/<short-uuid>` — where `doenetMediaUrl`
is `MEDIA_CDN_BASE_URL` plus the `images/` root (see
`apps/app/src/utils/media.ts`). So a document only ever holds `doenet:<short-uuid>`.

Reads then go through CloudFront directly. The bucket is private; CloudFront
reaches it via Origin Access Control, and a `ResponseHeadersPolicy`
(`infra/cloudformation/cdn.yml`) adds `nosniff` / `Content-Disposition` / CSP.

## Conventions

- Images are always created **`unlisted`** — link-reachable, never surfaced in
  search/explore — regardless of parent visibility.
- Images may not live inside problem sets (`sequence` parents).
- **Objects are never deleted.** Content is remixed and remixes share a
  `storageKey`, so deleting on one owner's delete would break another's remix.
  Reclaiming orphaned objects needs remix-aware reference counting that doesn't
  exist yet; accumulating unreferenced objects is the current deliberate
  tradeoff.

## Files

`config` env validation · `s3` presign/head/delete adapter · `imageContent`
the only prisma-touching file · `upload` the two handlers · `router` wiring.
Import from `index.ts`, not individual files.
