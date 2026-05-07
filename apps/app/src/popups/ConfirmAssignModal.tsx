import {
  Heading,
  Modal,
  ModalOverlay,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalContent,
  Box,
  FormControl,
  Input,
  Radio,
  RadioGroup,
  Stack,
  HStack,
  Button,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";
import { contentTypeToName } from "../utils/activity";
import { EditAssignmentSettings } from "../widgets/editor/EditAssignmentSettings";
import { ContentDescription, AssignmentMode } from "../types";
import { FetcherWithComponents } from "react-router";
import { DateTime } from "luxon";
import { MoveCopyContent } from "./MoveCopyContent";

/**
 * A modal that appears when you open an assignment.
 * Allows last-minute changes of assignment settings before confirming.
 */
export function ConfirmAssignModal({
  contentDescription,
  isOpen,
  userId,
  onClose,
  fetcher,
  onNavigate,
  maxAttempts,
  individualizeByStudent,
  mode,
  maxAttemptsFetcher,
  variantFetcher,
  modeFetcher,
  assignmentFetcher,
}: {
  contentDescription: ContentDescription;
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  fetcher: FetcherWithComponents<any>;
  onNavigate: (url: string) => void;
  maxAttempts?: number | null;
  individualizeByStudent?: boolean;
  mode?: AssignmentMode | null;
  maxAttemptsFetcher: FetcherWithComponents<any>;
  variantFetcher: FetcherWithComponents<any>;
  modeFetcher: FetcherWithComponents<any>;
  assignmentFetcher: FetcherWithComponents<any>;
}) {
  const { contentId, type: contentType } = contentDescription;

  const [duration, setDuration] = useState(JSON.stringify({ hours: 48 }));
  const [customClosedOn, setCustomClosedOn] = useState(
    DateTime.fromSeconds(Math.round(DateTime.now().toSeconds() / 60) * 60)
      .plus({ weeks: 2 })
      .toISO({
        includeOffset: false,
        suppressSeconds: true,
        suppressMilliseconds: true,
      }),
  );

  const {
    isOpen: moveCopyContentIsOpen,
    onOpen: moveCopyContentOnOpen,
    onClose: moveCopyContentOnClose,
  } = useDisclosure();

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        scrollBehavior="inside"
        size="2xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">
              Create assignment from{" "}
              {contentTypeToName[contentType].toLocaleLowerCase()}
            </Heading>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Heading size="sm">Review your assignment settings</Heading>
            {maxAttempts !== undefined &&
            maxAttempts !== null &&
            individualizeByStudent !== undefined &&
            mode !== undefined &&
            mode !== null ? (
              <EditAssignmentSettings
                contentId={contentId}
                maxAttempts={maxAttempts}
                individualizeByStudent={individualizeByStudent}
                mode={mode}
                includeMode={contentType !== "singleDoc"}
                maxAttemptsFetcher={maxAttemptsFetcher}
                variantFetcher={variantFetcher}
                modeFetcher={modeFetcher}
              />
            ) : (
              <p>Loading...</p>
            )}

            <Heading mt="2rem" size="sm">
              How long would you like this assignment to remain open?
            </Heading>

            <RadioGroup onChange={setDuration} value={duration} mt="1rem">
              <Stack direction="column">
                <Radio value={JSON.stringify({ hours: 48 })}>48 Hours</Radio>
                <Radio value={JSON.stringify({ weeks: 2 })}>2 Weeks</Radio>
                <Radio value={JSON.stringify({ years: 1 })}>1 Year</Radio>
                <HStack spacing={2}>
                  <Radio value={"custom"}>Custom</Radio>
                  <Box>
                    <FormControl isDisabled={duration !== "custom"}>
                      <Input
                        aria-label="Custom close time"
                        zIndex="overlay"
                        type="datetime-local"
                        size="sm"
                        step="60"
                        width="220px"
                        value={
                          customClosedOn
                            ? customClosedOn
                            : (DateTime.fromSeconds(
                                Math.round(DateTime.now().toSeconds() / 60) *
                                  60,
                              )
                                .plus({ weeks: 2 })
                                .toISO({
                                  includeOffset: false,
                                  suppressSeconds: true,
                                  suppressMilliseconds: true,
                                }) ?? DateTime.now().toISO())
                        }
                        onChange={(e) => {
                          setCustomClosedOn(e.target.value);
                        }}
                      />
                    </FormControl>
                  </Box>
                </HStack>
              </Stack>
            </RadioGroup>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => {
                onClose();
                moveCopyContentOnOpen();
              }}
              data-test="Confirm Create Assignment"
            >
              Create assignment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <MoveCopyContent
        isOpen={moveCopyContentIsOpen}
        onClose={moveCopyContentOnClose}
        fetcher={fetcher}
        onNavigate={onNavigate}
        sourceContent={[contentDescription]}
        userId={userId}
        currentParentId={contentDescription.parent?.contentId ?? null}
        // finalFocusRef={finalFocusRef}
        allowedParentTypes={["folder"]}
        action={"Copy"}
        createAssignment={true}
        createAssignmentCallback={(parentId) => {
          const closedOnDateTime: DateTime =
            duration === "custom"
              ? customClosedOn
                ? DateTime.fromISO(customClosedOn).set({
                    second: 0,
                    millisecond: 0,
                  })
                : DateTime.now()
              : DateTime.now()
                  .set({ second: 0, millisecond: 0 })
                  .plus(JSON.parse(duration));

          const closedOn = closedOnDateTime.toUTC().toISO({
            precision: "minutes",
          });

          assignmentFetcher.submit(
            {
              path: "assign/createAssignment",
              contentId,
              closedOn,
              destinationParentId: parentId,
            },
            { method: "post", encType: "application/json" },
          );

          moveCopyContentOnClose();
        }}
      />
    </>
  );
}
