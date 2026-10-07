// Rewrites legacy activity ids inside <ref uri="doenet:activityId=..."> (and
// the deprecated doenet:doenetId= form) so cross-activity links point at the
// migrated copies. Only <ref> tags are touched: <copy uri="doenet:..."> is
// transclusion, which fetches content through legacy-server APIs with no
// new-site equivalent — rewriting a copy's id fixes nothing, and the legacy id
// is better evidence for a future fix. Copy occurrences are counted so the
// report can size that problem.

export interface RefRewriteResult {
  source: string;
  /** legacy ids that were rewritten */
  rewritten: string[];
  /** ids with no mapping, left untouched (includes already-rewritten new ids
   * on a re-run — they resolve to nothing and stay put) */
  unresolved: string[];
  /** count of <copy uri="doenet:...=..."> transclusions found (untouched) */
  copyRefs: number;
}

const REF_TAG = /<ref\b[^>]*>/gi;
// id parameter inside a doenet: uri attribute value
const URI_ID = /((?:activityId|doenetId)=)([a-zA-Z0-9_-]+)/gi;
const COPY_TAG =
  /<copy\b[^>]*\buri\s*=\s*['"]doenet:[^'"]*(?:activityId|doenetId|cid)=/gi;

export function rewriteActivityRefs(
  source: string,
  resolve: (legacyActivityId: string) => string | null,
): RefRewriteResult {
  const rewritten = new Set<string>();
  const unresolved = new Set<string>();

  const result = source.replace(REF_TAG, (tag) => {
    if (!/\buri\s*=\s*['"]doenet:/i.test(tag)) {
      return tag;
    }
    return tag.replace(URI_ID, (match, prefix: string, id: string) => {
      const newId = resolve(id);
      if (newId === null) {
        unresolved.add(id);
        return match;
      }
      rewritten.add(id);
      return prefix + newId;
    });
  });

  const copyRefs = [...source.matchAll(COPY_TAG)].length;

  return {
    source: result,
    rewritten: [...rewritten],
    unresolved: [...unresolved],
    copyRefs,
  };
}
