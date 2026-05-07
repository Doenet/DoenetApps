import { z } from "zod";

/**
 * An integer in the range [1, 65535] inclusive.
 * The upper bound is the max number that can be stored in an `unsigned small int` field.
 */
export const rangedNumber = z.int().gte(1).lte(65535);

/**
 * A string coerced to an integer in the range [1, 65535] inclusive.
 * The upper bound is the max number that can be stored in an `unsigned small int` field
 *
 * Use this alternative to `rangedNumber` for `GET` requests where all parameters are inherently strings.
 */
export const stringAsRangedNumber = z.coerce.number().int();
// We're using legacy number().int() because you can't coerce directly to int

export const stringAsRangedNumberIncludingZero = z.coerce
  .number()
  .int()
  .gte(0)
  .lte(65535);
// We're using legacy number().int() because you can't coerce directly to int
