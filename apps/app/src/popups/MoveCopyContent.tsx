import { ReactElement, RefObject, useEffect, useRef, useState } from "react";
import {
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  SimpleGrid,
  Heading,
  IconButton,
  HStack,
  useDisclosure,
  Icon,
  Tooltip,
} from "@chakra-ui/react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { FetcherWithComponents } from "react-router";
import MoveToSharedAlert from "./MoveToSharedAlert";
import { ContentType, UserInfo } from "../types";
import { contentTypeToName, getIconInfo } from "../utils/activity";
import { editorUrl } from "../utils/url";

type ActiveView = {
  // If parent is null, the active view is the root
  // If parent.parent is null, then the parent of active view is the root
  parent: {
    id: string;
    name: string;
    type: ContentType;
    isPublic: boolean;
    sharedWith: string[];
    parent: {
      id: string;
      type: ContentType;
    } | null;
  } | null;
  contents: {
    type: ContentType;
    canOpen: boolean;
    isAssignment: boolean;
    name: string;
    contentId: string;
  }[];
};

export function MoveCopyContent({
  isOpen,
  onClose,
  sourceContent,
  userId,
  currentParentId,
  finalFocusRef,
  allowedParentTypes,
  action,
  inCurationLibrary = false,
  createAssignment = false,
  createAssignmentCallback = () => {},
  fetcher,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  sourceContent: {
    contentId: string;
    name: string;
    type: ContentType;
    isPublic?: boolean;
    isShared?: boolean;
    sharedWith?: UserInfo[];
  }[];
  userId: string;
  currentParentId: string | null;
  finalFocusRef?: RefObject<HTMLElement | null>;
  allowedParentTypes: ContentType[];
  action: "Move" | "Add" | "Copy";
  inCurationLibrary?: boolean;
  createAssignment?: boolean;
  createAssignmentCallback?: (parentId: string | null) => void;
  fetcher: FetcherWithComponents<any>;
  onNavigate: (url: string) => void;
}) {
  // Set when the modal opens
  const [parentId, setParentId] = useState<string | null>(null);
  const [contentName, setContentName] = useState<string>("");

  const [actionFinished, setActionFinished] = useState(false);
  const [numItems, setNumItems] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const actionPastWord =
    action === "Add" ? "added" : action === "Move" ? "moved" : "copied";

  const {
    isOpen: sharedAlertIsOpen,
    onOpen: sharedAlertOnOpen,
    onClose: sharedAlertOnClose,
  } = useDisclosure();

  useEffect(() => {
    if (isOpen) {
      updateActiveView(currentParentId, true);
    }
    setActionFinished(false);
    setErrMsg("");
    // TODO: proper way to have functions and hooks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentParentId]);

  // Set whenever the user navigates to another parent
  const [activeView, setActiveView] = useState<ActiveView>({
    parent: null,
    contents: [],
  });

  async function updateActiveView(
    newActiveParentId: string | null,
    modalJustOpened: boolean = false,
  ) {
    let allowedTypesAsString = allowedParentTypes.reduce(
      (result, val) => `${result},${val}`,
      "",
    );
    allowedTypesAsString = allowedTypesAsString.substring(1);
    const { data } = (await axios.get(
      `/api/copyMove/getMoveCopyContentData/${newActiveParentId ?? ""}?allowedParentTypes=${allowedTypesAsString}${inCurationLibrary ? "&inCurationLibrary=true" : ""}`,
    )) as { data: ActiveView };
    setActiveView(data);

    if (modalJustOpened) {
      if (sourceContent.length === 1) {
        setContentName(sourceContent[0].name);
      } else {
        setContentName(`${sourceContent.length} items`);
      }
      setParentId(currentParentId);
    }
  }

  const initialRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (fetcher.data && fetcher.data.status === 200) {
      setActionFinished(true);
      if (action === "Move") {
        setNumItems(1);
      } else {
        const numItems: number = fetcher.data.data.newContentIds.length;
        setNumItems(numItems);
      }
    } else if (fetcher.data && fetcher.data.success === false) {
      setErrMsg(fetcher.data.message);
    }
  }, [fetcher.data, action]);

  const optionList = (
    <SimpleGrid columns={1} spacing={0}>
      {activeView.contents.length === 0 ? (
        <Text as="i" data-test="Empty Message">
          This item is empty.
        </Text>
      ) : (
        activeView.contents.map((content) => {
          const { iconImage, iconColor } = getIconInfo(
            content.type,
            content.isAssignment,
          );
          const icon = (
            <Icon
              as={iconImage}
              color={iconColor}
              aria-label={contentTypeToName[content.type]}
            />
          );

          return (
            <Button
              data-test="Select Item Option"
              key={`moveContentItem${content.contentId}`}
              variant="outline"
              width="500px"
              height="2em"
              leftIcon={icon}
              onClick={() => {
                if (
                  content.type !== "singleDoc" &&
                  sourceContent.every((c) => c.contentId !== content.contentId)
                )
                  updateActiveView(content.contentId);
              }}
              isDisabled={
                sourceContent.some((c) => c.contentId === content.contentId) ||
                !content.canOpen
              }
            >
              <Text width="100%" textAlign="left" noOfLines={1}>
                {content.name}
              </Text>
            </Button>
          );
        })
      )}
    </SimpleGrid>
  );

  let shareAlert = false;
  if (action === "Move") {
    // Sometimes moving content to a different folder means that the visibility of that content
    // will change. When this is going to happen, we alert users with a popup.
    // There are two cases where this can happen:
    // 1. Destination folder is public, but at least some source content is private
    // 2. Destination folder is shared with someone, but at least some of the source content is not
    //    shared with that person
    //    (Please note that this also means the offending piece of source content is private, since if
    //     it were public, it would be implicitly shared with everyone)
    // In the following code, we check for either of those two cases.

    if (activeView.parent?.isPublic) {
      shareAlert = !sourceContent.every((c) => c.isPublic);
    } else if (activeView.parent?.sharedWith) {
      const privateSources = sourceContent.filter((c) => !c.isPublic);
      const sourceSharedWith = privateSources.flatMap(
        (c) => c.sharedWith?.map((user) => user.userId) ?? [],
      );
      const count = new Map<string, number>();
      for (userId of sourceSharedWith) {
        count.set(userId, (count.get(userId) || 0) + 1);
      }
      // If the count of that userId is the same as the length of private sources,
      // that means each private source was shared with that userId
      shareAlert = !activeView.parent.sharedWith.every(
        (user) => count.get(user) === privateSources.length,
      );
    }
  }

  let actionIsDisabled =
    (activeView.parent === null && parentId === null) ||
    (activeView.parent !== null &&
      parentId !== null &&
      activeView.parent.id === parentId) ||
    !allowedParentTypes.includes(activeView.parent?.type ?? "folder");

  if (createAssignment) {
    actionIsDisabled = !allowedParentTypes.includes(
      activeView.parent?.type ?? "folder",
    );
  }

  const actionTextPart1 = createAssignment ? "Create in " : `${action} to `;
  const actionTextPart2 =
    activeView.parent?.name ??
    (inCurationLibrary ? "Library Activities" : "My Activities");

  const executeButtons = (
    <>
      <Button
        ref={initialRef}
        mr={3}
        onClick={onClose}
        data-test="Cancel Button"
      >
        Cancel
      </Button>
      <Button
        data-test="Execute MoveCopy Button"
        width="10em"
        // Is disabled if the content is already in this parent
        isDisabled={actionIsDisabled}
        onClick={() => {
          if (shareAlert) {
            // moving non-public content into a public parent
            // or moving moving content into a parent that is shared with additional users
            sharedAlertOnOpen();
          } else {
            if (createAssignment) {
              createAssignmentCallback(activeView.parent?.id ?? null);
            } else {
              performAction();
            }
          }
        }}
      >
        <Tooltip label={`${actionTextPart1}${actionTextPart2}`}>
          <Text noOfLines={1}>
            {actionTextPart1}
            <em>{actionTextPart2}</em>
          </Text>
        </Tooltip>
      </Button>
    </>
  );

  let destinationDescription: ReactElement<any>;
  let destinationAction: string;
  let destinationUrl: string;

  if (activeView.parent) {
    const typeName = contentTypeToName[activeView.parent.type].toLowerCase();
    destinationDescription = (
      <>
        <strong>{activeView.parent.name}</strong>
      </>
    );
    if (activeView.parent.type === "folder") {
      destinationAction = "Go to folder";

      if (inCurationLibrary) {
        destinationUrl = `/libraryActivities/${activeView.parent.id}`;
      } else {
        destinationUrl = `/activities/${userId}/${activeView.parent.id}`;
      }
    } else if (
      activeView.parent.type === "select" &&
      activeView.parent.parent?.type === "sequence"
    ) {
      // if we have a Question Bank whose parent is a Problem Set,
      // then we don't display the Question Bank by itself, just embedded in the Problem Set
      destinationAction = `Open containing problem set`;
      destinationUrl = editorUrl(
        activeView.parent.parent.id,
        activeView.parent.parent.type,
      );
    } else {
      destinationAction = `Open ${typeName}`;
      destinationUrl = editorUrl(activeView.parent.id, activeView.parent.type);
    }
  } else if (inCurationLibrary) {
    destinationDescription = <>Library Activities</>;
    destinationAction = "Go to Library Activities";
    destinationUrl = `/libraryActivities`;
  } else {
    destinationDescription = <>My Activities</>;
    destinationAction = "Go to My Activities";
    destinationUrl = `/activities/${userId}`;
  }

  let heading1 = "";
  if (createAssignment) {
    heading1 = `Create assignment in folder`;
  } else {
    heading1 = `${action}${" "}
              ${
                allowedParentTypes.length === 1
                  ? `to ${contentTypeToName[allowedParentTypes[0]].toLowerCase()}`
                  : ""
              }`;
  }

  return (
    <>
      <MoveToSharedAlert
        isOpen={sharedAlertIsOpen}
        onClose={sharedAlertOnClose}
        performMove={performAction}
        parentName={activeView.parent?.name ?? null}
      />
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        initialFocusRef={initialRef}
        finalFocusRef={finalFocusRef}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Heading textAlign="center" data-test="MoveCopy Heading 1">
              {heading1}
            </Heading>
            <Heading
              size="me"
              textAlign="center"
              data-test="MoveCopy Heading 2"
            >
              <em>{contentName}</em>
            </Heading>
            <HStack hidden={actionFinished || errMsg !== ""}>
              {activeView.parent ? (
                <>
                  <IconButton
                    data-test="Back Arrow"
                    icon={<ArrowBackIcon />}
                    aria-label="Back"
                    onClick={() =>
                      updateActiveView(activeView.parent?.parent?.id ?? null)
                    }
                  />
                  <Text noOfLines={1} data-test="Current destination">
                    {activeView.parent.name}
                  </Text>
                </>
              ) : (
                <Text data-test="Current destination">
                  {inCurationLibrary ? "Library Activities" : "My Activities"}
                </Text>
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody data-test="MoveCopy Body">
            {errMsg ? (
              errMsg
            ) : actionFinished ? (
              <>
                {`${numItems} item${numItems > 1 ? "s" : ""}`} {actionPastWord}{" "}
                to: {destinationDescription}
              </>
            ) : (
              optionList
            )}
          </ModalBody>

          <ModalFooter>
            {errMsg ? (
              <Button ref={initialRef} mr={3} onClick={onClose}>
                Close
              </Button>
            ) : actionFinished ? (
              <>
                <Button
                  data-test="Go to Destination"
                  marginRight="4px"
                  onClick={() => {
                    onClose();
                    onNavigate(destinationUrl);
                  }}
                >
                  {destinationAction}
                </Button>
                <Button
                  ref={initialRef}
                  mr={3}
                  onClick={onClose}
                  data-test="Close Button"
                >
                  Close
                </Button>
              </>
            ) : (
              executeButtons
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );

  function performAction() {
    const contentIds = sourceContent.map((sc) => sc.contentId);
    const parentId = activeView.parent?.id ?? null;

    if (action === "Move") {
      if (contentIds.length === 1) {
        fetcher.submit(
          {
            path: `copyMove/moveContent`,
            contentId: contentIds[0],
            changeParentIdTo: parentId,
            desiredPosition: activeView.contents.length, // place it as the last item
          },
          { method: "post", encType: "application/json" },
        );
      } else {
        throw Error("Have not implemented moving more than one content");
      }
    } else if (action === "Copy" || action === "Add") {
      fetcher.submit(
        {
          path: "copyMove/copyContent",
          contentIds,
          parentId,
        },
        { method: "post", encType: "application/json" },
      );
    } else {
      throw Error("Action not implemented in `MoveCopyContent`");
    }
  }
}
