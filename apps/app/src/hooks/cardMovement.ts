import { useMemo } from "react";
import { useFetcher } from "react-router";

export type CardMovement = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  moveUp: () => void;
  moveDown: () => void;
};

/**
 * React hook for moving selected cards up or down within a list.
 * Right now, it is specific to `content` due to the API calls it generates.
 */
export function useCardMovement({
  selectedCards,
  ids,
}: {
  selectedCards: Set<string>;
  ids: string[];
}): CardMovement {
  const fetcher = useFetcher();

  const idToPosition = useMemo(
    () => createMapFromIdToPosition({ selectedCards, ids }),
    [ids, selectedCards],
  );

  const canMoveUp = cardsCanMoveUp({ selectedCards, idToPosition });
  const canMoveDown = cardsCanMoveDown({
    selectedCards,
    idToPosition,
    totalCards: ids.length,
  });

  const moveUp = () => {
    if (!canMoveUp) return;
    const id = selectedCards.values().next().value;
    if (!id) return;
    const position = idToPosition[id];
    fetcher.submit(
      {
        path: "copyMove/moveContent",
        contentId: id,
        desiredPosition: position - 1,
      },
      { method: "post", encType: "application/json" },
    );
  };

  const moveDown = () => {
    if (!canMoveDown) return;
    const id = selectedCards.values().next().value;
    if (!id) return;
    const position = idToPosition[id];
    fetcher.submit(
      {
        path: "copyMove/moveContent",
        contentId: id,
        desiredPosition: position + 1,
      },
      { method: "post", encType: "application/json" },
    );
  };

  return {
    canMoveUp,
    canMoveDown,
    moveUp,
    moveDown,
  };
}

/**
 * Build a map of selected ids to their position in the list
 */
function createMapFromIdToPosition({
  selectedCards,
  ids,
}: {
  selectedCards: Set<string>;
  ids: string[];
}): Record<string, number> {
  const record: Record<string, number> = {};
  for (const id of selectedCards) {
    const index = ids.findIndex((currentId) => currentId === id);
    if (index != -1) {
      record[id] = index;
    }
  }
  return record;
}

/**
 * Determine if the current selection can be moved up.
 */
function cardsCanMoveUp({
  selectedCards,
  idToPosition,
}: {
  selectedCards: Set<string>;
  idToPosition: Record<string, number>;
}) {
  if (selectedCards.size !== 1) {
    return false;
  }
  const index = idToPosition[Array.from(selectedCards)[0]];
  return index > 0;
}

/**
 * Determine if the current selection can be moved down.
 */
function cardsCanMoveDown({
  selectedCards,
  idToPosition,
  totalCards,
}: {
  selectedCards: Set<string>;
  idToPosition: Record<string, number>;
  totalCards: number;
}) {
  if (selectedCards.size !== 1) {
    return false;
  }
  const index = idToPosition[Array.from(selectedCards)[0]];
  return index < totalCards - 1;
}
