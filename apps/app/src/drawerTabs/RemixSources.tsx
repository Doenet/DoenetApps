import {
  Flex,
  Hide,
  Link as ChakraLink,
  Show,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Tooltip,
} from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router";
import { createNameCheckCurateTag } from "../utils/names";
import { DateTime } from "luxon";
import { ActivityRemixItem } from "../types";

export async function remixSourcesActions({
  formObj: _formObj,
}: {
  [k: string]: any;
}) {
  return null;
}

export function RemixSources({
  contributorHistory,
  haveChangedSource = false,
}: {
  contributorHistory: ActivityRemixItem[];
  haveChangedSource?: boolean;
}) {
  if (contributorHistory === null) {
    return (
      <Flex>
        <Text marginRight="5px">Loading...</Text> <Spinner size="sm" />
      </Flex>
    );
  }

  if (contributorHistory.length === 0) {
    return (
      <Text data-test="Not Remixed">Not remixed from other activities</Text>
    );
  }

  const historyTable = (
    <TableContainer
      maxHeight="calc(100% - 32px)"
      overflowY="auto"
      marginBottom="20px"
      marginTop="20px"
      position="relative"
    >
      <Table size="sm">
        <Thead position="sticky" top={0} backgroundColor="var(--canvas)">
          <Tr>
            <Show above="sm">
              <Th textTransform="none">Remixed Activity</Th>
              <Th textTransform="none">Owner</Th>
            </Show>
            <Hide above="sm">
              <Th textTransform="none">
                <VStack alignItems="left">
                  <Text>Remixed Activity</Text>
                  <Text>Owner</Text>
                </VStack>
              </Th>
            </Hide>
            <Th textTransform="none">License</Th>
            <Show above="sm">
              <Th textTransform="none">Date copied</Th>
            </Show>
          </Tr>
        </Thead>
        <Tbody>
          {contributorHistory.map((ch, i) => {
            const compareLabel =
              `Compare activity with remix source` +
              (ch.originContent.changed
                ? `, update activity to match source, or ignore change in source.`
                : ".");
            return (
              <Tr key={`ch${i}`} data-test={`Remix source ${i + 1}`}>
                <Show above="sm">
                  <Td>
                    <ChakraLink
                      as={ReactRouterLink}
                      to={`/activityViewer/${ch.originContent.contentId}`}
                      textDecoration="underline"
                    >
                      <Text wordBreak="break-word" whiteSpace="normal">
                        {ch.originContent.name}
                      </Text>
                    </ChakraLink>
                  </Td>
                  <Td>
                    <ChakraLink
                      as={ReactRouterLink}
                      to={`/sharedActivities/${ch.originContent.owner.userId}`}
                      textDecoration="underline"
                    >
                      <Text
                        wordBreak="break-word"
                        whiteSpace="normal"
                        minWidth="50px"
                      >
                        {createNameCheckCurateTag(ch.originContent.owner)}
                      </Text>
                    </ChakraLink>
                  </Td>
                </Show>
                <Hide above="sm">
                  <Td>
                    <VStack alignItems="left">
                      <Text wordBreak="break-word" whiteSpace="normal">
                        {ch.originContent.name}
                      </Text>
                      <Text wordBreak="break-word" whiteSpace="normal">
                        {createNameCheckCurateTag(ch.originContent.owner)}
                      </Text>
                    </VStack>
                  </Td>
                </Hide>
                <Td>{ch.withLicenseCode}</Td>
                <Show above="sm">
                  {/* Note: use timestampOriginContent as what the timestamp from when the previous was mixed, not when this doc was created */}
                  <Td>
                    {DateTime.fromISO(
                      ch.originContent.timestamp,
                    ).toLocaleString(DateTime.DATE_MED)}
                  </Td>
                </Show>
                <Td>
                  {ch.originContent.changed && (
                    <Text fontSize="small" marginRight="5px" as="span">
                      &#x1f534;
                    </Text>
                  )}
                  <Tooltip
                    label={compareLabel}
                    openDelay={500}
                    placement="bottom-end"
                  >
                    <ChakraLink
                      as={ReactRouterLink}
                      to={`/activityCompare/${ch.remixContent.contentId}/${ch.originContent.contentId}`}
                      textDecoration="underline"
                      aria-label={compareLabel}
                    >
                      Compare
                    </ChakraLink>
                  </Tooltip>
                </Td>
              </Tr>
            );
          })}
          {haveChangedSource && (
            <Tr>
              <Td colSpan={5} borderBottom="none" paddingTop="20px">
                &#x1f534; Indicates remix source has changed
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </TableContainer>
  );

  return historyTable;
}
