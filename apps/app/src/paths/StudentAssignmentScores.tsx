import { useEffect } from "react";
import { ActionFunctionArgs, useLoaderData } from "react-router";
import { Link as ReactRouterLink, useNavigate } from "react-router";
import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
  Box,
  Link as ChakraLink,
} from "@chakra-ui/react";
import axios from "axios";
import { DoenetHeading as Heading } from "../widgets/Heading";
import { createNameNoTag } from "../utils/names";

type UserData = {
  userId: string;
  firstNames: string | null;
  lastNames: string;
};
type OrderedActivityScore = {
  contentId: string;
  activityName: string;
  score: number;
};

type Folder = {
  contentId: string;
  name: string;
};

// loader for when an instructor gets data about a student
export async function loader({ params }: ActionFunctionArgs) {
  const { data } = await axios.get(
    `/api/assign/getStudentAssignmentScores/${params.userId}/${params.parentId ?? ""}`,
  );

  const userData = data.studentData;
  const scores = data.orderedActivityScores;
  const folder = data.folder;

  return { userData, scores, folder, isAssignedData: false };
}

// loader for when a student gets their own data
export async function assignedDataloader() {
  const { data } = await axios.get(`/api/assign/getAssignedScores`);

  const userData = data.userData;
  const scores = data.orderedActivityScores;
  const folder = data.folder;

  return { userData, scores, folder, isAssignedData: true };
}

export function StudentAssignmentScores() {
  const { userData, scores, folder, isAssignedData } = useLoaderData() as {
    userData: UserData;
    scores: OrderedActivityScore[];
    folder: Folder | null;
    isAssignedData: boolean;
  };

  useEffect(() => {
    document.title = `${createNameNoTag(userData)}'s Assignments`;
  });

  const navigate = useNavigate();

  return (
    <>
      <Box style={{ marginTop: 15, marginLeft: 15 }}>
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
      </Box>
      <Heading heading={`${createNameNoTag(userData)}'s Assignments`} />

      {folder ? (
        <Heading subheading={`${folder.name}`} />
      ) : (
        <Heading subheading="Score summary" />
      )}

      <TableContainer>
        <Table>
          <Thead>
            <Tr>
              <Th textTransform={"none"} fontSize="large">
                Assignment
              </Th>
              <Th textTransform={"none"} fontSize="large">
                Score
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {scores.map((score) => {
              return (
                <Tr key={`assignment${score.contentId}`}>
                  <Td key={`assignment_title${score.contentId}`}>
                    {score.score !== null ? (
                      <ChakraLink
                        as={ReactRouterLink}
                        to={
                          isAssignedData
                            ? `/assignedData/${score.contentId}?shuffledOrder`
                            : `/assignmentData/${score.contentId}/${userData.userId}`
                        }
                        textDecoration="underline"
                      >
                        {score.activityName}
                      </ChakraLink>
                    ) : (
                      score.activityName
                    )}
                  </Td>
                  <Td key={`score${score.contentId}`}>
                    {score.score !== null ? (
                      <ChakraLink
                        as={ReactRouterLink}
                        to={
                          isAssignedData
                            ? `/assignedData/${score.contentId}`
                            : `/assignmentData/${score.contentId}/${userData.userId}`
                        }
                        textDecoration="underline"
                      >
                        &nbsp;
                        {Math.round(score.score * 1000) / 10}
                        &nbsp;
                      </ChakraLink>
                    ) : (
                      <Text>&#8212;</Text>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
}
