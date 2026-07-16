// Rewrites legacy image references in DoenetML source.
//
// Legacy form:   <image source='doenet:cid=<cid>' ... />
// New-site form: <image source='doenet:<short-uuid>' ... />
// where <short-uuid> is the S3 storage key minus its "images/" prefix; the
// viewer resolves it against `doenetImagesUrl` (supported by DoenetML >= 0.7
// and by the 0.6 line since @doenet/standalone 0.6.15).

export interface RewriteResult {
  source: string;
  /** cids that were rewritten, in order of first appearance */
  rewritten: string[];
  /** cids that had no replacement available and were left untouched */
  unresolved: string[];
}

/**
 * Replace every `doenet:cid=<cid>` occurrence using `resolve` (cid -> new
 * `doenet:<id>` reference, or null to leave that reference unchanged).
 */
export function rewriteImageSources(
  source: string,
  resolve: (cid: string) => string | null,
): RewriteResult {
  const rewritten = new Set<string>();
  const unresolved = new Set<string>();

  const result = source.replace(/doenet:cid=([a-z0-9]+)/gi, (match, rawCid) => {
    const cid = (rawCid as string).toLowerCase();
    const replacement = resolve(cid);
    if (replacement === null) {
      unresolved.add(cid);
      return match;
    }
    rewritten.add(cid);
    return replacement;
  });

  return {
    source: result,
    rewritten: [...rewritten],
    unresolved: [...unresolved],
  };
}
