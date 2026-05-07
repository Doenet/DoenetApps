import { UserInfo } from "../types";

/**
 * Concatenate optional firstNames and required lastNames
 * to form fullName
 */
export function createNameNoTag({
  firstNames,
  lastNames,
}: {
  firstNames: string | null;
  lastNames: string;
}) {
  return (firstNames ? firstNames + " " : "") + lastNames;
}

/**
 * Concatenate optional firstNames and required lastNames
 * to form fullName. Appends `(curated)` if the user is a mask for the library
 */
export function createNameCheckCurateTag(user: UserInfo) {
  return createNameNoTag(user) + (user.isMaskForLibrary ? " (curated)" : "");
}

/**
 * Concatenate optional firstNames and required lastNames
 * to form fullName. Appends `(you)` if isMe flag is true
 */
export function createNameCheckIsMeTag(user: UserInfo, isMe: boolean) {
  return createNameNoTag(user) + (isMe ? " (you)" : "");
}

/**
 * Concatenate required lastNames and optional firstNames with comma
 */
export function lastNameFirst({
  firstNames,
  lastNames,
}: {
  firstNames: string | null;
  lastNames: string;
}) {
  return lastNames + (firstNames ? ", " + firstNames : "");
}
