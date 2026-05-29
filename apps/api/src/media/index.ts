// `media` — image uploads, storage, and serving.
//
//   config       — env validation (`loadMediaConfig`)
//   imageContent — DB layer (the only file here that touches prisma)
//   s3           — storage adapter
//   upload       — POST /api/media/image
//   serve        — GET /api/media/:contentId
//   router       — wires the handlers above
//
// Import from here, not from a source file.

export { loadMediaConfig } from "./config";
export { mediaRouter } from "./router";
