import { useCallback, useState } from "react";
import type { IframeMenuId } from "./iframeMenuIds";

type MenuOpenState = Record<string, boolean>;

type MenuProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

/**
 * Control contract for a single tracked menu.
 *
 * - `menuProps` are passed directly to Chakra `Menu` in controlled mode.
 * - `onMenuOpenChange` lets nested/child components report open/close state
 *   without needing direct access to the parent `Menu` instance.
 */
export type IframeMenuControl = {
  menuProps: MenuProps;
  onMenuOpenChange: (isOpen: boolean) => void;
};

/**
 * Lookup function that returns control props/callbacks for one menu ID.
 *
 * Using `IframeMenuId` keeps the call site typed to known centralized IDs,
 * avoiding ad-hoc string literals.
 */
export type GetMenuControl = (menuId: IframeMenuId) => IframeMenuControl;

/**
 * Tracks open/close state for one or more Chakra `Menu` components that
 * participate in iframe-safe outside-click dismissal.
 *
 * Why this hook exists:
 * - Chakra's default outside-click handling can be unreliable when interaction
 *   crosses iframe boundaries.
 * - We therefore run menus in controlled mode and, while any tracked menu is
 *   open, render a page-level dismiss overlay above iframe content.
 *
 * Consumer wiring pattern:
 * 1) Call `getMenuControl(menuId)` with an `IframeMenuId` from
 *    `IFRAME_MENU_IDS`.
 * 2) Spread `menuControl.menuProps` into Chakra `Menu`.
 * 3) Pass `menuControl.onMenuOpenChange` to child components that need to
 *    signal open/close without direct access to the `Menu`.
 * 4) Render dismiss overlay when `anyMenuOpen` is true.
 *
 * Returns:
 * - `anyMenuOpen`: true if at least one tracked menu is currently open.
 * - `getMenuControl(menuId)`: controlled props + helper callback for that menu.
 */
export function useIframeMenuDismissOverlay() {
  const [menuState, setMenuState] = useState<MenuOpenState>({});

  const setMenuOpen = useCallback((menuId: IframeMenuId, isOpen: boolean) => {
    setMenuState((prev) => {
      if (prev[menuId] === isOpen) {
        return prev;
      }
      return { ...prev, [menuId]: isOpen };
    });
  }, []);

  const getMenuControl = useCallback<GetMenuControl>(
    (menuId) => ({
      menuProps: {
        isOpen: !!menuState[menuId],
        onOpen: () => setMenuOpen(menuId, true),
        onClose: () => setMenuOpen(menuId, false),
      },
      onMenuOpenChange: (isOpen: boolean) => setMenuOpen(menuId, isOpen),
    }),
    [menuState, setMenuOpen],
  );

  const anyMenuOpen = Object.values(menuState).some(Boolean);

  return {
    anyMenuOpen,
    getMenuControl,
  };
}
