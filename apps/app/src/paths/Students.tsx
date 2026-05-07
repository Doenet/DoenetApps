import { ReactNode, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import {
  Button,
  Heading,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
  Link as ChakraLink,
  Tooltip,
  Icon,
  Box,
  Wrap,
  useDisclosure,
} from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router";
import axios from "axios";
import { lastNameFirst } from "../utils/names";
import { downloadScoresToCsv } from "../utils/csv";
import { getIconInfo } from "../utils/activity";
import { NameBar } from "../widgets/NameBar";
import { UserInfo } from "../types";
import { AddStudents } from "../popups/AddStudents";

type OrderedActivity = {
  contentId: string;
  name: string;
};

type Folder = {
  contentId: string;
  name: string;
};

export async function loader({
  params,
}: {
  params: {
    parentId?: string;
  };
}) {
  if (!params.parentId) {
    throw new Error("Missing folder id");
  }

  const { data } = await axios.get(
    `/api/assign/getAllAssignmentScores/${params.parentId}`,
  );

  const { orderedStudents, orderedAssignments, scores, folder } = data as {
    orderedStudents: UserInfo[];
    orderedAssignments: OrderedActivity[];
    scores: (number | null)[][];
    folder: Folder;
  };

  return {
    orderedStudents,
    orderedAssignments,
    scores,
    folder,
  };
}

export function Students() {
  const { orderedAssignments, orderedStudents, scores, folder } =
    useLoaderData() as {
      orderedAssignments: OrderedActivity[];
      orderedStudents: UserInfo[];
      scores: (number | null)[][];
      folder: Folder;
    };

  const name = folder?.name ?? "My Activities";

  useEffect(() => {
    document.title = `${name} - Students`;
  });

  const nameWidth = 150;
  const itemWidth = 50;

  const {
    isOpen: addStudentsIsOpen,
    onOpen: addStudentsOnOpen,
    onClose: onAddStudentsClose,
  } = useDisclosure();

  const addStudentsFetcher = useFetcher();

  const { iconImage: folderIcon, iconColor: folderColor } = getIconInfo(
    "folder",
    false,
  );
  const icon = (
    <Icon
      as={folderIcon}
      color={folderColor}
      boxSizing="content-box"
      width="24px"
      height="24px"
      mr="0.5rem"
      verticalAlign="middle"
      aria-label={"Folder"}
    />
  );

  // =====================
  // Help message
  // =====================
  const helpMessage: ReactNode[] = [];
  if (orderedAssignments.length === 0 && orderedStudents.length === 0) {
    helpMessage.push(
      <Text mt="20px" mb="20px">
        No assignments or students in this folder yet.
      </Text>,
    );
  } else if (orderedStudents.length === 0) {
    helpMessage.push(
      <Text mt="20px" mb="20px">
        No students in this folder yet.
      </Text>,
    );
  } else if (orderedAssignments.length === 0) {
    helpMessage.push(
      <Text mt="20px" mb="20px">
        No assignments in this folder yet.
      </Text>,
    );
  }

  // =====================
  // Table header row
  // =====================

  const headerRow = [];
  headerRow.push(
    <Th textTransform={"none"} fontSize="large" width={`${nameWidth}px`}>
      Student
    </Th>,
  );

  for (const assignment of orderedAssignments) {
    const assignmentNameShortened =
      assignment.name.length < 30
        ? assignment.name
        : assignment.name.substring(
            0,
            assignment.name.substring(0, 27).lastIndexOf(" "),
          ) + "...";

    headerRow.push(
      <Th key={`assignment${assignment.contentId}`} textTransform={"none"}>
        <ChakraLink
          as={ReactRouterLink}
          to={`/assignmentData/${assignment.contentId}`}
          display="block"
          textDecoration="underline"
          height="14em"
          width="1em"
          transform="rotate(315deg) translate(-4em, 11em)"
          fontSize={14}
        >
          <Tooltip
            label={assignment.name}
            placement="bottom-end"
            openDelay={500}
          >
            <Text textDecoration="underline">{assignmentNameShortened}</Text>
          </Tooltip>
        </ChakraLink>
      </Th>,
    );
  }

  // =====================
  // Table body rows
  // =====================

  const tableBody: ReactNode[][] = [];

  for (const [i, student] of orderedStudents.entries()) {
    const row: ReactNode[] = [];

    // Student name cell
    row.push(
      <Td>
        <ChakraLink
          as={ReactRouterLink}
          to={`/studentAssignmentScores/${student.userId}${folder ? "/" + folder.contentId : ""}`}
          textDecoration="underline"
        >
          {lastNameFirst(student)}
        </ChakraLink>
      </Td>,
    );

    // Score cells
    for (const [j, score] of scores[i].entries()) {
      if (score !== null) {
        // Link to score
        row.push(
          <Td key={`student${i}_assignment${j}`}>
            <ChakraLink
              as={ReactRouterLink}
              to={`/assignmentData/${orderedAssignments[j].contentId}/${orderedStudents[i].userId}`}
              textDecoration="underline"
            >
              &nbsp;
              {Math.round(score * 1000) / 10}
              &nbsp;
            </ChakraLink>
          </Td>,
        );
      } else {
        // No score
        row.push(<Td key={`student${i}_assignment${j}`}>&#8212;</Td>);
      }
    }
    tableBody.push(row);
  }

  // =====================
  // Full Table
  // =====================

  const scoreTable = (
    <TableContainer
      width={`${nameWidth + itemWidth * orderedAssignments.length + 100}px`}
      overflowX="hidden"
    >
      <Table
        size="sm"
        className="score-table"
        layout="fixed"
        width={`${nameWidth + itemWidth * orderedAssignments.length}px`}
      >
        <Thead>
          <Tr verticalAlign={"bottom"}>{headerRow}</Tr>
        </Thead>
        <Tbody>
          {tableBody.length === 0 && (
            <Tr>
              <Td>None</Td>
            </Tr>
          )}
          {tableBody.map((tableRow, i) => (
            <Tr key={`student${i}`} borderTopWidth={2} borderTopColor={"#bbb"}>
              {tableRow}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );

  // =====================
  // Bottom controls
  // =====================

  const downloadButton = (
    <Button
      size="sm"
      isDisabled={
        orderedStudents.length === 0 || orderedAssignments.length === 0
      }
      onClick={() =>
        downloadScoresToCsv({
          title: `Scores for ${name}`,
          orderedStudents,
          orderedAssignments: orderedAssignments.map((a) => a.name),
          scores,
        })
      }
    >
      Download scores
    </Button>
  );

  const addStudentButton = (
    <Button size="sm" onClick={addStudentsOnOpen} hidden={true}>
      Add students
    </Button>
  );

  // =====================
  // Full component
  // =====================

  return (
    <Box flex="1" width="100%" pt="30px" pb="30px" pl="15px">
      <Wrap align="center" spacing="1rem">
        <Heading size="md">Student accounts and scores for:</Heading>
        <NameBar
          contentId={null}
          contentName={name}
          isEditable={false}
          leftIcon={icon}
          dataTest="Scores Heading"
          fontSizeMode="folder"
        />
      </Wrap>

      {helpMessage}

      {(orderedAssignments.length > 0 || orderedStudents.length > 0) &&
        scoreTable}

      <Wrap mt="50px">
        {addStudentButton}
        {downloadButton}
      </Wrap>

      <AddStudents
        isOpen={addStudentsIsOpen}
        onClose={onAddStudentsClose}
        folderId={folder.contentId}
        fetcher={addStudentsFetcher}
      />
    </Box>
  );
}
