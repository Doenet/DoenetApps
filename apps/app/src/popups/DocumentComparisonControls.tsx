import {
  Box,
  Button,
  Flex,
  Icon,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ReactElement, RefObject, useEffect, useRef, useState } from "react";
import { FetcherWithComponents } from "react-router";
import { DoenetmlVersion, UserInfo } from "../types";
import axios from "axios";
import { createNameNoTag } from "../utils/names";
import { MdError } from "react-icons/md";
import { contentTypeToName, getIconInfo } from "../utils/activity";

export async function documentComparisonControlsActions({
  formObj,
}: {
  [k: string]: any;
}) {
  if (formObj?._action === "update to") {
    try {
      if (formObj.compareRelation === "source") {
        const { data } = await axios.post(
          "/api/remix/updateRemixedContentToOrigin",
          {
            remixContentId: formObj.contentId,
            originContentId: formObj.compareId,
            onlyMarkUnchanged: formObj.ignore === "true",
          },
        );
        return data;
      } else {
        const { data } = await axios.post(
          "/api/remix/updateOriginContentToRemix",
          {
            originContentId: formObj.contentId,
            remixContentId: formObj.compareId,
            onlyMarkUnchanged: formObj.ignore === "true",
          },
        );
        return data;
      }
    } catch (_e) {
      return { updateError: true };
    }
  }

  return null;
}

