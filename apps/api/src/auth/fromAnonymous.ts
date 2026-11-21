import { toUUID } from "../utils/uuid";

/**
 * Read the `fromAnonymous` field carried through a magic-link or Google login.
 *
 * It holds the short-form id of the anonymous account the person was browsing
 * under, or a placeholder when there was none: the magic-link flow sends `" "`
 * because passport-magic-link requires the field to be present.
 *
 * Returns `undefined` when there is no anonymous account to upgrade, including
 * when the value is unparsable — a malformed id must not fail the login.
 */
export function parseFromAnonymous(
  fromAnonymous: string | undefined,
): Uint8Array | undefined {
  if (!fromAnonymous || fromAnonymous.trim() === "") {
    return undefined;
  }

  try {
    return toUUID(fromAnonymous);
  } catch (e) {
    console.warn("Ignoring unparsable fromAnonymous value", e);
    return undefined;
  }
}
