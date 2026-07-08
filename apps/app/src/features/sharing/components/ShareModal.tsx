import {
  Heading,
  Modal,
  ModalOverlay,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalContent,
  Text,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  HStack,
  Input,
  VStack,
  Alert,
  AlertTitle,
  AlertDescription,
  AlertIcon,
  SimpleGrid,
  Tooltip,
  Flex,
  Icon,
  Divider,
} from "@chakra-ui/react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { contentTypeToName } from "../../../utils/activity";
import { ContentType, UserInfoWithEmail, Visibility } from "../../../types";
import { Link as ReactRouterLink, useFetcher } from "react-router";
import { SpinnerWhileFetching } from "../../../utils/optimistic_ui";
import { ShareTable } from "../../../widgets/editor/ShareTable";
import { IoMdLink, IoMdCheckmark } from "react-icons/io";
import {
  FiCheckCircle,
  FiChevronRight,
  FiCode,
  FiGlobe,
  FiLink2,
  FiLock,
  FiXCircle,
} from "react-icons/fi";
import type { IconType } from "react-icons";

import {
  contentViewerUrl,
  editorDiagnosticsUrl,
  editorUrl,
} from "../../../utils/url";
import type { ShareController } from "../hooks/useShareController";
import { loadShareStatus } from "../loaders";
import type { PublicShareIssue, SharingData } from "../types";

type ShareModalProps = Pick<ShareController, "modalIsOpen" | "closeModal"> &
  Partial<Pick<ShareController, "groundTruth" | "refetchGroundTruth">> & {
    contentId: string;
    contentType: ContentType;
    onVisibilityChange?: (visibility: Visibility) => void;
  };

/**
 * The main sharing dialog for a content item.
 *
 * This is the feature entry point used by editor pages and standalone pages to
 * manage visibility, public compliance requirements, and person-to-person
 * sharing from one place.
 */
export function ShareModal({
  contentId,
  contentType,
  modalIsOpen: isOpen,
  closeModal: closeShareModal,
  onVisibilityChange,
  groundTruth: sharingFacts,
  refetchGroundTruth: refetchSharingFacts,
}: ShareModalProps) {
  if (sharingFacts !== undefined || refetchSharingFacts) {
    return (
      <ShareModalLayout
        contentId={contentId}
        contentType={contentType}
        isOpen={isOpen}
        onClose={closeShareModal}
      >
        {sharingFacts ? (
          <ShareModalBody
            contentId={contentId}
            contentType={contentType}
            onClose={closeShareModal}
            onVisibilityChange={onVisibilityChange}
            reloadShareStatus={refetchSharingFacts}
            shareStatus={sharingFacts}
          />
        ) : (
          <p>Loading...</p>
        )}
      </ShareModalLayout>
    );
  }

  return (
    <UncontrolledShareModal
      contentId={contentId}
      contentType={contentType}
      isOpen={isOpen}
      onClose={closeShareModal}
      onVisibilityChange={onVisibilityChange}
    />
  );
}

function UncontrolledShareModal({
  contentId,
  contentType,
  isOpen,
  onClose,
  onVisibilityChange,
}: {
  contentId: string;
  contentType: ContentType;
  isOpen: boolean;
  onClose: () => void;
  onVisibilityChange?: (visibility: Visibility) => void;
}) {
  // ==== Load share data
  // Reload every time the modal opens so share status reflects changes made elsewhere
  const fetcher = useFetcher<typeof loadShareStatus>();
  const reloadShareStatus = useCallback(() => {
    fetcher.load(`/loadShareStatus/${contentId}`);
  }, [contentId, fetcher]);

  useEffect(() => {
    if (isOpen && fetcher.state === "idle" && !fetcher.data) {
      reloadShareStatus();
    }
  }, [isOpen, fetcher.state, fetcher.data, reloadShareStatus]);

  // Reset cached data on close so the next open refetches.
  useEffect(() => {
    if (!isOpen && fetcher.data) {
      fetcher.reset();
    }
  }, [isOpen, fetcher]);

  return (
    <ShareModalLayout
      contentId={contentId}
      contentType={contentType}
      isOpen={isOpen}
      onClose={onClose}
    >
      <VStack spacing="2rem" align="stretch">
        {fetcher.data ? (
          <ShareModalBody
            contentId={contentId}
            contentType={contentType}
            onClose={onClose}
            onVisibilityChange={onVisibilityChange}
            reloadShareStatus={reloadShareStatus}
            shareStatus={fetcher.data}
          />
        ) : (
          <p>Loading...</p>
        )}
      </VStack>
    </ShareModalLayout>
  );
}

