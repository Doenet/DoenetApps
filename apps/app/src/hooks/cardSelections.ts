import { useCallback, useEffect, useState } from "react";

export type CardSelections = {
  ids: Set<string>;
  areActive: boolean;
  count: number;
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

/**
 * React hook for tracking a set of selected card ids.
 * Keeps selections in sync with the provided `ids` list.
 */
export function useCardSelections({ ids }: { ids: string[] }): CardSelections {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  // `add`, `remove` and `clear` keep their identity across renders, so memoized
  // cards that receive them don't re-render.

  /** Add a card id to the selection. */
  const add = useCallback((id: string) => {
    setSelectedCards((was) => {
      const newSet = new Set(was);
      newSet.add(id);
      return newSet;
    });
  }, []);

  /** Remove a card id from the selection. */
  const remove = useCallback((id: string) => {
    setSelectedCards((was) => {
      const newSet = new Set(was);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  /** Clear all selections. */
  const clear = useCallback(() => setSelectedCards(new Set()), []);

  /*
   * Every time the ids changes, we check if any of the selected cards
   * are no longer present in the current id list. If any are missing,
   * we clear the selection to avoid referencing non-existent ids.
   */
  useEffect(() => {
    setSelectedCards((was) => {
      return updateSelectionGivenNewIds({
        selectedCards: was,
        newIds: ids,
      });
    });
  }, [ids]);

  return {
    ids: selectedCards,
    areActive: selectedCards.size > 0,
    count: selectedCards.size,
    add,
    remove,
    clear,
  };
}

/**
 * Return a selection set that only includes ids still present in `newIds`.
 * If any selected id is missing, the selection is cleared.
 */
function updateSelectionGivenNewIds({
  selectedCards,
  newIds,
}: {
  selectedCards: Set<string>;
  newIds: string[];
}) {
  let foundMissing = false;
  const idsSet = new Set(newIds);
  for (const selectedCard of selectedCards) {
    if (!idsSet.has(selectedCard)) {
      foundMissing = true;
      break;
    }
  }
  if (foundMissing) {
    return new Set([]);
  } else {
    return selectedCards;
  }
}
