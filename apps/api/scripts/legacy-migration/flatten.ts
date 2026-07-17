// Pure logic for interpreting a legacy `course_content.jsonDefinition`.
//
// An activity's `content` array (a bank's `pages` array) holds pageId strings
// and, for activities, nested "order" objects:
//   { type: "order", behavior: "sequence"|"shuffle"|"select",
//     numberToSelect, withReplacement, doenetId, content: [...] }
// Per the migration requirements, orders are simplified away: every page is
// kept, in document order, and the select/shuffle semantics are dropped.

export type LegacyEntry = string | LegacyOrder;

export interface LegacyOrder {
  type?: string;
  behavior?: string;
  content?: LegacyEntry[];
  pages?: LegacyEntry[];
}

export type ActivityShape = "singleDoc" | "sequence" | "empty";

/**
 * Pull the top-level entry array out of a jsonDefinition, which may arrive
 * as a JSON string or as an already-parsed object (Prisma parses MySQL JSON
 * columns). Activities use `content`; banks use `pages`. Returns null when
 * the definition is missing or malformed.
 */
export function entriesFromJsonDefinition(
  jsonDefinition: unknown,
  legacyType: "activity" | "bank",
): LegacyEntry[] | null {
  let parsed: unknown = jsonDefinition;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  const arr = legacyType === "bank" ? obj.pages : obj.content;
  if (arr === undefined || arr === null) {
    return [];
  }
  if (!Array.isArray(arr)) {
    return null;
  }
  return arr as LegacyEntry[];
}

/**
 * Flatten entries into the ordered list of pageIds, recursing through order
 * objects (which may themselves nest orders). Non-string, non-order values
 * are skipped.
 */
export function flattenEntries(entries: LegacyEntry[]): string[] {
  const pageIds: string[] = [];
  const walk = (entry: LegacyEntry) => {
    if (typeof entry === "string") {
      pageIds.push(entry);
    } else if (entry !== null && typeof entry === "object") {
      for (const child of entry.content ?? entry.pages ?? []) {
        walk(child);
      }
    }
  };
  for (const entry of entries) {
    walk(entry);
  }
  return pageIds;
}

/**
 * Classify the destination shape from the RAW entry array:
 * a single lone pageId string becomes a Document; anything with an order
 * object or multiple entries becomes a Problem Set — even if some of its
 * pages later turn out to be missing.
 */
export function classifyShape(entries: LegacyEntry[]): ActivityShape {
  if (entries.length === 0) {
    return "empty";
  }
  if (entries.length === 1 && typeof entries[0] === "string") {
    return "singleDoc";
  }
  return "sequence";
}

/**
 * The cids of uploaded media referenced by a legacy DoenetML source via
 * `doenet:cid=<cid>` URIs (cids are lowercase base32, e.g. bafkrei...).
 */
export function scanImageCids(source: string): string[] {
  const cids = new Set<string>();
  for (const match of source.matchAll(/doenet:cid=([a-z0-9]+)/gi)) {
    cids.add(match[1].toLowerCase());
  }
  return [...cids];
}