function ShareModalLayout({
  contentId: _contentId,
  contentType,
  isOpen,
  onClose,
  children,
}: {
  contentId: string;
  contentType: ContentType;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} scrollBehavior="inside" size="4xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">
            Share {contentTypeToName[contentType].toLocaleLowerCase()}
          </Heading>
        </ModalHeader>
        <ModalCloseButton data-test="Share Close Button" />
        <ModalBody m="1rem">{children}</ModalBody>
      </ModalContent>
    </Modal>
  );
}

function ShareModalBody({
  contentId,
  contentType,
  onClose,
  onVisibilityChange,
  reloadShareStatus,
  shareStatus,
}: {
  contentId: string;
  contentType: ContentType;
  onClose: () => void;
  onVisibilityChange?: (visibility: Visibility) => void;
  reloadShareStatus?: () => void;
  shareStatus: SharingData;
}) {
  return (
    <VStack spacing="2rem" align="stretch">
      <SharePublicly
        visibility={shareStatus.visibility}
        parentVisibility={shareStatus.parentVisibility}
        canSharePublicly={shareStatus.canSharePublicly}
        publicShareIssues={shareStatus.publicShareIssues}
        contentId={contentId}
        contentType={contentType}
        ownerId={shareStatus.ownerId}
        closeModal={onClose}
        onVisibilityChange={onVisibilityChange}
        reloadShareStatus={reloadShareStatus}
        peopleSection={
          <Box>
            <Heading size="sm" mb="0.75rem">
              People
            </Heading>
            <ShareWithPeople
              contentId={contentId}
              sharedWith={shareStatus.sharedWith}
              parentSharedWith={shareStatus.parentSharedWith}
            />
          </Box>
        }
      />
    </VStack>
  );
}

function ShareWithPeople({
  contentId,
  sharedWith,
  parentSharedWith,
}: {
  contentId: string;
  sharedWith: UserInfoWithEmail[];
  parentSharedWith: UserInfoWithEmail[];
}) {
  const addEmailFetcher = useFetcher();
  const [emailInput, setEmailInput] = useState("");
  const [inputHasChanged, setInputHasChanged] = useState(false);
  const [addEmailError, setAddEmailError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: This is hack to display a more understandable error message
    // when the user inputs a value that is not in an email format.
    // The better way to do this is to ensure the _server_ is always sending
    // understandable error messages (along with more details only meant for developers)
    if (addEmailFetcher.data && typeof addEmailFetcher.data === "string") {
      if (addEmailFetcher.data.includes("Invalid email address")) {
        setAddEmailError("Invalid email address");
      } else {
        setAddEmailError(addEmailFetcher.data);
      }
    } else {
      setAddEmailError(null);
      setEmailInput("");
    }
  }, [addEmailFetcher.data]);

  function addEmail() {
    addEmailFetcher.submit(
      { path: "share/shareContent", contentId, email: emailInput },
      { method: "POST", encType: "application/json" },
    );
    setInputHasChanged(false);
  }

  return (
    <>
      <ShareTable
        contentId={contentId}
        isPublic={false}
        parentIsPublic={false}
        sharedWith={sharedWith}
        parentSharedWith={parentSharedWith}
        footerRow={
          <Box as="li" listStyleType="none" data-test="Invite People Row">
            <Divider borderColor="gray.100" />
            <FormControl isInvalid={addEmailError ? true : false} px="0.75rem">
              <Flex
                align="center"
                justify="space-between"
                gap="0.75rem"
                py="0.6rem"
              >
                <Input
                  type="email"
                  name="email"
                  aria-label="Invite people with email address"
                  placeholder="Invite people with email address"
                  variant="unstyled"
                  flex="1"
                  minWidth="0"
                  value={emailInput}
                  data-test="Email address"
                  onChange={(e) => {
                    if (e.target.value !== emailInput) {
                      setInputHasChanged(true);
                      setEmailInput(e.target.value);
                    }
                  }}
                  onBlur={() => {
                    if (inputHasChanged) {
                      addEmail();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key == "Enter" && inputHasChanged) {
                      addEmail();
                    }
                  }}
                />

                <SpinnerWhileFetching state={addEmailFetcher.state} />
              </Flex>
              {addEmailError ? (
                <FormErrorMessage mt="0" mb="0.6rem">
                  {addEmailError}
                </FormErrorMessage>
              ) : null}
            </FormControl>
          </Box>
        }
      />
    </>
  );
}

