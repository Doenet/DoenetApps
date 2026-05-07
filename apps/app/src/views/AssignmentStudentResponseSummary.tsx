import { ReactElement } from "react";
import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Box,
  Link as ChakraLink,
  Flex,
  Text,
  Tooltip,
  Select,
  Checkbox,
  Spacer,
} from "@chakra-ui/react";
import {
  Link as ReactRouterLink,
  useLocation,
  useNavigate,
} from "react-router";
import "../utils/score-table.css";
import { createNameNoTag } from "../utils/names";
import { ContentType, UserInfo } from "../types";
import { clearQueryParameter } from "../utils/explore";

export function AssignmentStudentResponseSummary({
  assignment,
  user,
  shuffledOrder,
  itemNames,
  allStudents,
  overallScores,
  allAttemptScores,
}: {
  assignment: {
    name: string;
    type: ContentType;
    contentId: string;
    shuffledOrder: boolean;
    isOpen: boolean;
  };
  user: UserInfo;
  shuffledOrder: boolean;
  itemNames: string[];
  allStudents: {
    userId: string;
    firstNames: string | null;
    lastNames: string;
  }[];
  overallScores: {
    score: number;
    bestAttemptNumber: number;
    itemScores: { itemNumber: number; score: number }[] | null;
    numContentAttempts: number;
    numItemAttempts: number[] | null;
  };
  allAttemptScores:
    | {
        byItem: true;
        itemAttemptScores: {
          itemNumber: number;
          shuffledItemNumber: number;
          attempts: {
            itemAttemptNumber: number;
            score: number;
          }[];
        }[];
      }
    | {
        byItem: false;
        attemptScores: {
          attemptNumber: number;
          score: number;
          items: {
            itemNumber: number;
            shuffledItemNumber: number;
            score: number;
          }[];
        }[];
      };
}) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const searchBase = search === "" ? "?" : search + "&";

  let scoreTable: ReactElement<any>;

  if (allAttemptScores.byItem) {
    const itemAttemptScores = allAttemptScores.itemAttemptScores;
    const maxAttempts = itemAttemptScores.reduce(
      (a, c) => Math.max(a, c.attempts.length),
      0,
    );
    const itemWidth = 250;
    const totalWidth = 70;
    const attemptWidth = 50;

    scoreTable = (
      <TableContainer>
        <Table
          size="sm"
          layout="fixed"
          width={`${itemWidth + totalWidth + maxAttempts * attemptWidth}px`}
          className="score-table"
        >
          <Thead>
            <Tr className="no-bottom-padding">
              <Th width={`${itemWidth}px`} borderBottom="none"></Th>
              <Th width={`${totalWidth}px`} borderBottom="none"></Th>
              <Th
                colSpan={maxAttempts}
                textTransform={"none"}
                fontSize="large"
                borderBottom="none"
              >
                Attempt
              </Th>
            </Tr>
            <Tr>
              <Th
                textTransform={"none"}
                fontSize="large"
                width={`${itemWidth}px`}
              >
                Item
              </Th>
              <Th
                textTransform={"none"}
                fontSize="large"
                textAlign="center"
                width={`${totalWidth}px`}
              >
                Total
              </Th>
              {[...Array<number>(maxAttempts).keys()].map((i) => (
                <Th
                  textTransform={"none"}
                  fontSize="large"
                  key={i}
                  justifyItems="center"
                >
                  <Text>
                    <Tooltip label={`Attempt ${i + 1}`} openDelay={500}>
                      {i + 1}
                    </Tooltip>
                  </Text>
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {itemAttemptScores.map((item, idx) => {
              return (
                <Tr key={idx}>
                  <Td>
                    <Box wordBreak="break-word" whiteSpace="normal">
                      <Tooltip
                        label={`${idx + 1}. ${itemNames[idx]}`}
                        openDelay={500}
                      >
                        <Text noOfLines={2}>
                          {idx + 1}. {itemNames[idx]}
                        </Text>
                      </Tooltip>
                    </Box>
                  </Td>
                  <Td justifyItems="center">
                    <Text>
                      <Tooltip label={`Item ${idx + 1} total`} openDelay={500}>
                        <ChakraLink
                          as={ReactRouterLink}
                          to={`${searchBase}itemNumber=${shuffledOrder ? item.shuffledItemNumber : item.itemNumber}`}
                          textDecoration="underline"
                        >
                          &nbsp;
                          {Math.round(
                            overallScores.itemScores![idx].score * 1000,
                          ) / 10}
                          &nbsp;
                        </ChakraLink>
                      </Tooltip>
                    </Text>
                  </Td>
                  {item.attempts.map((attempt, attemptIdx) => {
                    return (
                      <Td key={attempt.itemAttemptNumber} justifyItems="center">
                        <Text>
                          <Tooltip
                            label={`Item ${idx + 1}, attempt ${attemptIdx + 1}`}
                            openDelay={500}
                          >
                            <ChakraLink
                              as={ReactRouterLink}
                              to={`${searchBase}itemNumber=${shuffledOrder ? item.shuffledItemNumber : item.itemNumber}&attemptNumber=${attempt.itemAttemptNumber}`}
                              textDecoration="underline"
                            >
                              &nbsp;
                              {Math.round(attempt.score * 1000) / 10}
                              &nbsp;
                            </ChakraLink>
                          </Tooltip>
                        </Text>
                      </Td>
                    );
                  })}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    );
  } else {
    const attemptScores = allAttemptScores.attemptScores;
    const numItems = itemNames.length;

    const attemptWidth = 100;
    const itemWidth = 50;
    const totalWidth = 70;

    scoreTable = (
      <TableContainer>
        <Table
          size="sm"
          layout="fixed"
          width={`${attemptWidth + totalWidth + numItems * itemWidth}px`}
          className="score-table"
        >
          <Thead>
            {assignment.type !== "singleDoc" ? (
              <Tr className="no-bottom-padding">
                <Th width={`${attemptWidth}px`} borderBottom="none"></Th>

                <Th width={`${totalWidth}px`} borderBottom="none"></Th>

                <Th
                  colSpan={numItems}
                  textTransform={"none"}
                  fontSize="large"
                  borderBottom="none"
                >
                  Item
                </Th>
              </Tr>
            ) : null}
            <Tr>
              <Th
                textTransform={"none"}
                fontSize="large"
                width={`${attemptWidth}px`}
              >
                Attempt
              </Th>

              <Th
                textTransform={"none"}
                fontSize="large"
                textAlign="center"
                width={`${totalWidth}px`}
              >
                {assignment.type === "singleDoc" ? "Score" : "Total"}
              </Th>
              {[...Array<number>(numItems).keys()].map((i) => (
                <Th
                  textTransform={"none"}
                  fontSize="large"
                  key={i}
                  justifyItems="center"
                >
                  <Text>
                    <Tooltip label={`Item ${i + 1}`} openDelay={500}>
                      {i + 1}
                    </Tooltip>
                  </Text>
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {attemptScores.map((attempt, i) => {
              return (
                <Tr key={attempt.attemptNumber}>
                  <Td textAlign="center" data-test={`Attempt Number ${i + 1}`}>
                    {attempt.attemptNumber}
                  </Td>
                  <Td
                    justifyItems="center"
                    data-test={`Attempt Total ${i + 1}`}
                  >
                    <Text>
                      <Tooltip
                        label={`Attempt ${attempt.attemptNumber} total`}
                        openDelay={500}
                      >
                        <ChakraLink
                          as={ReactRouterLink}
                          to={`${searchBase}attemptNumber=${attempt.attemptNumber}&itemNumber=1`}
                          textDecoration="underline"
                        >
                          &nbsp;
                          {Math.round(attempt.score * 1000) / 10}
                          &nbsp;
                        </ChakraLink>
                      </Tooltip>
                    </Text>
                  </Td>
                  {attempt.items.map((item, itemIdx) => {
                    return (
                      <Td key={itemIdx} justifyItems="center">
                        <Text>
                          <Tooltip
                            label={`Attempt ${attempt.attemptNumber}, item ${itemIdx + 1}`}
                            openDelay={500}
                          >
                            <ChakraLink
                              as={ReactRouterLink}
                              to={`${searchBase}itemNumber=${shuffledOrder ? item.shuffledItemNumber : item.itemNumber}&attemptNumber=${attempt.attemptNumber}`}
                              textDecoration="underline"
                            >
                              &nbsp;
                              {Math.round(item.score * 1000) / 10}
                              &nbsp;
                            </ChakraLink>
                          </Tooltip>
                        </Text>
                      </Td>
                    );
                  })}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <Box marginLeft="20px" marginRight="20px" marginTop="20px">
      <Flex alignItems="center" marginTop="20px" justifyContent="center">
        {allStudents.length > 0 ? (
          <Flex alignItems="center">
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
                navigate(`../${e.target.value}${search}`, {
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
        ) : !assignment.isOpen ? (
          <Text fontStyle="italic">Assignment is closed</Text>
        ) : null}

        <Spacer />

        {assignment.shuffledOrder && assignment.type !== "singleDoc" ? (
          <Flex>
            <Tooltip
              label="Display items in the shuffled order seen by the student"
              openDelay={500}
              placement="bottom-end"
            >
              <label htmlFor="shuffle-checkbox">Display in student order</label>
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
        ) : null}
      </Flex>
      <Box marginTop="20px" data-test="Overall Score">
        Overall score: {Math.round(overallScores.score * 1000) / 10}
      </Box>
      <Box marginTop="20px">{scoreTable}</Box>
    </Box>
  );
}
