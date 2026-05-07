import { RefObject, useEffect, useState } from "react";
import { FetcherWithComponents } from "react-router";
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
} from "@chakra-ui/react";
import { UserInfoWithEmail, ContentDescription } from "../types";

export type CreateContentResponse = {
  status: number;
  data?: {
    contentId: string;
  };
  message?: string;
};

/**
 * A modal that immediately upon opening saves the DoenetML into an new document in Activities
 *
 * When the save is finished, the modal allows the user to close it or navigate to Activities.
 */
export function SaveDoenetmlAndReportFinish({
  isOpen,
  onClose,
  finalFocusRef,
  DoenetML,
  documentName,
  navigate,
  user,
  setAddTo,
  fetcher,
}: {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
  DoenetML: string;
  documentName: string;
  navigate: (path: string) => void;
  user: UserInfoWithEmail | undefined;
  setAddTo: (value: ContentDescription | null) => void;
  fetcher: FetcherWithComponents<CreateContentResponse>;
}) {
  const [newContentId, setNewContentId] = useState<string | null>(null);

  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.status === 200) {
        setNewContentId(fetcher.data.data!.contentId);
      } else {
        const message = fetcher.data.message;
        setErrMsg(
          `An error occurred while saving${message ? ": " + message : ""}.`,
        );
      }

      document.body.style.cursor = "default";
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (isOpen) {
      if (newContentId === null && documentName.trim() !== "") {
        document.body.style.cursor = "wait";

        fetcher.submit(
          {
            path: "updateContent/createContent",
            parentId: null,
            contentType: "singleDoc",
            doenetml: DoenetML,
            name: documentName,
          },
          { method: "post", encType: "application/json" },
        );
      } else if (documentName.trim() === "") {
        setErrMsg("Document name cannot be empty.");
      }
    } else {
      setNewContentId(null);
      setErrMsg("");
    }
    // When we included all the dependencies here, it copied content several times
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const destinationAction = "Go to My Activities";
  const destinationUrl = `/activities/${user?.userId}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size="md"
      closeOnOverlayClick={newContentId !== null}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center" data-test="Copy Header">
          {newContentId === null
            ? errMsg === ""
              ? "Saving..."
              : "An error occurred"
            : `Save finished`}
        </ModalHeader>
        {newContentId !== null ? <ModalCloseButton /> : null}
        <ModalBody data-test="Copy Body">
          {errMsg === "" ? (
            newContentId === null ? (
              <HStack>
                <Text>Saving...</Text>
                <Spinner />
              </HStack>
            ) : (
              <>
                Successfully saved to new document &ldquo;{documentName}&rdquo;
                in My Activities
              </>
            )
          ) : (
            <>{errMsg}</>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            data-test="Go to Destination"
            marginRight="4px"
            onClick={() => {
              onClose();
              setAddTo(null);
              navigate(destinationUrl);
            }}
            isDisabled={newContentId === null && errMsg === ""}
          >
            {destinationAction}
          </Button>
          <Button
            data-test="Close Button"
            onClick={() => {
              onClose();
            }}
            isDisabled={newContentId === null && errMsg === ""}
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
