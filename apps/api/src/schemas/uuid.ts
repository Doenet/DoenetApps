import { z } from "zod";

import short from "short-uuid";
import { toUUID } from "../utils/uuid";

const translator = short();

export const uuidSchema = z
  .custom<"uuid">((val) => {
    return typeof val === "string" && translator.validate(val);
  })
  .transform((val) => toUUID(val));

/**
 * Use this schema when you want to ensure the caller explicitly
 * provides a `null` value.
 * Main use case: `POST` requests.
 */
export const uuidOrNullSchema = uuidSchema.nullable();

/**
 * Use this schema when the caller must pass a valid uuid
 * or omit the field completely. It will be transformed
 * into a `null` value if it is omitted.
 * Main use case: `GET` requests with uuid in the url.
 */
export const optionalUuidSchema = uuidSchema
  .optional()
  .transform((val) => val ?? null);
