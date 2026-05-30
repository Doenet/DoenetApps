import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@chakra-ui/react";
import type { ShareController } from "../hooks/useShareController";

type ShareWarningBannerProps = Pick<
  ShareController,
  "shouldShowPublicComplianceWarning" | "openModal"
>;

/**
 * Editor-facing warning banner that points authors from the header to the
 * sharing dialog when public content stops meeting the public requirements.
 */
export function ShareWarningBanner({
  shouldShowPublicComplianceWarning,
  openModal,
}: ShareWarningBannerProps) {
  if (!shouldShowPublicComplianceWarning) {
    return null;
  }

  return (
    <Alert
      status="warning"
      minHeight="40px"
      py="0.35rem"
      px="0.75rem"
      cursor="pointer"
      data-test="Editor Share Warning"
      onClick={() => void openModal()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void openModal();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <AlertIcon />
      <AlertTitle mr="0.35rem">Public content fails requirements</AlertTitle>
      <AlertDescription>Click to open share settings</AlertDescription>
    </Alert>
  );
}