export function DocumentComparisonControls({
  isOpen,
  onClose,
  activity,
  activityCompare,
  activityCompareChanged,
  activityAtCompare,
  compareRelation,
  finalFocusRef,
  fetcher,
}: {
  isOpen: boolean;
  onClose: () => void;
  activity: {
    doenetML: string;
    doenetmlVersion: DoenetmlVersion;
    name: string;
    contentId: string;
  };
  activityCompare: {
    doenetML: string;
    doenetmlVersion: DoenetmlVersion;
    name: string;
    contentId: string;
    owner: UserInfo;
  };
  activityCompareChanged: boolean;
  activityAtCompare: boolean;
  compareRelation: "source" | "remix";
  finalFocusRef?: RefObject<HTMLElement | null>;
  fetcher: FetcherWithComponents<any>;
}) {
  const [updated, setUpdated] = useState(false);
  const [encounteredError, setEncounteredError] = useState(false);
  const [statusStyleIdx, setStatusStyleIdx] = useState(0);

  const [option, setOption] = useState<"update" | "ignore" | "neither" | "">(
    "",
  );

  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof fetcher.data === "object" && fetcher.data !== null) {
      setStatusStyleIdx((x) => x + 1);
      if (fetcher.data.updated === true) {
        setStatusStyleIdx((x) => x + 1);
        setUpdated(true);
      } else if (fetcher.data.updated === false) {
        setStatusStyleIdx((x) => x + 1);
        setUpdated(true);
      } else if (fetcher.data.updateError === true) {
        setEncounteredError(true);
      }
    }
  }, [fetcher.data]);

  useEffect(() => {
    setUpdated(false);
    setEncounteredError(false);
    if (activityAtCompare) {
      setOption("ignore");
    } else {
      setOption("");
    }
  }, [activityAtCompare, isOpen]);

  let actionText;
  if (option === "update") {
    actionText = "Update activity";
  } else if (option === "ignore") {
    actionText = "Ignore changes";
  } else {
    actionText = "Open manual comparison";
  }

  const contentTypeName = contentTypeToName["singleDoc"];
  const { iconImage, iconColor } = getIconInfo("singleDoc", false);

  let updatePrompt: ReactElement<any>;
  let updateTitle: string;

  if (activityAtCompare) {
    updateTitle = "Mark changes as ignored?";
    updatePrompt = (
      <Box>
        <Text>
          Your activity, <em>{activity.name}</em>, already matches this{" "}
          {compareRelation === "source" ? "remix source" : "remixed activity"}:
        </Text>

        <Flex marginTop="20px" justifyContent="center">
          <Icon
            as={iconImage}
            color={iconColor}
            boxSizing="content-box"
            width="24px"
            height="24px"
            paddingRight="5px"
            verticalAlign="middle"
            aria-label={contentTypeName}
          />
          <Text>
            <em>{activityCompare.name},</em> by{" "}
            {createNameNoTag(activityCompare.owner)}
          </Text>
        </Flex>

        <Text marginTop="20px">
          Would you like to mark the changes to this{" "}
          {compareRelation === "source" ? "remix source" : "remixed activity"}{" "}
          as ignored?
        </Text>
      </Box>
    );
  } else if (activityCompareChanged) {
    updateTitle = `Update your activity to ${compareRelation === "source" ? "remix source" : "remixed activity"}?`;
    updatePrompt = (
      <Box>
        <Text>
          Would you like to replace the contents of your activity,{" "}
          <em>{activity.name}</em>, with this{" "}
          {compareRelation === "source" ? "remix source" : "remixed activity"}?
        </Text>

        <Flex marginTop="20px" justifyContent="center">
          <Icon
            as={iconImage}
            color={iconColor}
            boxSizing="content-box"
            width="24px"
            height="24px"
            paddingRight="5px"
            verticalAlign="middle"
            aria-label={contentTypeName}
          />
          <Text>
            <em>{activityCompare.name},</em> by{" "}
            {createNameNoTag(activityCompare.owner)}
          </Text>
        </Flex>
        <RadioGroup
          marginTop="20px"
          onChange={(val) => {
            setOption(val as "update" | "ignore" | "neither");
          }}
          value={option}
        >
          <Stack>
            <Radio value="update">Yes, update my activity to match</Radio>
            <Radio value="ignore">No, ignore changes</Radio>
            <Radio value="neither">Let me manually copy changes</Radio>
          </Stack>
        </RadioGroup>
      </Box>
    );
  } else {
    updateTitle = "Update even though no changes detected?";
    updatePrompt = (
      <Box>
        <Text>
          No changes detected for this{" "}
          {compareRelation === "source" ? "remix source" : "remixed activity"}{" "}
          (possibly because you ignored the changes):
        </Text>

        <Flex marginTop="20px" justifyContent="center">
          <Icon
            as={iconImage}
            color={iconColor}
            boxSizing="content-box"
            width="24px"
            height="24px"
            paddingRight="5px"
            verticalAlign="middle"
            aria-label={contentTypeName}
          />
          <Text>
            <em>{activityCompare.name},</em> by{" "}
            {createNameNoTag(activityCompare.owner)}
          </Text>
        </Flex>

        <Text marginTop="20px">
          However, you can still replace the contents of your activity,{" "}
          <em>{activity.name}</em>, with the above{" "}
          {compareRelation === "source" ? "remix source" : "remixed activity"}.
        </Text>

        <Text marginTop="20px">What would you like to do?</Text>
        <RadioGroup
          marginTop="20px"
          onChange={(val) => {
            setOption(val as "update" | "ignore" | "neither");
          }}
          value={option}
        >
          <Stack>
            <Radio value="update">
              Update my activity to match this{" "}
              {compareRelation === "source"
                ? "remix source"
                : "remixed activity"}{" "}
            </Radio>
            <Radio value="neither">Manually copy changes</Radio>
          </Stack>
        </RadioGroup>
      </Box>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      initialFocusRef={cancelRef}
      size="md"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">
          {updated
            ? option === "update"
              ? "Successfully updated activity"
              : "Ignored update"
            : updateTitle}
        </ModalHeader>
        <ModalBody>
          {updated ? null : updatePrompt}

          {updated || encounteredError ? (
            <Box
              data-test="Status message"
              border="solid 1px lightgray"
              borderRadius="5px"
              padding="5px 10px"
              marginTop="10px"
              backgroundColor={
                encounteredError
                  ? "red.100"
                  : ["green.100", "green.200"][statusStyleIdx % 2]
              }
            >
              {encounteredError ? (
                <Icon
                  fontSize="24pt"
                  color="red.800"
                  as={MdError}
                  verticalAlign="middle"
                  marginRight="5px"
                />
              ) : null}
              {(updated
                ? `Successfully ${option === "ignore" ? "ignored update" : "updated"} to `
                : `Error occurred attempting to ${option === "ignore" ? "ignore update" : "update"} to `) +
                (compareRelation === "source"
                  ? "remix source"
                  : "remixed activity")}
            </Box>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <Button
            marginRight="4px"
            onClick={() => {
              if (option === "update" || option === "ignore") {
                fetcher.submit(
                  {
                    _action: "update to",
                    contentId: activity.contentId,
                    compareId: activityCompare.contentId,
                    ignore: option === "ignore",
                    compareRelation,
                  },
                  { method: "post" },
                );
              } else {
                alert("Just kidding, nothing here yet!");
              }
            }}
            hidden={option === "" || updated}
          >
            {actionText}
          </Button>
          <Button
            data-test="Cancel Button"
            ref={cancelRef}
            onClick={() => {
              onClose();
            }}
          >
            {updated ? "Close" : "Cancel"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
