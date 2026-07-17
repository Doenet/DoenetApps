import { Box, Button, HStack, Icon, Text } from "@chakra-ui/react";
import { FaChevronRight } from "react-icons/fa";
import { FiGlobe, FiLink2, FiLock } from "react-icons/fi";
import type { IconType } from "react-icons";

import { Visibility } from "../../../types";
import type { ShareController } from "../hooks/useShareController";

type ShareButtonProps = Pick<
  ShareController,
  "optimisticVisibility" | "shouldShowPublicComplianceWarning" | "openModal"
> & {
  isDisabled: boolean;
};

/**
 * The compact share-settings trigger shown in headers and action bars.
 *
 * It summarizes the current access level and reflects whether the content has
 * a public compliance warning before the modal is opened.
 */
export function ShareButton({
  optimisticVisibility,
  shouldShowPublicComplianceWarning,
  isDisabled,
  openModal,
}: ShareButtonProps) {
  const shareButtonConfig = getShareButtonConfig(optimisticVisibility);
  const shareButtonLabel = getVisibilityLabel(optimisticVisibility);
  const shareButtonText = shouldShowPublicComplianceWarning
    ? "Action required"
    : "Sharing settings";
  const shareButtonAriaLabel = shouldShowPublicComplianceWarning
    ? `Open sharing settings. Current access: ${shareButtonLabel}. Action required: review sharing requirements for public content.`
    : `Open sharing settings. Current access: ${shareButtonLabel}`;

  return (
    <Button
      variant="outline"
      borderColor={
        shouldShowPublicComplianceWarning
          ? "red.300"
          : shareButtonConfig.borderColor
      }
      bg={shouldShowPublicComplianceWarning ? "red.50" : shareButtonConfig.bg}
      color={
        shouldShowPublicComplianceWarning ? "red.700" : shareButtonConfig.color
      }
      leftIcon={<Icon as={shareButtonConfig.icon} boxSize="0.95rem" />}
      rightIcon={<FaChevronRight color="currentColor" fontSize="0.7rem" />}
      _hover={{
        bg: shouldShowPublicComplianceWarning
          ? "red.100"
          : shareButtonConfig.hoverBg,
        borderColor: shouldShowPublicComplianceWarning
          ? "red.400"
          : shareButtonConfig.hoverBorderColor,
      }}
      _active={{
        bg: shouldShowPublicComplianceWarning
          ? "red.100"
          : shareButtonConfig.hoverBg,
      }}
      _disabled={{
        opacity: 0.6,
        cursor: "not-allowed",
      }}
      isDisabled={isDisabled}
      onClick={() => void openModal()}
      data-test="Share Button"
      aria-label={shareButtonAriaLabel}
    >
      <HStack spacing="0.45rem">
        <Box position="relative">
          <Text visibility="hidden">Sharing settings</Text>
          <Text position="absolute" inset="0">
            {shareButtonText}
          </Text>
        </Box>
        <Text fontWeight="medium" opacity={0.85}>
          {shareButtonLabel}
        </Text>
      </HStack>
    </Button>
  );
}

function getVisibilityLabel(visibility: Visibility) {
  switch (visibility) {
    case "private":
      return "Private";
    case "unlisted":
      return "Unlisted";
    case "public":
      return "Public";
  }
}

function getShareButtonConfig(visibility: Visibility): {
  icon: IconType;
  borderColor: string;
  bg: string;
  color: string;
  hoverBg: string;
  hoverBorderColor: string;
} {
  switch (visibility) {
    case "private":
      return {
        icon: FiLock,
        borderColor: "border",
        bg: "surface",
        color: "textMuted",
        hoverBg: "gray.50",
        hoverBorderColor: "gray.400",
      };
    case "unlisted":
      return {
        icon: FiLink2,
        borderColor: "blue.300",
        bg: "blue.50",
        color: "blue.700",
        hoverBg: "blue.100",
        hoverBorderColor: "blue.400",
      };
    case "public":
      return {
        icon: FiGlobe,
        borderColor: "green.300",
        bg: "green.50",
        color: "green.700",
        hoverBg: "green.100",
        hoverBorderColor: "green.400",
      };
  }
}