function SharePublicly({
  visibility,
  parentVisibility,
  canSharePublicly,
  publicShareIssues,
  contentId,
  contentType,
  ownerId,
  closeModal,
  onVisibilityChange,
  reloadShareStatus,
  peopleSection,
}: {
  visibility: Visibility;
  parentVisibility: Visibility;
  canSharePublicly: boolean;
  publicShareIssues: PublicShareIssue[];
  contentId: string;
  contentType: ContentType;
  ownerId: string;
  closeModal: () => void;
  onVisibilityChange?: (visibility: Visibility) => void;
  reloadShareStatus?: () => void;
  peopleSection?: ReactNode;
}) {
  const fetcher = useFetcher();
  const [selectedVisibility, setSelectedVisibility] = useState(visibility);
  const [currentVisibility, setCurrentVisibility] = useState(visibility);
  const [pendingVisibilityUpdate, setPendingVisibilityUpdate] =
    useState<Visibility | null>(null);

  const shareableLink = `${window.location.origin}${contentViewerUrl(
    contentType,
    contentId,
    ownerId,
  )}`;
  const embedCode = `<iframe src="${window.location.origin}/embed/${contentId}" width="100%" height="800" style="border: 0"></iframe>`;

  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedEmbedCode, setCopiedEmbedCode] = useState(false);

  useEffect(() => {
    setSelectedVisibility(visibility);
    setCurrentVisibility(visibility);
  }, [visibility]);

  useEffect(() => {
    if (
      pendingVisibilityUpdate &&
      fetcher.state === "idle" &&
      fetcher.data &&
      typeof fetcher.data === "object" &&
      "status" in fetcher.data &&
      typeof fetcher.data.status === "number" &&
      fetcher.data.status >= 200 &&
      fetcher.data.status < 300
    ) {
      setCurrentVisibility(pendingVisibilityUpdate);
      onVisibilityChange?.(pendingVisibilityUpdate);
      reloadShareStatus?.();
      setPendingVisibilityUpdate(null);
    }
  }, [
    fetcher.state,
    fetcher.data,
    onVisibilityChange,
    pendingVisibilityUpdate,
    reloadShareStatus,
  ]);

  const visibilityOptions: Array<{
    value: Visibility;
    title: string;
    description: string;
    dataTest: string;
    icon: IconType;
  }> = [
    {
      value: "private",
      title: "Private",
      description: "Only invited users",
      dataTest: "Share Private Button",
      icon: FiLock,
    },
    {
      value: "unlisted",
      title: "Unlisted",
      description: "Anyone with link",
      dataTest: "Share Unlisted Button",
      icon: FiLink2,
    },
    {
      value: "public",
      title: "Public",
      description: "Visible in discovery",
      dataTest: "Share Publicly Button",
      icon: FiGlobe,
    },
  ];
  const publicCriteria: Array<{
    issue: "errorsCheck" | "missingRequiredCategories" | "accessibilityCheck";
    pendingIssue?: PublicShareIssue;
    label: string;
    failedLabel: string;
    pendingLabel?: string;
    dataTest: string;
    actionLabel: string;
    actionTo: string;
  }> = [
    {
      issue: "errorsCheck",
      pendingIssue: "errorsCheckPending",
      label: "No syntax errors",
      failedLabel: "Syntax errors need to be fixed",
      pendingLabel: "Syntax check needs to complete",
      dataTest: "Public Criteria Errors",
      actionLabel: "Open syntax errors",
      actionTo: editorDiagnosticsUrl(contentId, contentType, "errors"),
    },
    {
      issue: "missingRequiredCategories",
      label: "Categories added",
      failedLabel: "Categories need to be added",
      dataTest: "Public Criteria Categories",
      actionLabel: "Open categories",
      actionTo:
        contentType === "folder"
          ? editorUrl(contentId, contentType, "settings")
          : `${editorUrl(contentId, contentType, "settings")}?showRequired`,
    },
    {
      issue: "accessibilityCheck",
      pendingIssue: "accessibilityCheckPending",
      label: "No accessibility violations",
      failedLabel: "Accessibility violations need to be fixed",
      pendingLabel: "Accessibility check needs to complete",
      dataTest: "Public Criteria Accessibility",
      actionLabel: "Open accessibility violations",
      actionTo: editorDiagnosticsUrl(contentId, contentType, "accessibility"),
    },
  ];
  const completedRequirements = publicCriteria.filter(
    ({ issue, pendingIssue }) =>
      !publicShareIssues.includes(issue) &&
      !(pendingIssue && publicShareIssues.includes(pendingIssue)),
  ).length;
  const remainingRequirements = publicCriteria.length - completedRequirements;
  const isCurrentlyPublicButFailing =
    currentVisibility === "public" && !canSharePublicly;
  const publicRequirementsComplete =
    selectedVisibility === "public" &&
    canSharePublicly &&
    remainingRequirements === 0;
  const hasUnsavedVisibility = selectedVisibility !== currentVisibility;
  const canSubmitVisibility =
    hasUnsavedVisibility &&
    !isVisibilityDisabled(selectedVisibility, parentVisibility, contentType);
  const showAccessCta = selectedVisibility !== "public" && canSubmitVisibility;
  const showPublicAccessCta =
    selectedVisibility === "public" && hasUnsavedVisibility;
  const showPublicRequirementsCard =
    (selectedVisibility === "public" && currentVisibility !== "public") ||
    isCurrentlyPublicButFailing;
  const disablePublicAccessCta =
    !canSubmitVisibility ||
    !publicRequirementsComplete ||
    fetcher.state !== "idle";
  const showDistributionActions = currentVisibility !== "private";
  // Embed code only makes sense for single documents; compound types and
  // folders have no standalone embeddable view.
  const showEmbedCode = contentType === "singleDoc";
  const contentTypeLabel = contentTypeToName[contentType].toLowerCase();
  const contentLinkHelperText =
    currentVisibility === "unlisted"
      ? `Anyone with this link can open the ${contentTypeLabel}`
      : `Anyone can open the ${contentTypeLabel} with this link`;

  function submitVisibility() {
    const nextVisibility = selectedVisibility;
    setPendingVisibilityUpdate(nextVisibility);
    setCopiedShareLink(false);
    setCopiedEmbedCode(false);
    fetcher.submit(
      {
        path: `content/${contentId}/access`,
        visibility: nextVisibility,
      },
      { method: "patch", encType: "application/json" },
    );
  }

  function cancelVisibilityChange() {
    setSelectedVisibility(currentVisibility);
  }

  return (
    <VStack justify="flex-start" align="stretch" spacing="3rem" pt="0.5rem">
      {parentVisibility !== "private" ? (
        <Alert status="info">
          <AlertIcon />
          <AlertDescription>
            Parent visibility is <strong>{parentVisibility}</strong>, so this
            item cannot be more private than its parent.
          </AlertDescription>
        </Alert>
      ) : null}

      <Box width="100%">
        <VStack align="stretch" spacing="1rem">
          <Heading size="sm" data-test="Access Heading">
            Access
          </Heading>
          <Text
            data-test="Current Access Helper"
            color="gray.900"
            fontSize="md"
            fontWeight="medium"
            lineHeight="1.45"
          >
            Current access:{" "}
            <Text as="span" fontWeight="semibold">
              {getVisibilityLabel(currentVisibility)}
            </Text>
            .
          </Text>
          {isCurrentlyPublicButFailing ? (
            <Alert status="warning" data-test="Public Compliance Warning">
              <AlertIcon />
              <Box>
                <AlertTitle>Public content fails requirements</AlertTitle>
                <AlertDescription>
                  Your content is public but fails the requirements for public
                  sharing. Either fix the issues below or unlist your content.
                </AlertDescription>
              </Box>
            </Alert>
          ) : null}
          {hasUnsavedVisibility ? (
            <Text
              data-test="Access Unsaved Note"
              color="blue.700"
              fontSize="sm"
            >
              {`Saving will make it ${selectedVisibility}.`}
            </Text>
          ) : null}
          <SimpleGrid
            columns={{ base: 1, md: 3 }}
            spacing="1rem"
            role="radiogroup"
            aria-label="Access options"
          >
            {visibilityOptions.map((option) => {
              const disabled = isVisibilityDisabled(
                option.value,
                parentVisibility,
                contentType,
              );
              const disabledReason =
                disabled &&
                option.value === "public" &&
                contentType === "folder"
                  ? "Folders can't be made public yet — try unlisted instead."
                  : null;
              const card = (
                <VisibilityOptionCard
                  title={option.title}
                  description={option.description}
                  icon={option.icon}
                  isSelected={selectedVisibility === option.value}
                  isDisabled={disabled || fetcher.state !== "idle"}
                  dataTest={option.dataTest}
                  onClick={() => setSelectedVisibility(option.value)}
                />
              );
              return disabledReason ? (
                <Tooltip
                  key={option.value}
                  label={disabledReason}
                  hasArrow
                  openDelay={300}
                >
                  <Box width="100%" data-test="Folder Public Disabled Tooltip">
                    {card}
                  </Box>
                </Tooltip>
              ) : (
                <Box key={option.value}>{card}</Box>
              );
            })}
          </SimpleGrid>

          {showAccessCta ? (
            <HStack spacing="0.75rem" align="center">
              <AccessCancelButton
                dataTest="Share Cancel Button"
                onClick={cancelVisibilityChange}
                isDisabled={fetcher.state !== "idle"}
              />
              <AccessSaveButton
                dataTest="Share Submit Button"
                onClick={submitVisibility}
                isLoading={fetcher.state !== "idle"}
              />
            </HStack>
          ) : null}

          {showPublicRequirementsCard ? (
            <>
              <Box
                width="100%"
                borderWidth="1px"
                borderRadius="lg"
                borderColor="gray.200"
                bg="gray.50"
                p="1rem"
                data-test="Public Requirements Card"
              >
                <VStack align="stretch" spacing="0.75rem">
                  <Text
                    color={
                      remainingRequirements === 0 ? "green.800" : "gray.800"
                    }
                    fontWeight="medium"
                  >
                    {isCurrentlyPublicButFailing
                      ? `Fix ${remainingRequirements} requirement${
                          remainingRequirements === 1 ? "" : "s"
                        } to restore compliance for public listing`
                      : remainingRequirements === 0
                        ? "All requirements complete"
                        : `${remainingRequirements} requirement${
                            remainingRequirements === 1 ? "" : "s"
                          } remaining before this document can be listed publicly`}
                  </Text>

                  <VStack align="stretch" spacing="0.6rem">
                    {publicCriteria.map((criterion) => {
                      const isPending = criterion.pendingIssue
                        ? publicShareIssues.includes(criterion.pendingIssue)
                        : false;
                      const passed =
                        !publicShareIssues.includes(criterion.issue) &&
                        !isPending;
                      const label = passed
                        ? criterion.label
                        : isPending
                          ? (criterion.pendingLabel ?? criterion.failedLabel)
                          : criterion.failedLabel;
                      return (
                        <PublicCriterion
                          key={criterion.issue}
                          label={label}
                          passed={passed}
                          dataTest={criterion.dataTest}
                          actionLabel={criterion.actionLabel}
                          actionTo={criterion.actionTo}
                          closeModal={closeModal}
                        />
                      );
                    })}
                  </VStack>
                </VStack>
              </Box>

              {showPublicAccessCta ? (
                <HStack spacing="0.75rem" align="center" pt="0.15rem">
                  <AccessCancelButton
                    dataTest="Share Cancel Button"
                    onClick={cancelVisibilityChange}
                    isDisabled={fetcher.state !== "idle"}
                  />
                  <AccessSaveButton
                    dataTest="Share Submit Button"
                    onClick={submitVisibility}
                    isDisabled={disablePublicAccessCta}
                    isLoading={fetcher.state !== "idle"}
                  />
                </HStack>
              ) : null}
            </>
          ) : null}
        </VStack>
      </Box>

      {currentVisibility === "private" ? peopleSection : null}

      {showDistributionActions ? (
        <VStack align="stretch" spacing="1.5rem">
          <Box>
            <Text
              fontSize="sm"
              fontWeight="semibold"
              color="gray.800"
              mb="0.35rem"
            >
              {`${contentTypeToName[contentType]} link`}
            </Text>
            <Text color="gray.700" fontSize="sm" mb="0.65rem">
              {contentLinkHelperText}
            </Text>
            <Tooltip
              label={`Copies the current ${contentTypeLabel} link.`}
              hasArrow
              openDelay={500}
            >
              <Button
                size="sm"
                variant="outline"
                borderColor="gray.300"
                bg="white"
                color="gray.800"
                onClick={() => {
                  navigator.clipboard.writeText(shareableLink);
                  setCopiedShareLink(true);
                  setCopiedEmbedCode(false);
                }}
                _hover={{ bg: "gray.50" }}
              >
                {copiedShareLink ? (
                  <IoMdCheckmark fontSize="1.1rem" />
                ) : (
                  <IoMdLink fontSize="1.1rem" />
                )}
                <Text ml="0.45rem">Copy link</Text>
              </Button>
            </Tooltip>
          </Box>

          {showEmbedCode ? (
            <Box>
              <Text
                fontSize="sm"
                fontWeight="semibold"
                color="gray.800"
                mb="0.35rem"
              >
                Embed code
              </Text>
              <Text color="gray.700" fontSize="sm" mb="0.65rem">
                Use this code to embed the document on another site or LMS.
              </Text>
              <Tooltip
                label="Embed this content in another website or LMS using an iframe."
                hasArrow
                openDelay={500}
              >
                <Button
                  size="sm"
                  variant="outline"
                  borderColor="gray.300"
                  bg="white"
                  color="gray.800"
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode);
                    setCopiedEmbedCode(true);
                    setCopiedShareLink(false);
                  }}
                  _hover={{ bg: "gray.50" }}
                >
                  {copiedEmbedCode ? (
                    <IoMdCheckmark fontSize="1.1rem" />
                  ) : (
                    <FiCode fontSize="1.1rem" />
                  )}
                  <Text ml="0.45rem">Copy embed code</Text>
                </Button>
              </Tooltip>
            </Box>
          ) : null}
        </VStack>
      ) : null}
    </VStack>
  );
}

