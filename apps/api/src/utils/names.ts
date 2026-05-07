// Note: copied from client. Presumably there's a better way where don't have to duplicate code.

import { readFileSync } from "fs";
import { join } from "path";

function loadWordList(filename: string): string[] {
  const filePath = join(__dirname, "../assets", filename);
  return readFileSync(filePath, "utf-8")
    .split("\n")
    .map((line) => line.replace(/,\s*$/, "").trim())
    .filter((word) => word.length > 0);
}

const adjectives = loadWordList("adjectives.csv");
const trees = loadWordList("trees.csv");

/**
 * Concatenate optional firstNames and required lastNames
 * to form fullName
 */
export function createFullName({
  firstNames,
  lastNames,
}: {
  firstNames: string | null;
  lastNames: string;
}) {
  return (firstNames ? firstNames + " " : "") + lastNames;
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

export function generateHandle({
  appendRandomDigits = 0,
}: {
  appendRandomDigits?: number;
}) {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const tree = trees[Math.floor(Math.random() * trees.length)];

  if (appendRandomDigits > 0) {
    const digits = String(
      Math.floor(Math.random() * Math.pow(10, appendRandomDigits)),
    ).padStart(appendRandomDigits, "0");
    return adjective + tree + digits;
  } else {
    return adjective + tree;
  }
}

export function generateUnusedHandle(existingHandles: Set<string>) {
  let handle = generateHandle({});
  // We're looping in case `generateHandle` creates a duplicate handle
  // Usernames are unique, so we try again if that happens
  let tries = 1;
  while (existingHandles.has(handle)) {
    if (tries > 10) {
      throw new Error("Failed to generate a unique handle.");
    }
    handle = generateHandle({});
    tries++;
  }
  return handle;
}
