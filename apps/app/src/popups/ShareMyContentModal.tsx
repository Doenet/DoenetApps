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
  HStack,
  Input,
  VStack,
  Alert,
  AlertDescription,
  AlertIcon,
  SimpleGrid,
  Tooltip,
  Flex,
  Icon,
  Td,
  Tr,
} from "@chakra-ui/react";
import { type ReactNode, useEffect, useState } from "react";
import { contentTypeToName } from "../utils/activity";
import { ContentType, UserInfoWithEmail, Visibility } from "../types";
import { Link as ReactRouterLink, useFetcher } from "react-router";
import { SpinnerWhileFetching } from "../utils/optimistic_ui";
import { ShareTable } from "../widgets/editor/ShareTable";
import axios from "axios";
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

import { editorDiagnosticsUrl, editorUrl } from "../utils/url";
type PublicShareIssue =
  | "missingRequiredCategories"
  | "errorsCheck"
  | "accessibilityCheck";

export async function loadShareStatus({ params }: { params: any }) {
  const { data } = await axios.get(
    `/api/editor/getEditorShareStatus/${params.contentId}`,
  );
  return data;
}

/**
 * A modal to manage the sharing status of your activity.
 * Separate sections let you manage public visibility and invited users.
 *
 * @param contentId - The ID of the content being shared
 * @param contentType - The type of content (doc, sequence, etc.)
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback to close the modal
 */
