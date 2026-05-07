import { fromBinaryUUID, toBinaryUUID } from "./binary-uuid";
import short from "short-uuid";

const translator = short();

export function toUUID(id: string) {
  return toBinaryUUID(translator.toUUID(id));
}

export function fromUUID(UUID: Uint8Array) {
  return translator.fromUUID(fromBinaryUUID(UUID));
}

export function newUUID() {
  return toBinaryUUID(translator.new());
}

export function isEqualUUID(UUID1: Uint8Array, UUID2: Uint8Array) {
  if (UUID1.length !== UUID2.length) {
    return false;
  }
  for (let i = 0; i < UUID1.length; i++) {
    if (UUID1[i] !== UUID2[i]) {
      return false;
    }
  }
  return true;
}

export function compareUUID(UUID1: Uint8Array, UUID2: Uint8Array) {
  return Buffer.from(UUID1).compare(UUID2);
}

export function convertUUID(obj: unknown): unknown {
  if (obj instanceof Uint8Array) {
    return fromUUID(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(convertUUID);
  }
  if (!obj || typeof obj !== "object" || obj instanceof Date) {
    return obj;
  }
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [key, convertUUID(val)]),
  );
}
