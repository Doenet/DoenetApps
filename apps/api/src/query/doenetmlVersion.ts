import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../model";
import { InvalidRequestError } from "../utils/error";

/**
 * npm registry endpoint returning just the dist-tags of a package, e.g.
 * `{ "latest": "0.7.21", "dev": "0.7.21-dev.343" }`.
 */
const STANDALONE_DIST_TAGS_URL =
  "https://registry.npmjs.org/-/package/@doenet/standalone/dist-tags";

/**
 * Pin the `doenetmlVersions` row that tracks the npm dist-tag `tag` to a
 * concrete version, so the jsDelivr bundle URL becomes immutable and
 * browser-cacheable instead of a moving tag.
 *
 * If `version` is omitted, the current version for `tag` is read from the npm
 * registry (used for a manual reconcile; the publish workflow always passes the
 * exact version it just published, avoiding npm dist-tag propagation lag).
 *
 * Idempotent: only writes when the version actually changes.
 */
export async function updateTrackedDoenetmlVersion({
  tag,
  version,
}: {
  tag: string;
  version?: string;
}) {
  let resolvedVersion = version;
  if (resolvedVersion === undefined) {
    const { data } = await axios.get<Record<string, string>>(
      STANDALONE_DIST_TAGS_URL,
    );
    resolvedVersion = data[tag];
    if (typeof resolvedVersion !== "string" || resolvedVersion.length === 0) {
      throw new InvalidRequestError(
        `npm has no @doenet/standalone version for dist-tag "${tag}"`,
      );
    }
  }

  const existing = await prisma.doenetmlVersions.findUnique({
    where: { trackingNpmTag: tag },
  });
  if (existing === null) {
    throw new InvalidRequestError(
      `No doenetmlVersions row tracks npm dist-tag "${tag}"`,
      StatusCodes.NOT_FOUND,
    );
  }

  const previousVersion = existing.fullVersion;
  const changed = previousVersion !== resolvedVersion;
  if (changed) {
    await prisma.doenetmlVersions.update({
      where: { trackingNpmTag: tag },
      data: { fullVersion: resolvedVersion },
    });
    console.log(
      `Pinned DoenetML tag "${tag}" (${existing.displayedVersion}): ${previousVersion} -> ${resolvedVersion}`,
    );
  }

  return { tag, previousVersion, version: resolvedVersion, changed };
}
