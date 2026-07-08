// `media` — direct-to-S3 image uploads.
//
//   config       — env validation (`loadMediaConfig`)
//   imageContent — DB layer (the only file here that touches prisma)
//   s3           — storage adapter (presign / head / delete)
//   upload       — POST /api/media/image/init and /complete
//   router       — wires the handlers above
//
// Reads go through CloudFront directly; there is no serve endpoint here.
// Import from here, not from a source file.

export { loadMediaConfig } from "./config";
export { mediaRouter } from "./router";