function VisibilityOptionCard({
  title,
  description,
  icon,
  isSelected,
  isDisabled,
  dataTest,
  onClick,
}: {
  title: string;
  description: string;
  icon: IconType;
  isSelected: boolean;
  isDisabled: boolean;
  dataTest: string;
  onClick: () => void;
}) {
  return (
    <Box
      as="button"
      type="button"
      role="radio"
      aria-checked={isSelected}
      disabled={isDisabled}
      data-test={dataTest}
      width="100%"
      minHeight="5.6rem"
      borderWidth="1px"
      borderRadius="lg"
      borderColor={isSelected ? "blue.600" : "gray.300"}
      bg={isSelected ? "blue.100" : "white"}
      boxShadow={isSelected ? "sm" : "none"}
      px="0.85rem"
      py="0.8rem"
      textAlign="left"
      transition="border-color 0.2s ease, box-shadow 0.2s ease"
      opacity={isDisabled ? 0.6 : 1}
      cursor={isDisabled ? "not-allowed" : "pointer"}
      onClick={onClick}
      _hover={
        isDisabled
          ? undefined
          : {
              borderColor: isSelected ? "blue.700" : "blue.400",
              boxShadow: "sm",
            }
      }
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "blue.500",
        outlineOffset: "2px",
      }}
    >
      <VStack align="flex-start" spacing="0.25rem">
        <Flex
          justify="space-between"
          align="flex-start"
          width="100%"
          gap="1rem"
        >
          <HStack align="flex-start" spacing="0.65rem">
            <Icon
              as={icon}
              boxSize="1rem"
              color={isSelected ? "blue.800" : "gray.700"}
              mt="0.1rem"
            />
            <Box>
              <Text
                color={isSelected ? "blue.900" : "gray.900"}
                fontWeight="semibold"
                fontSize="sm"
              >
                {title}
              </Text>
              <Text color={isSelected ? "blue.800" : "gray.700"} fontSize="xs">
                {description}
              </Text>
            </Box>
          </HStack>
        </Flex>
      </VStack>
    </Box>
  );
}

