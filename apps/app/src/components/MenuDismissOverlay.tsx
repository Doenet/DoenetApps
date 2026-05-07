import { Box } from "@chakra-ui/react";

type MenuDismissOverlayProps = {
  dataTest: string;
};

/**
 * Full-area transparent layer rendered while iframe-sensitive menus are open.
 *
 * Why this component exists:
 * - When page content includes iframes, default outside-click handling for
 *   Chakra `Menu` can be inconsistent across iframe boundaries.
 * - This overlay sits above the iframe region, so clicks land in the parent
 *   document and reliably trigger menu-close behavior.
 *
 * How it is used:
 * - Parent pages render it only while one or more tracked menus are open.
 * - The overlay itself does not implement a click handler; it relies on
 *   Chakra's normal outside-click listeners to close open menus.
 * - `dataTest` is required so e2e tests can assert overlay visibility and
 *   dismissal behavior.
 */
export function MenuDismissOverlay({ dataTest }: MenuDismissOverlayProps) {
  return (
    <Box
      data-test={dataTest}
      position="absolute"
      top="0"
      right="0"
      bottom="0"
      left="0"
      zIndex="2"
      aria-hidden="true"
    />
  );
}
