import { FaArrowUp, FaArrowDown } from "react-icons/fa6";
import { FiTrash2 } from "react-icons/fi";
import { MdDriveFileMoveOutline } from "react-icons/md";
import { Action, Context } from "../widgets/ActionBar";
import { ContentDescription } from "../types";
import { CardMovement } from "../hooks/cardMovement";
import { CardSelections } from "../hooks/cardSelections";

/**
 * Configures an ActionBar for adding selected content items to a destination.
 * For example, when a user selects items from their folder to be added to an empty problem set.
 *
 * You can pass this config (`actions` and `context`) to an ActionBar component,
 * which will render the appropriate buttons.
 *
 * The returned configuration provides:
 * - A context message showing what's being added and where
 * - An "Add" action button that executes the addition
 * - A close handler to exit add mode and clear selections
 *
 * @param cardSelections - Manages the currently selected content items
 * @param addTo - The destination content item where selections will be added
 * @param setAddTo - Callback to exit add mode by clearing the destination
 * @param onAdd - Callback to execute when the Add button is clicked
 * @returns Object containing `actions` array and `context` object for ActionBar
 *
 * @example
 * ```tsx
 * const config = configAddFromContentList({
 *   cardSelections,
 *   addTo: targetFolder,
 *   setAddTo,
 *   onAdd: handleAddItems,
 * });
 * return <ActionBar actions={config.actions} context={config.context} />;
 * ```
 */
export function configAddFromContentList({
  cardSelections,
  addTo,
  setAddTo,
  onAdd,
}: {
  cardSelections: CardSelections;
  addTo: ContentDescription;
  setAddTo: (c: ContentDescription | null) => void;
  onAdd: () => void;
}): { actions: Action[]; context: Context } {
  const context = {
    description: `Adding ${cardSelections.count} item${cardSelections.count === 1 ? "" : "s"} to ${addTo.name}`,
    isLongDescription: true,
    closeLabel: "Stop adding items",
    onClose: () => {
      cardSelections.clear();
      setAddTo(null);
    },
  };
  const actions = [
    {
      label: "Add",
      onClick: onAdd,
      isDisabled: cardSelections.count === 0,
    },
  ];
  return { context, actions };
}

/**
 * Configures an ActionBar for organizing content items within a list.
 * For example, when a user selects items in their folder to reorder, move, copy, or delete them.
 *
 * You can pass this config (`actions` and `context`) to an ActionBar component,
 * which will render the appropriate buttons.
 *
 * The returned configuration provides:
 * - A context message showing how many items are selected
 * - Action buttons for moving up/down, moving to another location, copying, and deleting
 * - A close handler to deselect all items
 *
 * @param cardSelections - Manages the currently selected content items
 * @param cardMovement - Handles move up/down operations and tracks if moves are possible
 * @param forceDisableMoveUpAndDown - When true, disables the move up/down buttons regardless of position
 * @param onMoveTo - Callback to execute when the "Move to" button is clicked
 * @param onCopy - Callback to execute when the "Make a copy" button is clicked
 * @param onDelete - Callback to execute when the "Move to trash" button is clicked
 * @param FIX_ME_miscellaneous_buttons - Temporary parameter for additional buttons (to be refactored)
 * @returns Object containing `actions` array and `context` object for ActionBar
 *
 * @example
 * ```tsx
 * const config = configOrganizeContentList({
 *   cardSelections,
 *   cardMovement,
 *   forceDisableMoveUpAndDown: hasActiveQuery,
 *   onMoveTo: handleMoveTo,
 *   onCopy: handleCopy,
 *   onDelete: handleDelete,
 * });
 * return <ActionBar actions={config.actions} context={config.context} />;
 * ```
 */
export function configOrganizeContentList({
  cardSelections,
  cardMovement,
  forceDisableMoveUpAndDown = false,
  onMoveTo,
  onCopy,
  onDelete,
  FIX_ME_miscellaneous_buttons,
}: {
  cardSelections: CardSelections;
  cardMovement: CardMovement;
  forceDisableMoveUpAndDown?: boolean;
  onMoveTo: () => void;
  onCopy: () => void;
  onDelete: () => void;
  FIX_ME_miscellaneous_buttons?: any;
}): { actions: Action[]; context: Context } {
  const context: Context = {
    description: `${cardSelections.count} item${
      cardSelections.count === 1 ? "" : "s"
    } selected`,
    closeLabel: "Deselect all",
    onClose: cardSelections.clear,
    FIX_ME_miscellaneous_buttons,
  };
  const actions: Action[] = [
    {
      label: "Move up",
      onClick: cardMovement.moveUp,
      isDisabled: !cardMovement.canMoveUp || forceDisableMoveUpAndDown,
      icon: FaArrowUp,
      useIconOnly: true,
    },
    {
      label: "Move down",
      onClick: cardMovement.moveDown,
      isDisabled: !cardMovement.canMoveDown || forceDisableMoveUpAndDown,
      icon: FaArrowDown,
      useIconOnly: true,
    },
    {
      label: "Move to",
      onClick: onMoveTo,
      isDisabled: cardSelections.count !== 1,
      icon: MdDriveFileMoveOutline,
      useIconOnly: true,
    },
    {
      label: "Move to trash",
      onClick: onDelete,
      isDisabled: cardSelections.count !== 1,
      icon: FiTrash2,
      useIconOnly: true,
    },
    {
      label: "Make a copy",
      onClick: onCopy,
      isDisabled: cardSelections.count === 0,
    },
  ];
  return { context, actions };
}

/**
 * Configures an ActionBar for read-only content lists where items can only be copied.
 * For example, when a user is browsing shared content or a library where they cannot
 * modify the original items but can copy them to their own workspace.
 *
 * You can pass this config (`actions` and `context`) to an ActionBar component,
 * which will render the appropriate buttons for read-only operations.
 *
 * The returned configuration provides:
 * - A context message showing how many items are selected
 * - A "Copy to" action button for copying items to another location
 * - A close handler to deselect all items
 *
 * @param cardSelections - Manages the currently selected content items
 * @param onCopyTo - Callback to execute when the "Copy to" button is clicked
 * @returns Object containing `actions` array and `context` object for ActionBar
 *
 * @example
 * ```tsx
 * const config = configReadOnlyContentList({
 *   cardSelections,
 *   onCopyTo: handleCopyToMyFolder,
 * });
 * return <ActionBar actions={config.actions} context={config.context} />;
 * ```
 */
export function configReadOnlyContentList({
  cardSelections,
  onCopyTo,
}: {
  cardSelections: CardSelections;
  onCopyTo: () => void;
}): { actions: Action[]; context: Context } {
  const context: Context = {
    description: `${cardSelections.count} item${
      cardSelections.count === 1 ? "" : "s"
    } selected`,
    closeLabel: "Deselect all",
    onClose: cardSelections.clear,
  };
  const actions: Action[] = [
    {
      label: "Copy to",
      onClick: onCopyTo,
      isDisabled: cardSelections.count !== 1,
    },
  ];
  return { context, actions };
}
