import { useMemo } from "react";
import type { IframeMenuId } from "./iframeMenuIds";
import type { GetMenuControl } from "./useIframeMenuDismissOverlay";

/**
 * Memoized convenience wrapper around `getMenuControl(menuId)`.
 *
 * `menuId` is typed as `IframeMenuId`, so callers pass a shared, checked ID
 * (for example `IFRAME_MENU_IDS.scratchPadHelp`) instead of repeating raw
 * string literals like `"scratchPadHelp"` across components.
 *
 * This improves readability and keeps menu IDs centralized and refactor-safe.
 */
export function useControlledMenu(
  getMenuControl: GetMenuControl,
  menuId: IframeMenuId,
) {
  return useMemo(() => getMenuControl(menuId), [getMenuControl, menuId]);
}
