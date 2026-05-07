import { RefObject } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Box,
  ModalCloseButton,
} from "@chakra-ui/react";
import { FetcherWithComponents } from "react-router";
import { ContentDescription } from "../types";
import { contentTypeToName } from "../utils/activity";

export function DeleteContent({
  isOpen,
  onClose,
  finalFocusRef,
  content,
  fetcher,
}: {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
  content: ContentDescription;
  fetcher: FetcherWithComponents<any>;
}) {
  function deleteContent() {
    fetcher.submit(
      {
        path: "updateContent/deleteContent",
        contentId: content.contentId,
      },
      { method: "post", encType: "application/json" },
    );
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size="md"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">Move to trash?</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box data-test="Confirm Delete Message">
            The {contentTypeToName[content.type].toLowerCase()}{" "}
            <em>{content.name}</em> will be deleted forever after 30 days.
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button
            marginRight="4px"
            data-test="Delete Button"
            onClick={() => {
              deleteContent();
            }}
          >
            Move to trash
          </Button>
          <Button
            data-test="Cancel Button"
            onClick={() => {
              onClose();
            }}
          >
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
