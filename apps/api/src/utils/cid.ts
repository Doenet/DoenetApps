// @ts-expect-error - multiformats is ESM-only package
import { CID } from "multiformats";

/**
 * Validates that a string is a valid IPFS CID (Content Identifier).
 * Accepts both CIDv0 and CIDv1 formats.
 *
 * @param value - The string to validate
 * @returns true if valid CID, false otherwise
 */
export function isValidCid(value: string): boolean {
  try {
    CID.parse(value);
    return true;
  } catch {
    return false;
  }
}
