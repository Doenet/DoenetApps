import { RefObject, useEffect, useRef, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  HStack,
  Spinner,
  Input,
} from "@chakra-ui/react";
import { FetcherWithComponents } from "react-router";
import { ContentType } from "../types";
import { contentTypeToName } from "../utils/activity";

/**
 * A modal designed for creating content locally, i.e., in the current folder.
 * Prompts for the name before creating. Simply closes after the creation.
 */
export function CreateLocalContent({
  isOpen,
  onClose,
  finalFocusRef,
  contentType,
  parentId,
  fetcher,
  inCurationLibrary = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
  contentType: ContentType;
  parentId: string | null;
  fetcher: FetcherWithComponents<any>;
  inCurationLibrary?: boolean;
}) {
  const [submitted, setSubmitted] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [contentName, setContentName] = useState(
    `Untitled ${contentTypeToName[contentType]}`,
  );

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.cursor = "default";
      setContentName(`Untitled ${contentTypeToName[contentType]}`);
      setSubmitted(false);
    }
  }, [contentType, isOpen]);

  useEffect(() => {
    if (fetcher.data?.contentCreated) {
      document.body.style.cursor = "default";
      onClose();
    } else if (fetcher.data?.errorCreatingContent) {
      document.body.style.cursor = "default";
      setErrMsg(fetcher.data.errorCreatingContent);
    }
  }, [fetcher.data, onClose]);

  function createContent() {
    if (inCurationLibrary) {
      // Content type should only ever be `folder`
      // We can't create other types in the library, just remix them
      fetcher.submit(
        {
          path: "curate/createCurationFolder",
          name: contentName,
          contentType,
          parentId,
        },
        { method: "post", encType: "application/json" },
      );
    } else {
      fetcher.submit(
        {
          path: "updateContent/createContent",
          name: contentName,
          contentType,
          parentId,
        },
        { method: "post", encType: "application/json" },
      );
    }
    setSubmitted(true);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      initialFocusRef={inputRef}
      size="md"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">
          New {contentTypeToName[contentType]}
        </ModalHeader>
        <ModalBody>
          <HStack>
            <Input
              value={contentName}
              ref={inputRef}
              maxLength={191}
              data-test="New Content Input"
              aria-label={`${contentTypeToName[contentType]} Name`}
              onChange={(e) => setContentName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key == "Enter") {
                  createContent();
                }
              }}
              onFocus={(e) => e.target.select()}
              isDisabled={errMsg !== ""}
            />
            {submitted && errMsg === "" ? <Spinner /> : null}
          </HStack>
          {errMsg ? <>{errMsg}</> : null}
        </ModalBody>

        <ModalFooter>
          <Button
            data-test="Create Content"
            marginRight="4px"
            onClick={() => {
              createContent();
            }}
            isDisabled={errMsg !== ""}
          >
            Create
          </Button>
          <Button
            data-test="Cancel Button"
            onClick={() => {
              // set submitted true so input select will be triggered on next open
              setSubmitted(true);
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
