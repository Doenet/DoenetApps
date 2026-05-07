/**
 * Use this file for types are defined differently for the server and the client
 */

export type Uuid = string;

export function isUuid(obj: unknown): obj is Uuid {
  return typeof obj === "string";
}

export type DoenetDateTime = string;
