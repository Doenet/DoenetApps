import { RefObject, useEffect, useRef, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  HStack,
  Text,
  Spinner,
  Input,
  Box,
  Flex,
  FormLabel,
} from "@chakra-ui/react";
import { FetcherWithComponents, NavigateFunction } from "react-router";
import { ContentType, UserInfo } from "../types";
import { contentTypeToName } from "../utils/activity";
import { editorUrl } from "../utils/url";

/**
 * A modal that immediately creates a new item in Activities and copies source content into that item
 *
 * When the copy is finished, the modal allows the user to close it or navigate to the new item.
 */
export function CreateContentAndPromptName({
  isOpen,
  onClose,
  finalFocusRef,
  contentIds,
  desiredType,
  user,
  navigate,
  createFetcher,
  saveNameFetcher,
}: {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
  contentIds: string[];
  desiredType: ContentType;
  user: UserInfo | null;
  navigate: NavigateFunction;
  createFetcher: FetcherWithComponents<any>;
  saveNameFetcher: FetcherWithComponents<any>;
}) {
  const [errMsg, setErrMsg] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const [newActivityData, setNewActivityData] = useState<{
    newChildContentIds: string[];
    newContentId: string;
    newContentName: string;
  } | null>(null);

  function saveName(newName: string) {
    const trimmed = newName.trim();
    const finalName = trimmed === "" ? "Untitled" : trimmed;

    if (trimmed === "" && nameRef.current) {
      nameRef.current.value = finalName;
    }

    if (newActivityData) {
      saveNameFetcher.submit(
        {
          path: "updateContent/updateContentSettings",
          name: finalName,
          contentId: newActivityData.newContentId,
        },
        { method: "post", encType: "application/json" },
      );
    }
  }

  // Create the content when this modal opens
  // Only once - don't create if fetcher already has data
  useEffect(() => {
    if (isOpen && createFetcher.state === "idle" && !createFetcher.data) {
      document.body.style.cursor = "wait";
      createFetcher.submit(
        {
          path: "copyMove/createContentCopyInChildren",
          childSourceContentIds: contentIds,
          contentType: desiredType,
          parentId: null,
        },
        { method: "post", encType: "application/json" },
      );
    }
  }, [
    isOpen,
    createFetcher.state,
    createFetcher.data,
    contentIds,
    desiredType,
    createFetcher,
  ]);

  useEffect(() => {
    if (newActivityData === null && createFetcher.data) {
      if (createFetcher.data.status === 200) {
        setNewActivityData(createFetcher.data.data);
      } else {
        setErrMsg(`An error occurred while creating content.`);
      }
      document.body.style.cursor = "default";
    }
  }, [createFetcher.data, newActivityData]);

  useEffect(() => {
    if (saveNameFetcher.data && saveNameFetcher.data.status !== 200) {
      setErrMsg("An error occurred while saving the name.");
    }
  }, [saveNameFetcher.data]);

  useEffect(() => {
    nameRef.current?.select();
  }, [newActivityData]);

  let destinationAction: string;
  let destinationUrl: string;

  const typeName = contentTypeToName[desiredType].toLowerCase();
  const typeNameInitialCapital =
    typeName[0].toUpperCase() + typeName.substring(1);

  if (desiredType === "folder") {
    destinationAction = "Go to folder";
    destinationUrl = `/activities/${user?.userId}/${newActivityData?.newContentId}`;
  } else {
    destinationAction = `Open ${typeName}`;
    destinationUrl = newActivityData
      ? editorUrl(newActivityData.newContentId, desiredType)
      : "";
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size="md"
      closeOnOverlayClick={newActivityData !== null}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">
          {newActivityData === null ? "Creating" : `Create finished`}
        </ModalHeader>
        {newActivityData !== null ? <ModalCloseButton /> : null}
        <ModalBody>
          {errMsg === "" ? (
            newActivityData === null ? (
              <HStack>
                <Text>Creating...</Text>
                <Spinner />
              </HStack>
            ) : (
              <>
                <Flex flexDirection="column">
                  <Box data-test="Created Statement">
                    {typeNameInitialCapital} created with{" "}
                    {newActivityData.newChildContentIds.length} item
                    {newActivityData.newChildContentIds.length > 1 ? "s" : ""}
                  </Box>
                  <Flex marginTop="10px">
                    <FormLabel htmlFor="created-content-name">Name:</FormLabel>
                    <Input
                      id="created-content-name"
                      ref={nameRef}
                      marginLeft="10px"
                      maxLength={191}
                      name="name"
                      size="sm"
                      width="100%"
                      defaultValue={newActivityData.newContentName}
                      data-test="Created Name"
                      onBlur={(e) => {
                        saveName(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key == "Enter") {
                          saveName((e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                  </Flex>
                </Flex>
              </>
            )
          ) : (
            <>{errMsg}</>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            data-test="Go to Created"
            marginRight="4px"
            onClick={() => {
              onClose();
              navigate(destinationUrl);
            }}
            isDisabled={newActivityData === null && errMsg === ""}
          >
            {destinationAction}
          </Button>
          <Button
            data-test="Close Button"
            onClick={() => {
              onClose();
            }}
            isDisabled={newActivityData === null && errMsg === ""}
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
