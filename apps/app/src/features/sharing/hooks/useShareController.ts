import { useCallback, useEffect, useState } from "react";
import { useDisclosure, type UseDisclosureReturn } from "@chakra-ui/react";
import { useFetcher } from "react-router";

import type { ContentType, Visibility } from "../../../types";
import { loadShareStatus } from "../loaders";
import type { SharingData } from "../types";

/**
 * Public contract returned by `useShareController` for pages that host the
 * share button, warning banner, and share modal for a single content item.
 */
export type ShareController = {
  groundTruth: SharingData | null;
  refetchGroundTruth: () => void;
  // Optimistic values used by non-critical UI
  optimisticVisibility: Visibility;
  setOptimisticVisibility: (visibility: Visibility) => void;
  shouldShowPublicComplianceWarning: boolean;
  // <ShareModal> disclosure
  modalIsOpen: boolean;
  openModal: () => Promise<void>;
  closeModal: () => void;
};

/**
 * Coordinates the sharing feature for a page that owns one content item.
 *
 * Editor headers use this hook to keep the share button, warning banner, and
 * modal in sync with the current visibility and latest share-status loader
 * data, while still allowing editor-specific save work to happen before the
 * share modal opens.
 */
export function useShareController({
  contentId,
  contentType,
  visibility,
  inLibrary,
  isSubActivity,
  beforeShareModalOpens,
}: {
  contentId: string;
  contentType: ContentType;
  visibility: Visibility;
  inLibrary: boolean;
  isSubActivity: boolean;
  beforeShareModalOpens?: (() => Promise<void>) | null;
}): ShareController {
  const [optimisticVisibility, setOptimisticVisibility] =
    useState<Visibility>(visibility);

  // Any change in actual visibility resets optimistic value
  useEffect(() => {
    setOptimisticVisibility(visibility);
  }, [visibility]);

  const supportsPublicComplianceWarning =
    optimisticVisibility === "public" &&
    contentType !== "folder" &&
    !inLibrary &&
    !isSubActivity;

  const dataFetcher = useFetcher<typeof loadShareStatus>({
    key: `${contentId}-share-status`,
  });
  const groundTruth: SharingData | null = dataFetcher.data ?? null;

  const refetchGroundTruth = useCallback(() => {
    if (dataFetcher.state === "idle") {
      dataFetcher.load(`/loadShareStatus/${contentId}`);
    }
  }, [contentId, dataFetcher]);

  useEffect(() => {
    if (
      supportsPublicComplianceWarning &&
      dataFetcher.state === "idle" &&
      !dataFetcher.data
    ) {
      refetchGroundTruth();
    }
  }, [
    refetchGroundTruth,
    dataFetcher.data,
    dataFetcher.state,
    supportsPublicComplianceWarning,
  ]);

  const shouldShowPublicComplianceWarning =
    supportsPublicComplianceWarning && groundTruth
      ? !groundTruth.canSharePublicly
      : false;

  const {
    isOpen: modalIsOpen,
    onOpen: openModalNoPreparation,
    onClose: closeModal,
  }: UseDisclosureReturn = useDisclosure();

  const openModal = useCallback(async () => {
    await beforeShareModalOpens?.();
    refetchGroundTruth();
    openModalNoPreparation();
  }, [beforeShareModalOpens, openModalNoPreparation, refetchGroundTruth]);

  return {
    groundTruth,
    refetchGroundTruth,
    optimisticVisibility,
    setOptimisticVisibility,
    shouldShowPublicComplianceWarning,
    modalIsOpen,
    openModal,
    closeModal,
  };
}
