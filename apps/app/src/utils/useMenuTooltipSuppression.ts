import { useCallback, useEffect, useRef, useState } from "react";

type UseMenuTooltipSuppressionArgs = {
  onOpen: () => void;
  onClose: () => void;
  suppressionDurationMs?: number;
};

/**
 * Prevents menu-trigger tooltip persistence when a Chakra menu opens/closes.
 *
 * Behavior:
 * - Disable tooltip while menu open/close transitions occur
 * - Blur the tracked menu trigger on close only when it currently has focus
 * - Re-enable tooltip automatically after a short delay
 *
 * Usage:
 * - Attach `setTriggerRef` to the menu trigger element (typically `MenuButton`).
 * - Wire `handleMenuOpen`/`handleMenuClose` to Chakra `Menu` callbacks.
 */
export function useMenuTooltipSuppression({
  onOpen,
  onClose,
  suppressionDurationMs = 150,
}: UseMenuTooltipSuppressionArgs) {
  const [suppressTooltip, setSuppressTooltip] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const setTriggerRef = useCallback((element: HTMLElement | null) => {
    triggerElementRef.current = element;
  }, []);

  const temporarilySuppressTooltip = useCallback(() => {
    setSuppressTooltip(true);
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => {
      setSuppressTooltip(false);
      resetTimeoutRef.current = null;
    }, suppressionDurationMs);
  }, [suppressionDurationMs]);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleMenuOpen = useCallback(() => {
    temporarilySuppressTooltip();
    onOpen();
  }, [onOpen, temporarilySuppressTooltip]);

  const handleMenuClose = useCallback(() => {
    temporarilySuppressTooltip();

    const triggerElement = triggerElementRef.current;
    const activeElement = document.activeElement;
    if (
      triggerElement &&
      activeElement &&
      triggerElement.contains(activeElement)
    ) {
      triggerElement.blur();
    }

    onClose();
  }, [onClose, temporarilySuppressTooltip]);

  const handleTriggerMouseEnter = useCallback(() => {
    setSuppressTooltip(false);
  }, []);

  return {
    suppressTooltip,
    handleMenuOpen,
    handleMenuClose,
    handleTriggerMouseEnter,
    setTriggerRef,
  };
}
