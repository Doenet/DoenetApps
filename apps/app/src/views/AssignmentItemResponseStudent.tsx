import { useEffect, useState } from "react";
import { DoenetViewer } from "@doenet/doenetml-iframe";

import {
  Box,
  Tooltip,
  Flex,
  Select,
  useDisclosure,
  Grid,
  GridItem,
  Spacer,
  Checkbox,
} from "@chakra-ui/react";
import { useNavigate, useLocation } from "react-router";
import { createNameNoTag } from "../utils/names";
import {
  AssignmentMode,
  ContentType,
  UserInfo,
  DoenetmlVersion,
} from "../types";
import { clearQueryParameter } from "../utils/explore";
import { AnswerResponseDrawer } from "../drawers/AnswerResponseDrawer";

export function AssignmentItemResponseStudent({
  assignment,
  mode,
  user,
  requestedItemNumber,
  itemNames,
  shuffledOrder,
  allStudents,
  itemAttemptState,
  attemptScores,
  itemScores,
  attemptNumber,
  responseCounts,
  doenetML,
  doenetmlVersion,
  requestScrollTo,
}: {
  assignment: {
    name: string;
    type: ContentType;
    contentId: string;
    shuffledOrder: boolean;
  };
  mode: AssignmentMode;
  user: UserInfo;
  requestedItemNumber: number;
  itemNames: string[];
  shuffledOrder: boolean;
  allStudents: {
    userId: string;
    firstNames: string | null;
    lastNames: string;
  }[];
  itemAttemptState: {
    state: string | null;
    score: number;
    variant: number;
    itemNumber?: number;
    shuffledItemNumber?: number;
  };
  attemptScores: { attemptNumber: number; score: number }[];
  itemScores: { itemNumber: number; score: number }[];
  attemptNumber: number;
  responseCounts: Record<string, number>;
  doenetML: string;
  doenetmlVersion: DoenetmlVersion;
  requestScrollTo: (_offset: number) => void;
}) {
  useEffect(() => {
    document.title = `${assignment?.name} - Doenet`;
  }, [assignment?.name]);

  const { search } = useLocation();
  const navigate = useNavigate();

  const [responseAnswerId, setResponseAnswerId] = useState<string | null>(null);

  const {
    isOpen: answerResponsesAreOpen,
    onOpen: answerResponsesOnOpen,
    onClose: answerResponsesOnClose,
  } = useDisclosure();

  useEffect(() => {
    const messageListener = async function (event: any) {
      if (event.data.subject == "SPLICE.getState") {
        if (itemAttemptState.state) {
          const state = JSON.parse(itemAttemptState.state);
          window.postMessage({
            subject: "SPLICE.getState.response",
            message_id: event.data.message_id,
            state,
          });
        } else {
          window.postMessage({
            subject: "SPLICE.getState.response",
            message_id: event.data.message_id,
            error: {
              code: 1,
              message: "Server error loading page state.",
            },
          });
        }
      } else if (event.data.subject === "requestAnswerResponses") {
        if (typeof event.data.answerId === "string") {
          setResponseAnswerId(event.data.answerId);
          answerResponsesOnOpen();
        }
      }
    };

    addEventListener("message", messageListener);

    return () => {
      removeEventListener("message", messageListener);
    };
  }, [user.userId, itemAttemptState, attemptNumber, answerResponsesOnOpen]);

  const [contentAttemptNumber, itemAttemptNumber] =
    assignment.type === "singleDoc"
      ? [attemptNumber, null]
      : mode === "formative"
        ? [1, attemptNumber]
        : [attemptNumber, 1];

  const answerResponseDrawer =
    typeof responseAnswerId === "string" ? (
      <AnswerResponseDrawer
        isOpen={answerResponsesAreOpen}
        onClose={answerResponsesOnClose}
        itemName={
          itemAttemptState.itemNumber
            ? itemNames[requestedItemNumber - 1]
            : null
        }
        assignment={assignment}
        student={user}
        answerId={responseAnswerId}
        itemNumber={requestedItemNumber}
        shuffledOrder={shuffledOrder}
        contentAttemptNumber={contentAttemptNumber}
        itemAttemptNumber={itemAttemptNumber}
      />
    ) : null;

  const baseUrl = window.location.protocol + "//" + window.location.host;
  const doenetViewerUrl = `${baseUrl}/activityViewer`;

  const viewer = (
    <DoenetViewer
      doenetML={doenetML}
      key={`${user.userId}|${itemAttemptState.itemNumber ?? ""}|${attemptNumber}`}
      doenetmlVersion={doenetmlVersion.fullVersion}
      requestedVariantIndex={itemAttemptState.variant}
      flags={{
        showCorrectness: true,
        solutionDisplayMode: "button",
        showFeedback: true,
        showHints: true,
        autoSubmit: false,
        readOnly: true,
        allowLoadState: true,
        allowSaveState: false,
        allowLocalState: false,
        allowSaveEvents: false,
      }}
      forceDisable={true}
      //   forceShowCorrectness={true}
      forceShowSolution={true}
      forceUnsuppressCheckwork={true}
      doenetViewerUrl={doenetViewerUrl}
      showAnswerResponseButton={true}
      answerResponseCounts={responseCounts}
      requestScrollTo={requestScrollTo}
    />
  );

  const itemSelect = (
    <Flex alignItems="center" marginLeft="10px">
      <label htmlFor="item-select" style={{ fontSize: "large" }}>
        Item:
      </label>{" "}
      <Select
        maxWidth="350px"
        marginLeft="5px"
        id="item-select"
        size="lg"
        value={
          shuffledOrder
            ? itemAttemptState.shuffledItemNumber
            : (itemAttemptState.itemNumber ?? 1)
        }
        data-test="Item Select"
        onChange={(e) => {
          let newSearch = clearQueryParameter(
            "itemNumber",
            clearQueryParameter("attemptNumber", search),
          );
          if (newSearch === "") {
            newSearch = "?";
          } else {
            newSearch += "&";
          }
          newSearch += `itemNumber=${e.target.value}`;
          navigate(`.${newSearch}`, { replace: true });
        }}
      >
        {itemNames.map((name, i) => (
          <option value={i + 1} key={i}>
            {i + 1} (score: {Math.round(itemScores[i].score * 1000) / 10}):{" "}
            {name}
          </option>
        ))}
      </Select>
    </Flex>
  );

  return (
    <>
      {answerResponseDrawer}

      <Box marginLeft="10px" marginTop="10px" marginRight="20px">
        <Flex alignItems="center" marginTop="20px" justifyContent="center">
          {allStudents.length > 0 ? (
            <Flex alignItems="center" marginLeft="10px">
              <label htmlFor="student-select" style={{ fontSize: "large" }}>
                Student:
              </label>{" "}
              <Select
                maxWidth="350px"
                marginLeft="5px"
                id="student-select"
                data-test="Student Select"
                size="lg"
                value={user.userId}
                onChange={(e) => {
                  const newSearch = clearQueryParameter(
                    "attemptNumber",
                    search,
                  );
                  navigate(`../${e.target.value}${newSearch}`, {
                    replace: true,
                    relative: "path",
                  });
                }}
              >
                {allStudents.map((user) => (
                  <option value={user.userId} key={user.userId}>
                    {createNameNoTag(user)}
                  </option>
                ))}
              </Select>
            </Flex>
          ) : null}
          {assignment.type !== "singleDoc" && mode === "formative"
            ? itemSelect
            : null}
          <Flex alignItems="center" marginLeft="10px">
            <label htmlFor="attempt-select" style={{ fontSize: "large" }}>
              Attempt:
            </label>{" "}
            <Select
              maxWidth="350px"
              marginLeft="5px"
              id="attempt-select"
              data-test="Attempt Select"
              size="lg"
              value={attemptNumber}
              onChange={(e) => {
                let newSearch = clearQueryParameter("attemptNumber", search);
                if (newSearch === "") {
                  newSearch = "?";
                } else {
                  newSearch += "&";
                }
                newSearch += `attemptNumber=${e.target.value}`;
                navigate(`.${newSearch}`, { replace: true });
              }}
            >
              {attemptScores.map((attempt) => (
                <option
                  value={attempt.attemptNumber}
                  key={attempt.attemptNumber}
                >
                  {attempt.attemptNumber} (score:{" "}
                  {Math.round(attempt.score * 1000) / 10})
                </option>
              ))}
            </Select>
          </Flex>
          {assignment.type !== "singleDoc" && mode === "summative"
            ? itemSelect
            : null}
        </Flex>

        {assignment.shuffledOrder && assignment.type !== "singleDoc" ? (
          <Flex marginLeft="10px" marginTop="10px" alignItems="center">
            <Box>Original item number: {itemAttemptState.itemNumber}</Box>
            <Box marginLeft="10px">
              Student&apos;s item number:{" "}
              {itemAttemptState.shuffledItemNumber}{" "}
            </Box>
            <Spacer />

            <Flex>
              <Tooltip
                label="Display items in the shuffled order seen by the student"
                openDelay={500}
                placement="bottom-end"
              >
                <label htmlFor="shuffle-checkbox">
                  Display in student order
                </label>
              </Tooltip>{" "}
              <Checkbox
                id="shuffle-checkbox"
                marginLeft="5px"
                isChecked={shuffledOrder}
                onChange={() => {
                  let newSearch = clearQueryParameter(
                    "shuffledOrder",
                    clearQueryParameter("attemptNumber", search),
                  );
                  if (!shuffledOrder) {
                    if (newSearch === "") {
                      newSearch = "?";
                    } else {
                      newSearch += "&";
                    }
                    newSearch += `shuffledOrder`;
                  }
                  navigate(`.${newSearch}`, { replace: true });
                }}
              />
            </Flex>
          </Flex>
        ) : null}
      </Box>

      <Box marginTop="10px" borderTop="1px" borderColor="doenet.mediumGray">
        <Grid
          width="100%"
          background="doenet.lightBlue"
          templateAreas={`"leftGutter viewer rightGutter"`}
          templateColumns={`1fr minmax(340px,850px) 1fr`}
          overflow="hidden"
        >
          <GridItem
            area="leftGutter"
            background="doenet.lightBlue"
            width="100%"
            paddingTop="10px"
            alignSelf="start"
          />
          <GridItem
            area="rightGutter"
            background="doenet.lightBlue"
            width="100%"
            paddingTop="10px"
            alignSelf="start"
          />
          <GridItem
            area="viewer"
            width="100%"
            placeSelf="center"
            maxWidth="850px"
            overflow="hidden"
          >
            <Box
              minHeight="calc(100vh - 80px)"
              background="var(--canvas)"
              borderWidth="1px"
              borderStyle="solid"
              borderColor="doenet.mediumGray"
              padding="20px 5px 50vh 5px"
              flexGrow={1}
              w="100%"
              id="viewer-container"
            >
              {viewer}
            </Box>
          </GridItem>
        </Grid>
      </Box>
    </>
  );
}
