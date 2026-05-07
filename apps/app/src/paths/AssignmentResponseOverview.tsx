import { ReactElement, useEffect } from "react";
import { ActionFunctionArgs, useFetcher, useLoaderData } from "react-router";
import me from "math-expressions";

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
  List,
  ListItem,
  HStack,
  Text,
  Tooltip,
  Icon,
  Grid,
  GridItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Heading as ChakraHeading,
  Stack,
  Input,
  useDisclosure,
  Button,
} from "@chakra-ui/react";
import axios from "axios";
import { DoenetHeading as Heading } from "../widgets/Heading";
import "../utils/score-table.css";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Label } from "recharts";
import { Link as ReactRouterLink, useNavigate } from "react-router";
import { createNameNoTag, lastNameFirst } from "../utils/names";
import {
  AssignmentMode,
  Content,
  DoenetmlVersion,
  UserInfoWithEmail,
} from "../types";
import { isActivitySource } from "@doenet/assignment-viewer";
import {
  compileActivityFromContent,
  contentTypeToName,
  getIconInfo,
} from "../utils/activity";
import { BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";
import { ActivitySource } from "@doenet-tools/shared";
import { EditAssignmentSettings } from "../widgets/editor/EditAssignmentSettings";
import { DateTime } from "luxon";
import { NameBar } from "../widgets/NameBar";
import { AssignmentInvitation } from "../views/AssignmentInvitation";
import { downloadScoresToCsv } from "../utils/csv";

type ScoreItem = {
  score: number;
  bestAttemptNumber: number;
  itemScores?:
    | { itemNumber: number; score: number; itemAttemptNumber: number }[]
    | null;
  numContentAttempts: number;
  numItemAttempts: number[] | null;
  // We're including email here because it allows instructors to verify
  // the identity of their students
  // TODO: display emails on this page
  user: UserInfoWithEmail;
};

export async function loader({ params, request }: ActionFunctionArgs) {
  const { data } = await axios.get(
    `/api/assign/getAssignmentResponseOverview/${params.contentId}`,
  );

  const url = new URL(request.url);
  let sort = (url.searchParams.get("sort") ?? "name").trim();
  let sortDir: "asc" | "desc" = "asc";
  if (sort.slice(-1) === "-") {
    sort = sort.slice(0, -1);
    sortDir = "desc";
  }

  if (!(Number.isInteger(Number(sort)) || ["name", "total"].includes(sort))) {
    sort = "name";
  }

  function sortFunction(a: ScoreItem, b: ScoreItem) {
    let res;

    if (sort === "name") {
      const nameA = lastNameFirst(a.user).toLowerCase();
      const nameB = lastNameFirst(b.user).toLowerCase();
      if (nameA < nameB) {
        res = -1;
      } else if (nameA > nameB) {
        res = 1;
      } else {
        res = 0;
      }
    } else if (sort === "total") {
      res = a.score - b.score;
    } else {
      const idx = Number(sort) - 1;
      res = (a.itemScores?.[idx].score ?? 0) - (b.itemScores?.[idx].score ?? 0);
    }
    if (sortDir === "desc") {
      return -res;
    } else {
      return res;
    }
  }

  const contentId = params.contentId;

  const assignment = data.content as Content;
  const mode = data.scoreSummary.mode;
  const scores = data.scoreSummary.scores
    .map((s: any) => ({
      score: s.score,
      bestAttemptNumber: s.bestAttemptNumber,
      itemScores: s.itemScores
        ? s.itemScores.sort((a: any, b: any) => a.itemNumber - b.itemNumber)
        : null,
      numContentAttempts: s.latestAttempt?.attemptNumber ?? 1,
      numItemAttempts:
        s.latestAttempt?.itemScores
          .sort((a: any, b: any) => a.itemNumber - b.itemNumber)
          .map((x: any) => x.itemAttemptNumber) ?? null,
      user: s.user,
    }))
    .sort(sortFunction) as ScoreItem[];

  const numItems = scores[0]?.itemScores?.length ?? 1;

  const numStudents = scores.length;
  const scoreNumbers = scores.map((s) => s.score);

  const averageScore = numStudents > 0 ? me.math.mean(...scoreNumbers) : 0;
  const medianScore = numStudents > 0 ? me.math.median(...scoreNumbers) : 0;
  const stdScores = numStudents > 0 ? me.math.std(...scoreNumbers) : 0;

  const baseData = {
    contentName: assignment.name,
    assignment,
    scores,
    numItems,
    numStudents,
    scoreStats: {
      averageScore,
      medianScore,
      stdScores,
    },
    mode,
    contentId,
    sort,
    sortDir,
  };

  if (assignment.type === "singleDoc") {
    const doenetML = assignment.doenetML;
    const doenetmlVersion: DoenetmlVersion = assignment.doenetmlVersion;

    return {
      type: assignment.type,
      ...baseData,
      doenetML,
      doenetmlVersion,
    };
  } else if (assignment.type !== "folder") {
    const activityJsonPrelim = assignment.activityJson
      ? JSON.parse(assignment.activityJson)
      : null;

    const activityJson = isActivitySource(activityJsonPrelim)
      ? activityJsonPrelim
      : compileActivityFromContent(assignment);

    const itemNames = data.itemNames;

    return {
      type: assignment.type,
      ...baseData,
      activityJson,
      itemNames,
    };
  } else {
    // Handle folder type
    throw new Error("Cannot view this page on a folder");
  }
}

export function AssignmentData() {
  const data = useLoaderData() as {
    contentId: string;
    assignment: Content;
    scores: ScoreItem[];
    numItems: number;
    numStudents: number;
    scoreStats: {
      averageScore: number;
      medianScore: number;
      stdScores: number;
    };
    mode: AssignmentMode;
    sort: string;
    sortDir: "asc" | "desc";
  } & (
    | {
        type: "singleDoc";
        doenetML: string;
        doenetmlVersion: DoenetmlVersion;
      }
    | {
        type: "select" | "sequence";
        activityJson: ActivitySource;
        itemNames: string[];
      }
  );

  const nameBarFetcher = useFetcher();

  const {
    contentId,
    assignment,
    scores,
    numItems,
    numStudents,
    scoreStats,
    mode,
    sort,
    sortDir,
  } = data;

  const info = assignment.assignmentInfo!;

  const minScore = 0;
  const numBins = 11;
  const size = 1 / (numBins - 1);

  const hist = new Array(numBins).fill(0);
  for (const item of scores) {
    hist[Math.round((item.score - minScore) / size)]++;
  }
  const scoreData = hist.map((v, i) => ({
    count: v,
    score: Math.round(i * size * 10) / 10,
  }));

  const navigate = useNavigate();
  const fetcher = useFetcher();
  const {
    isOpen: inviteIsOpen,
    onOpen: inviteOnOpen,
    onClose: inviteOnClose,
  } = useDisclosure();

  // Create fetchers for EditAssignmentSettings sub-components
  const maxAttemptsFetcher = useFetcher();
  const variantFetcher = useFetcher();
  const modeFetcher = useFetcher();

  useEffect(() => {
    document.title = `${assignment.name} - Doenet`;
  }, [assignment.name]);

  const sortArrow = (
    <Tooltip
      label="Reverse sort direction"
      openDelay={500}
      placement="bottom-end"
    >
      <Text>
        <Icon as={sortDir === "asc" ? BiDownArrowAlt : BiUpArrowAlt} />
      </Text>
    </Tooltip>
  );

  const sortLink = (text: string) =>
    `.?sort=${text}${sort === `${text}` && sortDir === "asc" ? "-" : ""}`;

  let scoresChart: ReactElement<any>;
  const nameWidth = 150;
  const totalWidth = 70;

  if (data.type !== "singleDoc" && numItems > 1) {
    const itemNames: string[] = data.itemNames;

    const itemWidth = 50;

    scoresChart = (
      <TableContainer>
        <Table
          size="sm"
          className="score-table"
          layout="fixed"
          width={`${nameWidth + itemWidth * numItems + totalWidth}px`}
        >
          <Thead>
            <Tr className="no-bottom-padding">
              <Th
                textTransform={"none"}
                fontSize="large"
                rowSpan={2}
                alignContent="end"
                width={`${nameWidth}px`}
              >
                <Box>
                  <ChakraLink
                    as={ReactRouterLink}
                    to={sortLink("name")}
                    replace={true}
                    _hover={{
                      textDecoration: "none",
                      color: "gray.400",
                    }}
                  >
                    <HStack gap={0}>
                      <Text height="21px">Name</Text>
                      {sort === "name" ? sortArrow : null}
                    </HStack>
                  </ChakraLink>
                </Box>
              </Th>

              <Th
                textTransform={"none"}
                fontSize="large"
                justifyItems="center"
                rowSpan={2}
                alignContent="end"
                width={`${totalWidth}px`}
              >
                <Box width="64px" justifyItems="center">
                  <Box>
                    <ChakraLink
                      as={ReactRouterLink}
                      to={sortLink("total")}
                      replace={true}
                      _hover={{
                        textDecoration: "none",
                        color: "gray.400",
                      }}
                    >
                      <HStack gap={0}>
                        <Text height="21px">Total</Text>
                        {sort === "total" ? sortArrow : null}
                      </HStack>
                    </ChakraLink>
                  </Box>
                </Box>
              </Th>
              <Th
                textTransform={"none"}
                fontSize="large"
                colSpan={itemNames.length}
                borderBottom="none"
              >
                Item
              </Th>
            </Tr>
            <Tr className="no-bottom-padding">
              {itemNames.map((name, i) => {
                return (
                  <Th
                    textTransform={"none"}
                    fontSize="large"
                    key={i}
                    maxWidth="100px"
                    justifyItems="center"
                  >
                    <Box>
                      <ChakraLink
                        as={ReactRouterLink}
                        to={sortLink(`${i + 1}`)}
                        replace={true}
                        _hover={{
                          textDecoration: "none",
                          color: "gray.400",
                        }}
                      >
                        <HStack gap={0}>
                          <Tooltip label={`${i + 1}. ${name}`} openDelay={500}>
                            <Text height="21px">{i + 1}</Text>
                          </Tooltip>
                          {sort === `${i + 1}` ? sortArrow : null}
                        </HStack>
                      </ChakraLink>
                    </Box>
                  </Th>
                );
              })}
            </Tr>
          </Thead>
          <Tbody>
            {scores.map((assignmentScore) => {
              const linkURL =
                "/assignmentData/" +
                contentId +
                "/" +
                assignmentScore.user.userId;
              const studentName = createNameNoTag(assignmentScore.user);
              const bestAttemptNumber = assignmentScore.bestAttemptNumber;
              return (
                <Tr
                  key={`user${assignmentScore.user.userId}`}
                  data-test={`Student Row ${assignmentScore.user.userId}`}
                >
                  <Td>
                    <HStack>
                      <ChakraLink
                        as={ReactRouterLink}
                        to={linkURL}
                        textDecoration="underline"
                      >
                        {studentName}
                      </ChakraLink>
                    </HStack>
                  </Td>
                  <Td justifyItems="center" data-test="Total Score">
                    <Text>
                      <Tooltip
                        label={`Total for ${studentName}`}
                        openDelay={500}
                      >
                        <ChakraLink
                          as={ReactRouterLink}
                          to={linkURL}
                          textDecoration="underline"
                        >
                          &nbsp;
                          {Math.round(assignmentScore.score * 1000) / 10}
                          &nbsp;
                        </ChakraLink>
                      </Tooltip>
                    </Text>
                  </Td>
                  {assignmentScore.itemScores?.map((item, i) => {
                    const attemptNumberForScore =
                      mode === "summative"
                        ? bestAttemptNumber
                        : item.itemAttemptNumber;
                    return (
                      <Td
                        key={i}
                        justifyItems="center"
                        data-test={`Item ${i + 1} Score`}
                      >
                        <Text>
                          <Tooltip
                            label={`Item ${i + 1} for ${studentName}`}
                            openDelay={500}
                          >
                            <ChakraLink
                              as={ReactRouterLink}
                              to={`${linkURL}?itemNumber=${i + 1}&attemptNumber=${attemptNumberForScore}`}
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
  } else {
    scoresChart = (
      <TableContainer>
        <Table
          size="sm"
          className="score-table"
          layout="fixed"
          width={`${nameWidth + totalWidth}px`}
        >
          <Thead>
            <Tr>
              <Th
                textTransform={"none"}
                fontSize="large"
                rowSpan={2}
                alignContent="end"
                width={`${nameWidth}px`}
              >
                <Box>
                  <ChakraLink
                    as={ReactRouterLink}
                    to={sortLink("name")}
                    replace={true}
                    _hover={{
                      textDecoration: "none",
                      color: "gray.400",
                    }}
                  >
                    <HStack gap={0}>
                      <Text height="21px">Name</Text>
                      {sort === "name" ? sortArrow : null}
                    </HStack>
                  </ChakraLink>
                </Box>
              </Th>
              <Th
                textTransform={"none"}
                fontSize="large"
                justifyItems="center"
                rowSpan={2}
                alignContent="end"
                width={`${totalWidth}px`}
              >
                <Box width="64px" justifyItems="center">
                  <Box>
                    <ChakraLink
                      as={ReactRouterLink}
                      to={sortLink("total")}
                      replace={true}
                      _hover={{
                        textDecoration: "none",
                        color: "gray.400",
                      }}
                    >
                      <HStack gap={0}>
                        <Text height="21px">Score</Text>
                        {sort === "total" ? sortArrow : null}
                      </HStack>
                    </ChakraLink>
                  </Box>
                </Box>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {scores.map((assignmentScore) => {
              const linkURL =
                "/assignmentData/" +
                contentId +
                "/" +
                assignmentScore.user.userId;
              const studentName = createNameNoTag(assignmentScore.user);
              return (
                <Tr key={`user${assignmentScore.user.userId}`}>
                  <Td>
                    <ChakraLink
                      as={ReactRouterLink}
                      to={linkURL}
                      textDecoration="underline"
                    >
                      {studentName}
                    </ChakraLink>
                  </Td>
                  <Td justifyItems="center">
                    <Text>
                      <Tooltip
                        label={`Total for ${studentName}`}
                        openDelay={500}
                      >
                        <ChakraLink
                          as={ReactRouterLink}
                          to={`${linkURL}?itemNumber=1`}
                          textDecoration="underline"
                        >
                          &nbsp;
                          {Math.round(assignmentScore.score * 1000) / 10}
                          &nbsp;
                        </ChakraLink>
                      </Tooltip>
                    </Text>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    );
  }

  const contentTypeName = contentTypeToName[data.type];
  const { iconImage, iconColor } = getIconInfo(
    data.type,
    data.assignment.assignmentInfo ? true : false,
  );

  const typeIcon = (
    <Tooltip label={contentTypeName}>
      <Box>
        <Icon
          as={iconImage}
          color={iconColor}
          boxSizing="content-box"
          width="24px"
          height="24px"
          paddingRight="10px"
          verticalAlign="middle"
          aria-label={contentTypeName}
        />
      </Box>
    </Tooltip>
  );

  const localValidUntil = DateTime.fromISO(info.assignmentClosedOn!).toISO({
    includeOffset: false,
  })!;

  const downloadScores = () => {
    downloadScoresToCsv({
      title: `Scores for ${assignment.name}`,
      orderedStudents: scores.map((s) => s.user),
      // [s.score] indicates we only have one assignment here
      scores: scores.map((s) => [s.score]),
      orderedAssignments: [assignment.name],
    });
  };

  const classCode = String(info.classCode!).padStart(6, "0");

  return (
    <>
      <AssignmentInvitation
        isOpen={inviteIsOpen}
        onClose={inviteOnClose}
        classCode={classCode}
        assignmentStatus={info.assignmentStatus}
        assignmentName={assignment.name}
      />
      <Grid
        height="40px"
        background="doenet.canvas"
        width="100%"
        borderBottom={"1px solid"}
        borderColor="doenet.mediumGray"
        templateAreas={`"leftControls label"`}
        templateColumns={{
          base: "135px 1fr 135px",
          sm: "135px 1fr 135px",
          md: "150px 1fr 150px",
          lg: "370px 1fr 370px",
        }}
        alignContent="center"
      >
        <GridItem area="leftControls" marginLeft="15px">
          <ChakraLink
            as={ReactRouterLink}
            to={".."}
            style={{
              color: "var(--mainBlue)",
            }}
            onClick={(e) => {
              e.preventDefault();
              navigate(-1);
            }}
          >
            {" "}
            &lt; Back
          </ChakraLink>
        </GridItem>
        <GridItem area="label">
          <Flex justifyContent="center" alignItems="center">
            <NameBar
              contentName={assignment.name}
              contentId={assignment.contentId}
              leftIcon={typeIcon}
              dataTest="Assignment Name Editable"
              fetcher={nameBarFetcher}
            />
          </Flex>
        </GridItem>
      </Grid>
      <Box m="1rem">
        <Stack spacing="1rem" mb="2rem" ml="1rem" alignItems="flex-start">
          <ChakraHeading size="md">
            Assignment is {info.assignmentStatus}
          </ChakraHeading>
          <ChakraHeading size="sm">Settings</ChakraHeading>
          <EditAssignmentSettings
            contentId={contentId}
            maxAttempts={assignment.assignmentInfo!.maxAttempts}
            individualizeByStudent={
              assignment.assignmentInfo!.individualizeByStudent
            }
            mode={assignment.assignmentInfo!.mode}
            includeMode={assignment.type !== "singleDoc"}
            isAssigned={true}
            maxAttemptsFetcher={maxAttemptsFetcher}
            variantFetcher={variantFetcher}
            modeFetcher={modeFetcher}
          />

          <ChakraHeading size="sm">Availability</ChakraHeading>
          <Text>
            {info.assignmentStatus === "Open" ? `Closes` : `Closed`} at{" "}
            <Input
              zIndex="overlay"
              type="datetime-local"
              size="sm"
              step="60"
              width="220px"
              value={localValidUntil}
              onChange={(e) => {
                const closedOn = DateTime.fromISO(e.target.value)
                  .set({ second: 0, millisecond: 0 })
                  .toISO({
                    suppressSeconds: true,
                    suppressMilliseconds: true,
                  });
                fetcher.submit(
                  {
                    path: "assign/updateAssignmentClosedOn",
                    contentId,
                    closedOn,
                  },
                  { method: "post", encType: "application/json" },
                );
              }}
            />
          </Text>
          <Text>
            Class code: <span data-test="Class Code">{classCode}</span>
          </Text>
          <Button
            onClick={inviteOnOpen}
            colorScheme="blue"
            isDisabled={info.assignmentStatus !== "Open"}
          >
            Invite students
          </Button>
          <Tooltip
            label="Download scores for this assignment as a CSV file"
            openDelay={50}
          >
            <Button
              colorScheme="blue"
              onClick={downloadScores}
              data-test="Download Scores Button"
              disabled={numStudents === 0}
            >
              Download assignment scores
            </Button>
          </Tooltip>
        </Stack>
        <Tabs mb="10vh">
          <TabList>
            <Tab>Scores</Tab>
            <Tab>Statistics</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>{scoresChart}</TabPanel>
            <TabPanel>
              <Heading subheading="Score summary" />
              <BarChart
                width={600}
                height={300}
                data={scoreData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="score">
                  <Label value="Score" offset={0} position="insideBottom" />
                </XAxis>
                <YAxis>
                  <Label
                    value="Number of students"
                    angle={-90}
                    position="insideLeft"
                  />
                </YAxis>
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
              <Box>
                <List>
                  <ListItem>Number of students: {numStudents}</ListItem>
                  <ListItem>
                    Average score:{" "}
                    {Math.round(scoreStats.averageScore * 100) / 100}
                  </ListItem>
                  <ListItem>
                    Median score:{" "}
                    {Math.round(scoreStats.medianScore * 100) / 100}
                  </ListItem>
                  <ListItem>
                    Score standard deviation:{" "}
                    {Math.round(scoreStats.stdScores * 100) / 100}
                  </ListItem>
                </List>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </>
  );
}
