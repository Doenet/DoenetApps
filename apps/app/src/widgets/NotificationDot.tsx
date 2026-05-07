import { ReactNode } from "react";
import { Box, Text } from "@chakra-ui/react";

/**
 * This component overlays a little red dot over its children in the corner.
 * The red dot will only appear when `show` is true.
 */
export function NotificationDot({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}) {
  return (
    <Box position="relative">
      {children}
      {show && (
        <Text
          borderRadius="2px"
          fontSize="2xs"
          padding="1px 3px"
          position="absolute"
          top="0"
          right="0"
          zIndex="500"
          pointerEvents="none"
        >
          &#x1f534;
        </Text>
      )}
    </Box>
  );
}
