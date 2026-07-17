// Rewrites legacy image references in DoenetML source.
//
// Legacy form:   <image source='doenet:cid=<cid>' ... />
// New-site form: <image source="doenet:<short-uuid>" imageName="..."
//                       authorName="..." licenseCodes="CC-BY" />
// where <short-uuid> is the S3 storage key minus its "images/" prefix; the
// viewer resolves it against `doenetImagesUrl` (supported by DoenetML >= 0.7
// and by the 0.6 line since @doenet/standalone 0.6.15). The attribution
// attributes mirror the migrated image's imageContent row so the rendered
// credit matches the stored license.

export interface ImageResolution {
  /** the new embedded reference, e.g. "doenet:6J2fuCmNnXjpn1yJRHr416" */
  ref: string;
  imageName: string | null;
  authorName: string | null;
  licenseCodes: string | null;
}

export interface RewriteResult {
  source: string;
  /** cids that were rewritten, in order of first appearance */
  rewritten: string[];
  /** cids that had no replacement available and were left untouched */
  unresolved: string[];
}

const IMAGE_TAG = /<image\b[^>]*\/?>/gi;
const CID_REF = /doenet:cid=([a-z0-9]+)/gi;

/** Escape a value for use inside a double-quoted XML attribute. */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/[\r\n\t]+/g, " ");
}

/**
 * Replace every `doenet:cid=<cid>` occurrence using `resolve` (cid -> new
 * reference + attribution, or null to leave that reference unchanged).
 * `<image>` tags additionally gain imageName/authorName/licenseCodes
 * attributes (existing attributes of the same name are never clobbered);
 * references in other positions get the plain source rewrite.
 */
export function rewriteImageSources(
  source: string,
  resolve: (cid: string) => ImageResolution | null,
): RewriteResult {
  const rewritten = new Set<string>();
  const unresolved = new Set<string>();

  // Pass 1: <image> tags — rewrite the reference and add attribution.
  let result = source.replace(IMAGE_TAG, (tag) => {
    const match = tag.match(/doenet:cid=([a-z0-9]+)/i);
    if (!match) {
      return tag;
    }
    const cid = match[1].toLowerCase();
    const resolution = resolve(cid);
    if (resolution === null) {
      unresolved.add(cid);
      return tag;
    }
    rewritten.add(cid);
    let newTag = tag.replace(/doenet:cid=[a-z0-9]+/i, resolution.ref);

    const additions: string[] = [];
    const attrs: [string, string | null][] = [
      ["imageName", resolution.imageName],
      ["authorName", resolution.authorName],
      ["licenseCodes", resolution.licenseCodes],
    ];
    for (const [attr, value] of attrs) {
      if (!value) continue;
      if (new RegExp(`\\b${attr}\\s*=`, "i").test(newTag)) continue;
      additions.push(`${attr}="${escapeAttr(value)}"`);
    }
    if (additions.length > 0) {
      newTag = newTag.replace(
        /\s*(\/?)>$/,
        (_end, slash: string) => ` ${additions.join(" ")}${slash ? " /" : ""}>`,
      );
    }
    return newTag;
  });

  // Pass 2: references outside <image> tags keep the plain rewrite.
  result = result.replace(CID_REF, (match, rawCid) => {
    const cid = (rawCid as string).toLowerCase();
    const resolution = resolve(cid);
    if (resolution === null) {
      unresolved.add(cid);
      return match;
    }
    rewritten.add(cid);
    return resolution.ref;
  });

  return {
    source: result,
    rewritten: [...rewritten],
    unresolved: [...unresolved],
  };
}
