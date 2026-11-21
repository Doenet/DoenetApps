import { z } from "zod";

/**
 * A concrete published `@doenet/standalone` version: `major.minor.patch` with an
 * optional SemVer prerelease suffix (e.g. `0.7.21`, `0.7.21-dev.343`). We accept
 * the full SemVer prerelease grammar rather than a single fixed dev scheme,
 * because DoenetML's dev version format has varied (`-dev.<run>` vs
 * `-dev.<timestamp>.<hash>`). SemVer identifiers are limited to `[0-9A-Za-z-]`,
 * so the value stays safe to interpolate into the jsDelivr bundle URL
 * (`.../@doenet/standalone@<version>/...`) — no slashes, spaces, or extra path
 * segments can slip through.
 */
export const doenetmlFullVersionSchema = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
    "Invalid DoenetML version",
  );

/**
 * Body for POST /api/info/updateTrackedDoenetmlVersion. `tag` selects the row
 * to pin (by its `trackingNpmTag`); `version` is the concrete version to pin to.
 * When `version` is omitted, the endpoint resolves it from the npm registry.
 */
export const updateTrackedDoenetmlVersionSchema = z.object({
  tag: z.enum(["latest", "dev"]),
  version: doenetmlFullVersionSchema.optional(),
});
