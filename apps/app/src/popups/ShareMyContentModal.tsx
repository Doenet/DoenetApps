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
  FormLabel,
  HStack,
  Input,
  VStack,
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Link as ChakraLink,
  List,
  ListItem,
  Select,
  Tooltip,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { contentTypeToName } from "../utils/activity";
import { ContentType, UserInfoWithEmail, Visibility } from "../types";
import { Link as ReactRouterLink, useFetcher } from "react-router";
import { SpinnerWhileFetching } from "../utils/optimistic_ui";
import { ShareTable } from "../widgets/editor/ShareTable";
import axios from "axios";
import { IoMdLink, IoMdCheckmark } from "react-icons/io";
import { FiCode } from "react-icons/fi";

import { editorUrl } from "../utils/url";
type PublicShareIssue =
  | "missingRequiredCategories"
  | "documentErrors"
  | "level1AccessibilityViolations";

export async function loadShareStatus({ params }: { params: any }) {
  const { data } = await axios.get(
    `/api/editor/getEditorShareStatus/${params.contentId}`,
  );
  return data;
}

/**
 * A modal to manage the sharing status of your activity.
 * Two tabs: sharing with specific people and sharing publicly.
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
}: {
  contentId: string;
  contentType: ContentType;
  isOpen: boolean;
  onClose: () => void;
}) {
  // ==== Load share data
  // We're using a fetcher here so that it loads every time React Router revalidates the page
  const fetcher = useFetcher<typeof loadShareStatus>();

  useEffect(() => {
    if (isOpen && fetcher.state === "idle" && !fetcher.data) {
      fetcher.load(`/loadShareStatus/${contentId}`);
    }
  }, [isOpen, fetcher, contentId]);

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
          <VStack spacing="3rem" align="flex-start">
            <Box>
              <Heading size="sm">With the public</Heading>
              {fetcher.data ? (
                <SharePublicly
                  visibility={fetcher.data.visibility}
                  parentVisibility={fetcher.data.parentVisibility}
                  canSharePublicly={fetcher.data.canSharePublicly}
                  publicShareIssues={fetcher.data.publicShareIssues}
                  contentId={contentId}
                  contentType={contentType}
                  closeModal={onClose}
                />
              ) : (
                <p>Loading...</p>
              )}
            </Box>

            <Box>
              <Heading size="sm">With specific people</Heading>
              {fetcher.data ? (
                <ShareWithPeople
                  contentId={contentId}
                  sharedWith={fetcher.data.sharedWith}
                  parentSharedWith={fetcher.data.parentSharedWith}
                />
              ) : (
                <p>Loading...</p>
              )}
            </Box>
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
      {sharedWith.length > 0 && (
        <ShareTable
          contentId={contentId}
          isPublic={false}
          parentIsPublic={false}
          sharedWith={sharedWith}
          parentSharedWith={parentSharedWith}
        />
      )}

      <FormControl isInvalid={addEmailError ? true : false} marginTop="20px">
        <FormLabel>Add people</FormLabel>
        <HStack>
          <Input
            type="email"
            name="email"
            placeholder="Email address"
            value={emailInput}
            data-test="Email address"
            onChange={(e) => {
              if (e.target.value !== emailInput) {
                setInputHasChanged(true);
                setEmailInput(e.target.value);
              }
            }}
            width="90%"
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
        </HStack>

        {addEmailError && <FormErrorMessage>{addEmailError}</FormErrorMessage>}
      </FormControl>
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
}: {
  visibility: Visibility;
  parentVisibility: Visibility;
  canSharePublicly: boolean;
  publicShareIssues: PublicShareIssue[];
  contentId: string;
  contentType: ContentType;
  closeModal: () => void;
}) {
  const fetcher = useFetcher();
  const [selectedVisibility, setSelectedVisibility] = useState(visibility);

  const shareableLink = `${window.location.origin}/activityViewer/${contentId}`;
  const embedCode = `<iframe src="${window.location.origin}/embed/${contentId}" width="100%" height="800" style="border: 0"></iframe>`;

  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedEmbedCode, setCopiedEmbedCode] = useState(false);

  useEffect(() => {
    setSelectedVisibility(visibility);
  }, [visibility]);

  const hasShareableVisibility = selectedVisibility !== "private";
  const publicOptionDisabled =
    !canSharePublicly && selectedVisibility !== "public";
  const visibilityMessage: Record<Visibility, string> = {
    private:
      "Content is private. Only people you explicitly share with can access it.",
    unlisted:
      "Content is unlisted. Anyone with the link can view it, but it will not appear in browse pages.",
    public: "Content is public. Anyone can find and use it.",
  };

  const publicCriteriaWarning = publicShareIssues.length > 0 && (
    <Alert status="warning">
      <AlertIcon />
      <AlertTitle>Cannot share publicly yet</AlertTitle>
      <AlertDescription>
        <List spacing="0.25rem">
          {publicShareIssues.includes("missingRequiredCategories") ? (
            <ListItem>
              Fill out{" "}
              {contentType === "folder" ? (
                <>required categories on the content you want to publish.</>
              ) : (
                <ChakraLink
                  as={ReactRouterLink}
                  to={`${editorUrl(contentId, contentType, "settings")}?showRequired`}
                  textDecoration="underline"
                  onClick={closeModal}
                >
                  required settings
                </ChakraLink>
              )}{" "}
              to satisfy the category requirement for public sharing.
            </ListItem>
          ) : null}
          {publicShareIssues.includes("documentErrors") ? (
            <ListItem>
              Resolve document errors in this content and its children.
            </ListItem>
          ) : null}
          {publicShareIssues.includes("level1AccessibilityViolations") ? (
            <ListItem>
              Resolve level 1 accessibility violations in this content and its
              children.
            </ListItem>
          ) : null}
        </List>
      </AlertDescription>
    </Alert>
  );

  return (
    <VStack justify="flex-start" align="flex-start" spacing="1rem" pt="1rem">
      {parentVisibility !== "private" ? (
        <Alert status="info">
          <AlertIcon />
          <AlertDescription>
            Parent visibility is <strong>{parentVisibility}</strong>, so this
            item cannot be more private than its parent.
          </AlertDescription>
        </Alert>
      ) : null}

      {publicCriteriaWarning}

      <FormControl>
        <FormLabel>Visibility</FormLabel>
        <Select
          data-test="Visibility Select"
          value={selectedVisibility}
          isDisabled={fetcher.state !== "idle"}
          onChange={(e) => {
            setSelectedVisibility(e.target.value as Visibility);
            fetcher.submit(
              {
                path: `content/${contentId}/access`,
                visibility: e.target.value,
              },
              { method: "patch", encType: "application/json" },
            );
          }}
        >
          <option value="private" disabled={parentVisibility !== "private"}>
            Private
          </option>
          <option value="unlisted" disabled={parentVisibility === "public"}>
            Unlisted
          </option>
          <option value="public" disabled={publicOptionDisabled}>
            Public
          </option>
        </Select>
      </FormControl>

      <Text data-test="Public Status">
        {visibilityMessage[selectedVisibility]}
      </Text>

      {hasShareableVisibility ? (
        <HStack spacing="1rem">
          <Tooltip
            label="Copies a direct link to this content."
            hasArrow
            openDelay={500}
          >
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => {
                navigator.clipboard.writeText(shareableLink);
                setCopiedShareLink(true);
                setCopiedEmbedCode(false);
              }}
            >
              {copiedShareLink ? (
                <IoMdCheckmark fontSize="1.2rem" />
              ) : (
                <IoMdLink fontSize="1.2rem" />
              )}
              <Text ml="0.5rem">Copy shareable link</Text>
            </Button>
          </Tooltip>

          <Tooltip
            label="Embed this content in another website or LMS using an iframe."
            hasArrow
            openDelay={500}
          >
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => {
                navigator.clipboard.writeText(embedCode);
                setCopiedEmbedCode(true);
                setCopiedShareLink(false);
              }}
            >
              {copiedEmbedCode ? (
                <IoMdCheckmark fontSize="1.2rem" />
              ) : (
                <FiCode fontSize="1.2rem" />
              )}
              <Text ml="0.5rem">Copy embed code</Text>
            </Button>
          </Tooltip>
        </HStack>
      ) : null}
    </VStack>
  );
}
