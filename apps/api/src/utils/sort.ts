import { prisma } from "../model";
import { filterEditableContent } from "./permissions";

export const SORT_INCREMENT = 2 ** 32;

export type ShiftIndicesCallbackFunction = ({
  shift,
  sortIndices,
}: {
  shift: { increment: number } | { decrement: number };
  sortIndices: { gte: number } | { lte: number };
}) => Promise<void>;

/**
 * We calculate the new sortIndex of an item so that it will have the `desiredPosition`
 * within the array `currentItems` of sort indices.
 *
 * If it turns out that we need to shift the sort indices of `currentItems`
 * in order to fit a new item at `desiredPosition`,
 * then `shiftIndicesCallback` will be called to increment or decrement a subset of the sort indices.
 *
 * @returns a promise resolving to the new sortIndex
 */
export async function calculateNewSortIndex(
  currentSortIndices: bigint[],
  desiredPosition: number,
  shiftIndicesCallback: ShiftIndicesCallbackFunction,
) {
  if (currentSortIndices.length === 0) {
    return 0;
  } else if (desiredPosition <= 0) {
    return Number(currentSortIndices[0]) - SORT_INCREMENT;
  } else if (desiredPosition >= currentSortIndices.length) {
    return (
      Number(currentSortIndices[currentSortIndices.length - 1]) + SORT_INCREMENT
    );
  } else {
    const precedingSortIndex = Number(currentSortIndices[desiredPosition - 1]);
    const followingSortIndex = Number(currentSortIndices[desiredPosition]);
    const candidateSortIndex = Math.round(
      (precedingSortIndex + followingSortIndex) / 2,
    );
    if (
      candidateSortIndex > precedingSortIndex &&
      candidateSortIndex < followingSortIndex
    ) {
      return candidateSortIndex;
    } else {
      // There is no room in sort indices to insert a new item at `desiredLocation`,
      // as the distance between precedingSortIndex and followingSortIndex is too small to fit another integer
      // (presumably because the distance is 1, though possibly a larger distance if we are outside
      // the bounds of safe integers in Javascript).
      // We need to re-index; we shift the smaller set of items preceding or following the desired location.
      if (desiredPosition >= currentSortIndices.length / 2) {
        // We add `SORT_INCREMENT` to all items with sort index `followingSortIndex` or larger.
        await shiftIndicesCallback({
          shift: {
            increment: SORT_INCREMENT,
          },
          sortIndices: {
            gte: followingSortIndex,
          },
        });

        return Math.round(
          (precedingSortIndex + followingSortIndex + SORT_INCREMENT) / 2,
        );
      } else {
        // We subtract `SORT_INCREMENT` from all items with sort index `precedingSortIndex` or smaller.
        await shiftIndicesCallback({
          shift: {
            decrement: SORT_INCREMENT,
          },
          sortIndices: {
            lte: precedingSortIndex,
          },
        });

        return Math.round(
          (precedingSortIndex - SORT_INCREMENT + followingSortIndex) / 2,
        );
      }
    }
  }
}

/**
 * For parent given by `parentId` and `ownerId`,
 * find the `sortIndex` that will place a new item as the last entry in the parent.
 * If `parentId` is undefined, then the root folder of `ownerId` is used.
 *
 * Throws an error if `parentId` is supplied but isn't a folder, sequence, or select owned by `ownerId`.
 */
export async function getNextSortIndexForParent(
  ownerId: Uint8Array,
  parentId: Uint8Array | null,
) {
  if (parentId !== null) {
    // if a folderId is present, verify that it is a folder is owned by ownerId
    await prisma.content.findUniqueOrThrow({
      where: {
        id: parentId,
        type: { not: "singleDoc" },
        ...filterEditableContent(ownerId),
      },
    });
  }

  const lastIndex = (
    await prisma.content.aggregate({
      where: { ownerId, parentId },
      _max: { sortIndex: true },
    })
  )._max.sortIndex;

  return getNextSortIndex(lastIndex);
}

/**
 * Get the sort index that should come after an item with sort index `lastIndex`,
 * given that the item is the last one in the list
 */
export function getNextSortIndex(lastIndex: bigint | null) {
  // The new index is a multiple of SORT_INCREMENT and is at least SORT_INCREMENT after lastIndex.
  // It is set to zero if it is the first item in the folder.
  return lastIndex === null
    ? 0
    : Math.ceil(Number(lastIndex) / SORT_INCREMENT + 1) * SORT_INCREMENT;
}
