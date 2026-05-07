import { useMemo } from "react";
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
  Heading,
  Tooltip,
} from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router";
import { createNameCheckCurateTag } from "../utils/names";
import { DateTime } from "luxon";
import { ActivityRemixItem } from "../types";

export function Remixes({
  remixes,
  haveChangedRemix = false,
}: {
  remixes: ActivityRemixItem[];
  haveChangedRemix?: boolean;
}) {
  const [directRemixes, otherRemixes] = useMemo(() => {
    if (remixes === null || remixes.length === 0) {
      return [[], []];
    }

    const direct: ActivityRemixItem[] = [];
    const other: ActivityRemixItem[] = [];

    for (const r of remixes) {
      if (r.directCopy) {
        direct.push(r);
      } else {
        other.push(r);
      }
    }

    return [direct, other];
  }, [remixes]);

  const createTableRows = (items: ActivityRemixItem[]) => {
    return (
      <>
        {items.map((ch, i) => {
          const compareLabel =
            `Compare activity with remix` +
            (ch.originContent.changed
              ? `, update activity to match remix, or ignore change in remix.`
              : ".");
          return (
            <Tr key={`ch${i}`} data-test={`Remix ${i + 1}`}>
              <Show above="sm">
                <Td>
                  <ChakraLink
                    as={ReactRouterLink}
                    to={`/activityViewer/${ch.remixContent.contentId}`}
                    textDecoration="underline"
                  >
                    <Text wordBreak="break-word" whiteSpace="normal">
                      {ch.remixContent.name}
                    </Text>
                  </ChakraLink>
                </Td>
                <Td>
                  <ChakraLink
                    as={ReactRouterLink}
                    to={`/sharedActivities/${ch.remixContent.owner.userId}`}
                    textDecoration="underline"
                  >
                    <Text
                      wordBreak="break-word"
                      whiteSpace="normal"
                      minWidth="50px"
                    >
                      {createNameCheckCurateTag(ch.remixContent.owner)}
                    </Text>
                  </ChakraLink>
                </Td>
              </Show>
              <Hide above="sm">
                <Td>
                  <VStack alignItems="left">
                    <Text wordBreak="break-word" whiteSpace="normal">
                      {ch.remixContent.name}
                    </Text>
                    <Text wordBreak="break-word" whiteSpace="normal">
                      {createNameCheckCurateTag(ch.remixContent.owner)}
                    </Text>
                  </VStack>
                </Td>
              </Hide>
              <Td>{ch.withLicenseCode}</Td>
              <Show above="sm">
                {/* Note: use timestampOriginContent as what the timestamp from when the previous was mixed, not when this doc was created */}
                <Td>
                  {DateTime.fromISO(ch.originContent.timestamp).toLocaleString(
                    DateTime.DATE_MED,
                  )}
                </Td>
              </Show>
              <Td>
                {ch.remixContent.changed && (
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
                    to={`/activityCompare/${ch.originContent.contentId}/${ch.remixContent.contentId}`}
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
      </>
    );
  };

  if (remixes === null) {
    return (
      <Flex>
        <Text marginRight="5px">Loading...</Text> <Spinner size="sm" />
      </Flex>
    );
  }

  if (remixes.length === 0) {
    return (
      <Text data-test="No Remixes">
        No visible remixes of this activity (yet!)
      </Text>
    );
  }

  const remixTable = (
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
              <Th textTransform="none">Activity Name</Th>
              <Th textTransform="none">Owner</Th>
            </Show>
            <Hide above="sm">
              <Th textTransform="none">
                <VStack alignItems="left">
                  <Text>Activity Name</Text>
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
          {otherRemixes.length > 0 && (
            <Tr>
              <Td colSpan={5}>
                <Heading as="h4" size="xs">
                  Direct remixes
                </Heading>
              </Td>
            </Tr>
          )}
          {createTableRows(directRemixes)}
          {otherRemixes.length > 0 && (
            <>
              <Tr>
                <Td colSpan={5}>
                  <Heading as="h4" size="xs">
                    Other remixes
                  </Heading>
                </Td>
              </Tr>
              {createTableRows(otherRemixes)}
            </>
          )}
          {haveChangedRemix && (
            <Tr>
              <Td colSpan={5} borderBottom="none" paddingTop="20px">
                &#x1f534; Indicates remix has changed
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </TableContainer>
  );

  return remixTable;
}
