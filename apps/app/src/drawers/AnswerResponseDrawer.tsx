import { ReactElement, RefObject, useEffect, useState } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import { ContentType, UserInfo } from "../types";
import axios from "axios";
import { createNameNoTag } from "../utils/names";
import { DateTime } from "luxon";
import { parseAndFormatResponse } from "../utils/responses";

export function AnswerResponseDrawer({
  isOpen,
  onClose,
  finalFocusRef,
  itemName,
  assignment,
  student,
  answerId,
  itemNumber,
  shuffledOrder,
  contentAttemptNumber,
  itemAttemptNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
  itemName: string | null;
  assignment: { name: string; type: ContentType; contentId: string };
  student: UserInfo;
  answerId: string;
  itemNumber: number;
  shuffledOrder: boolean;
  contentAttemptNumber: number;
  itemAttemptNumber: number | null;
}) {
  const [responses, setResponses] = useState<
    {
      response: ReactElement<any>;
      creditAchieved: number;
      submittedAt: string;
    }[]
  >([]);

  useEffect(() => {
    setResponses([]);
    async function getAnswerResponses() {
      const itemQuery =
        (itemNumber === null ? "" : `&requestedItemNumber=${itemNumber}`) +
        (itemAttemptNumber === null
          ? ""
          : `&itemAttemptNumber=${itemAttemptNumber}`);

      const { data } = await axios.get(
        `/api/assign/getStudentSubmittedResponses/${assignment.contentId}/${student.userId}?answerId=${answerId}&contentAttemptNumber=${contentAttemptNumber}${itemQuery}&shuffledOrder=${shuffledOrder.toString()}`,
      );

      const responseData = data.responses.map((obj: any) => ({
        response: parseAndFormatResponse(obj.response),
        creditAchieved: Number(obj.answerCreditAchieved),
        submittedAt: DateTime.fromISO(obj.submittedAt).toLocaleString(
          DateTime.DATETIME_MED,
        ),
      }));
      setResponses(responseData);
    }

    getAnswerResponses();
  }, [
    assignment.contentId,
    student.userId,
    itemNumber,
    answerId,
    contentAttemptNumber,
    itemAttemptNumber,
    shuffledOrder,
  ]);

  const attemptNumber = Math.max(contentAttemptNumber, itemAttemptNumber ?? 1);

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size="lg"
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton data-test="Close Share Drawer Button" />
        <DrawerHeader textAlign="center" height="140px">
          Responses of {createNameNoTag(student)}
          <Tooltip label={assignment.name} openDelay={1000}>
            <Text fontSize="smaller" noOfLines={1}>
              Assignment: {assignment.name}
            </Text>
          </Tooltip>
          {assignment.type !== "singleDoc" ? (
            <Tooltip label={itemName} openDelay={1000}>
              <Text fontSize="smaller" noOfLines={1}>
                Item: {itemNumber}. {itemName}
              </Text>
            </Tooltip>
          ) : null}
          <Text fontSize="smaller">Attempt: {attemptNumber}</Text>
        </DrawerHeader>

        <DrawerBody>
          <Text>
            Responses to answer:{" "}
            {answerId[0] === "/" ? answerId.substring(1) : answerId}
          </Text>
          <TableContainer marginTop="10px">
            <Table>
              <Thead>
                <Tr>
                  <Th textTransform={"none"} fontSize="medium">
                    Response
                  </Th>
                  <Th textTransform={"none"} fontSize="medium">
                    Credit
                  </Th>
                  <Th textTransform={"none"} fontSize="medium">
                    Submitted
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {responses.map((resp, i) => {
                  return (
                    <Tr key={i}>
                      <Td>{resp.response}</Td>
                      <Td>{Math.round(resp.creditAchieved * 1000) / 10}%</Td>
                      <Td>{resp.submittedAt}</Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
