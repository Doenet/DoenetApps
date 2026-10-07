import { Badge, HStack, Icon, Text } from "@chakra-ui/react";
import { FiGlobe, FiLink2, FiLock } from "react-icons/fi";

function getVisibilityPillConfig(
  visibility: "private" | "unlisted" | "public",
) {
  switch (visibility) {
    case "private":
      return {
        icon: FiLock,
        label: "Private",
        borderColor: "border",
        bg: "surface",
        color: "textMuted",
        // private already uses flipping tokens.
        dark: { borderColor: "border", bg: "surface", color: "textMuted" },
      };
    case "unlisted":
      return {
        icon: FiLink2,
        label: "Unlisted",
        borderColor: "blue.300",
        bg: "blue.50",
        color: "blue.700",
        // blue.50/.300/.700 are fixed light values -> a light pill in dark
        // mode; use dark-blue counterparts.
        dark: { borderColor: "blue.700", bg: "blue.900", color: "blue.200" },
      };
    case "public":
      return {
        icon: FiGlobe,
        label: "Public",
        borderColor: "green.300",
        bg: "green.50",
        color: "green.700",
        dark: { borderColor: "green.700", bg: "green.900", color: "green.200" },
      };
  }
}

/**
 * The Private/Unlisted/Public visibility badge shown on content cards.
 * Extracted so it can be rendered and contrast-tested in isolation.
 */
export function VisibilityPill({
  visibility,
}: {
  visibility: "private" | "unlisted" | "public";
}) {
  const config = getVisibilityPillConfig(visibility);
  return (
    <Badge
      data-test="Visibility Pill"
      marginLeft="0.5rem"
      px="0.45rem"
      py="0.15rem"
      borderRadius="full"
      borderWidth="1px"
      borderColor={config.borderColor}
      bg={config.bg}
      color={config.color}
      _dark={{
        borderColor: config.dark.borderColor,
        bg: config.dark.bg,
        color: config.dark.color,
      }}
      fontWeight="medium"
      textTransform="none"
    >
      <HStack spacing="0.25rem">
        <Icon as={config.icon} boxSize="0.75rem" />
        <Text fontSize="xs">{config.label}</Text>
      </HStack>
    </Badge>
  );
}
