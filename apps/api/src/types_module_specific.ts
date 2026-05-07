/**
 * Use this file for types are defined differently for the server and the client
 */

export type Uuid = Uint8Array;

export function isUuid(obj: unknown): obj is Uuid {
  return obj instanceof Uint8Array;
}

export type DoenetDateTime = Date;