function PublicCriterion({
  label,
  passed,
  dataTest,
  actionLabel,
  actionTo,
  closeModal,
}: {
  label: string;
  passed: boolean;
  dataTest: string;
  actionLabel: string;
  actionTo: string;
  closeModal: () => void;
}) {
  return (
    <Flex
      data-test={dataTest}
      align="center"
      justify="space-between"
      gap="0.75rem"
      py="0.15rem"
      wrap="nowrap"
    >
      <HStack align="center" spacing="0.65rem" flex="1" minWidth={0}>
        <Icon
          as={passed ? FiCheckCircle : FiXCircle}
          color={passed ? "green.500" : "red.500"}
          boxSize="1rem"
        />
        <Text color={passed ? "gray.800" : "red.700"} noOfLines={1}>
          {label}
        </Text>
      </HStack>
      {!passed ? (
        <Button
          as={ReactRouterLink}
          to={actionTo}
          variant="link"
          size="sm"
          colorScheme="blue"
          rightIcon={<Icon as={FiChevronRight} boxSize="0.9rem" />}
          onClick={closeModal}
          flexShrink={0}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Flex>
  );
}

function AccessSaveButton({
  onClick,
  isDisabled,
  isLoading,
  dataTest,
}: {
  onClick: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
  dataTest: string;
}) {
  return (
    <Button
      data-test={dataTest}
      size="sm"
      borderRadius="lg"
      px="1rem"
      bg="blue.600"
      color="white"
      boxShadow="sm"
      fontWeight="semibold"
      onClick={onClick}
      isDisabled={isDisabled}
      isLoading={isLoading}
      _hover={{
        bg: "blue.700",
        boxShadow: "md",
      }}
      _active={{
        bg: "blue.700",
      }}
      _disabled={{
        bg: "gray.200",
        color: "gray.500",
        boxShadow: "none",
        cursor: "not-allowed",
      }}
    >
      Save access
    </Button>
  );
}

function AccessCancelButton({
  onClick,
  isDisabled,
  dataTest,
}: {
  onClick: () => void;
  isDisabled?: boolean;
  dataTest: string;
}) {
  return (
    <Button
      data-test={dataTest}
      size="sm"
      variant="outline"
      borderRadius="lg"
      px="1rem"
      borderColor="gray.300"
      bg="white"
      color="gray.700"
      boxShadow="sm"
      onClick={onClick}
      isDisabled={isDisabled}
      _hover={{ bg: "gray.50", borderColor: "gray.400" }}
      _disabled={{
        color: "gray.400",
        bg: "gray.100",
        borderColor: "gray.200",
        boxShadow: "none",
        cursor: "not-allowed",
      }}
    >
      Cancel
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

function isVisibilityDisabled(
  visibility: Visibility,
  parentVisibility: Visibility,
  contentType: ContentType,
) {
  if (visibility === "private") {
    return parentVisibility !== "private";
  }
  if (visibility === "unlisted") {
    return parentVisibility === "public";
  }
  // Folders cannot yet be made public; the server rejects this and there is no
  // mechanism to enforce public-share requirements across folder descendants.
  if (visibility === "public" && contentType === "folder") {
    return true;
  }
  return false;
}
