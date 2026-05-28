import type { Prisma } from "@prisma/client";
import {
  deepmerge,
  type DeepMergeBuiltInMetaData,
  type DeepMergeFunctionsDefaultURIs,
  type DeepMergeHKT,
} from "deepmerge-ts";

type MergedSelect<
  TSelect extends object,
  T extends readonly [TSelect, ...TSelect[]],
> = DeepMergeHKT<T, DeepMergeFunctionsDefaultURIs, DeepMergeBuiltInMetaData>;

/**
 * Resolve the result type produced by Prisma for a given `content` select object.
 * This is useful when a `select` is defined separately from the query and you want
 * to reuse the corresponding payload type elsewhere in the codebase.
 *
 * ```ts
 * const mySelect = contentSelect({
 *   id: true,
 *   name: true,
 * });
 *
 * type MyContent = ContentPayload<typeof mySelect>;
 * // MyContent is { id: Uuid; name: string }
 * ```
 *
 * @see `contentSelect` for creating strongly typed select objects
 * @see `mergeContentSelects` for combining multiple select objects into one
 */
export type ContentPayload<T extends Prisma.contentSelect> =
  Prisma.contentGetPayload<{ select: T }>;

/**
 * Create typed helpers for defining and merging Prisma `select` objects.
 * Use this when you want a small pair of reusable utilities for a specific Prisma
 * model or relation shape: one helper to define a typed `select`, and one helper
 * to merge several `select` objects into a single value.
 *
 * ```ts
 * const assignmentSelectHelpers =
 *   createPrismaSelectHelpers<Prisma.assignmentSelect>();
 *
 * const assignmentBaseSelect = assignmentSelectHelpers.select({
 *   id: true,
 *   label: true,
 * });
 *
 * const assignmentOwnerSelect = assignmentSelectHelpers.select({
 *   owner: {
 *     select: {
 *       id: true,
 *     },
 *   },
 * });
 *
 * const assignmentSelect = assignmentSelectHelpers.mergeSelects(
 *   assignmentBaseSelect,
 *   assignmentOwnerSelect,
 * );
 * ```
 *
 * @returns An object with `select` and `mergeSelects` helpers for the provided Prisma select type
 */
export function createPrismaSelectHelpers<TSelect extends object>() {
  const select = <const T extends TSelect>(value: T) => value;

  const mergeSelects = <const T extends readonly [TSelect, ...TSelect[]]>(
    ...selects: T
  ): MergedSelect<TSelect, T> =>
    deepmerge(...selects) as MergedSelect<TSelect, T>;

  return {
    select,
    mergeSelects,
  };
}

const contentSelectHelpers = createPrismaSelectHelpers<Prisma.contentSelect>();

/**
 * Create a `select` statement for fields in the `content` table.
 * This object is strongly typed and works well with Prisma.
 *
 * ```ts
 * // specify which fields to select
 * const mySelect = contentSelect({
 *   id: true,
 *   name: true,
 * });
 * // use the select in a Prisma query
 * // result is type { id: number; name: string }
 * const result = await prisma.content.findMany({
 *   select: mySelect,
 * });
 * ```
 *
 * @see `mergeContentSelects` for combining multiple select statements into one
 * @see `ContentPayload` for the resulting type
 */
export const contentSelect = contentSelectHelpers.select;

/**
 * @description
 * Combine `select` statements into a single `select` for fields in the `content` table.
 *
 * @example
 * ```ts
 * const select1 = contentSelect({ id: true });
 * const select2 = contentSelect({ name: true });
 * // merge the selects into one
 * const mergedSelect = mergeContentSelects(select1, select2);
 * // use it in a Prisma query
 * // result is type { id: number; name: string }
 * const result = await prisma.content.findMany({ select: mergedSelect });
 * ```
 *
 * @see `contentSelect` for creating individual select statements
 * @see `ContentPayload` for the resulting type
 */
export const mergeContentSelects = contentSelectHelpers.mergeSelects;