export function ShareMyContentModal({
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

  useEffect(() => {
    if (isOpen) {
      fetcher.load(`/loadShareStatus/${contentId}`);
    }
  }, [isOpen, contentId, fetcher]);

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
        <ModalBody m="1rem">
          <VStack spacing="2rem" align="stretch">
            {fetcher.data ? (
              <>
                <SharePublicly
                  visibility={fetcher.data.visibility}
                  parentVisibility={fetcher.data.parentVisibility}
                  canSharePublicly={fetcher.data.canSharePublicly}
                  publicShareIssues={fetcher.data.publicShareIssues}
                  contentId={contentId}
                  contentType={contentType}
                  closeModal={onClose}
                  onVisibilityChange={onVisibilityChange}
                  peopleSection={
                    <Box>
                      <Heading size="sm" mb="0.75rem">
                        People
                      </Heading>
                      <ShareWithPeople
                        contentId={contentId}
                        sharedWith={fetcher.data.sharedWith}
                        parentSharedWith={fetcher.data.parentSharedWith}
                      />
                    </Box>
                  }
                />
              </>
            ) : (
              <p>Loading...</p>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
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
          <Tr data-test="Invite People Row">
            <Td colSpan={3} px={0} py={0}>
              <FormControl isInvalid={addEmailError ? true : false}>
                <Flex
                  align="center"
                  justify="space-between"
                  gap="0.75rem"
                  px="0.75rem"
                  py="0.6rem"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
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

                  {addEmailError ? (
                    <Text
                      color="red.500"
                      fontSize="sm"
                      textAlign="right"
                      flexShrink={0}
                    >
                      {addEmailError}
                    </Text>
                  ) : null}

                  <SpinnerWhileFetching state={addEmailFetcher.state} />
                </Flex>
              </FormControl>
            </Td>
          </Tr>
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
  closeModal,
  onVisibilityChange,
  peopleSection,
}: {
  visibility: Visibility;
  parentVisibility: Visibility;
  canSharePublicly: boolean;
  publicShareIssues: PublicShareIssue[];
  contentId: string;
  contentType: ContentType;
  closeModal: () => void;
  onVisibilityChange?: (visibility: Visibility) => void;
  peopleSection?: ReactNode;
}) {
  const fetcher = useFetcher();
  const [selectedVisibility, setSelectedVisibility] = useState(visibility);
  const [currentVisibility, setCurrentVisibility] = useState(visibility);
  const [pendingVisibilityUpdate, setPendingVisibilityUpdate] =
    useState<Visibility | null>(null);

  const shareableLink = `${window.location.origin}/activityViewer/${contentId}`;
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
      setPendingVisibilityUpdate(null);
    }
  }, [
    fetcher.state,
    fetcher.data,
    onVisibilityChange,
    pendingVisibilityUpdate,
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
    issue: PublicShareIssue;
    label: string;
    failedLabel: string;
    dataTest: string;
    actionLabel: string;
    actionTo: string;
  }> = [
    {
      issue: "errorsCheck",
      label: "No syntax errors",
      failedLabel: "Syntax errors need to be fixed",
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
      label: "No accessibility violations",
      failedLabel: "Accessibility violations need to be fixed",
      dataTest: "Public Criteria Accessibility",
      actionLabel: "Open accessibility violations",
      actionTo: editorDiagnosticsUrl(contentId, contentType, "accessibility"),
    },
  ];
  const completedRequirements = publicCriteria.filter(
    ({ issue }) => !publicShareIssues.includes(issue),
  ).length;
  const remainingRequirements = publicCriteria.length - completedRequirements;
  const publicRequirementsComplete =
    selectedVisibility === "public" &&
    canSharePublicly &&
    remainingRequirements === 0;
  const hasUnsavedVisibility = selectedVisibility !== currentVisibility;
  const canSubmitVisibility =
    hasUnsavedVisibility &&
    !isVisibilityDisabled(selectedVisibility, parentVisibility);
  const showAccessCta = selectedVisibility !== "public" && canSubmitVisibility;
  const showPublicAccessCta =
    selectedVisibility === "public" && hasUnsavedVisibility;
  const disablePublicAccessCta =
    !canSubmitVisibility ||
    !publicRequirementsComplete ||
    fetcher.state !== "idle";
  const showDistributionActions = currentVisibility !== "private";
  const documentLinkHelperText =
    currentVisibility === "unlisted"
      ? "Anyone with this link can open the document"
      : "Anyone can open the document with this link";

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
              );
              return (
                <VisibilityOptionCard
                  key={option.value}
                  title={option.title}
                  description={option.description}
                  icon={option.icon}
                  isSelected={selectedVisibility === option.value}
                  isDisabled={disabled || fetcher.state !== "idle"}
                  dataTest={option.dataTest}
                  onClick={() => setSelectedVisibility(option.value)}
                />
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

          {selectedVisibility === "public" && currentVisibility !== "public" ? (
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
                      remainingRequirements === 0 ? "green.700" : "gray.700"
                    }
                    fontWeight="medium"
                  >
                    {remainingRequirements === 0
                      ? "All requirements complete"
                      : `${remainingRequirements} requirement${
                          remainingRequirements === 1 ? "" : "s"
                        } remaining before this document can be public`}
                  </Text>

                  <VStack align="stretch" spacing="0.6rem">
                    {publicCriteria.map((criterion) => {
                      const passed = !publicShareIssues.includes(
                        criterion.issue,
                      );
                      return (
                        <PublicCriterion
                          key={criterion.issue}
                          label={
                            passed ? criterion.label : criterion.failedLabel
                          }
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
              Document link
            </Text>
            <Text color="gray.600" fontSize="sm" mb="0.65rem">
              {documentLinkHelperText}
            </Text>
            <Tooltip
              label="Copies the current document link."
              hasArrow
              openDelay={500}
            >
              <Button
                size="sm"
                variant="outline"
                borderColor="gray.300"
                bg="white"
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

          <Box>
            <Text
              fontSize="sm"
              fontWeight="semibold"
              color="gray.800"
              mb="0.35rem"
            >
              Embed code
            </Text>
            <Text color="gray.600" fontSize="sm" mb="0.65rem">
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
      borderColor={isSelected ? "blue.400" : "gray.200"}
      bg={isSelected ? "blue.50" : "white"}
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
              borderColor: isSelected ? "blue.400" : "blue.300",
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
              color={isSelected ? "blue.600" : "gray.600"}
              mt="0.1rem"
            />
            <Box>
              <Text fontWeight="semibold" fontSize="sm">
                {title}
              </Text>
              <Text color="gray.600" fontSize="xs">
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
) {
  if (visibility === "private") {
    return parentVisibility !== "private";
  }
  if (visibility === "unlisted") {
    return parentVisibility === "public";
  }
  return false;
}
