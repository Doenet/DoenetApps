import { ReactNode } from "react";
import { UserInfoWithEmail } from "../../types";
import {
  Hide,
  Show,
  Text,
  Td,
  Tr,
  VStack,
  Tooltip,
  CloseButton,
  TableContainer,
  Table,
  Thead,
  Th,
  Tbody,
  HStack,
} from "@chakra-ui/react";
import { useFetcher } from "react-router";
import { createNameNoTag } from "../../utils/names";
import { SpinnerWhileFetching } from "../../utils/optimistic_ui";

/**
 * This widget renders a table listing all the people this activity is shared with.
 * Users can also X out any of the rows to remove a person.
 *
 * This widget must be used on a React Router page that accepts actions encoded as `application/json`.
 */
export function ShareTable({
  contentId,
  isPublic,
  parentIsPublic,
  sharedWith,
  parentSharedWith,
}: {
  contentId: string;
  isPublic: boolean;
  parentIsPublic: boolean;
  sharedWith: UserInfoWithEmail[];
  parentSharedWith: UserInfoWithEmail[];
}) {
  const fetcher = useFetcher();
  const rows: ReactNode[] = [];

  if (isPublic) {
    const onClose = parentIsPublic
      ? undefined
      : () => {
          fetcher.submit(
            { path: "share/setContentIsPublic", contentId, isPublic: false },
            { method: "post", encType: "application/json" },
          );
        };
    rows.push(
      <ShareTableRow
        key="public"
        name="Everyone"
        email="(shared publicly)"
        onClose={onClose}
        publicRow={true}
      />,
    );
  }

  for (const user of sharedWith) {
    const sharedViaFolder =
      (parentSharedWith.findIndex((cs) => cs.userId === user.userId) ?? -1) !==
      -1;

    const onClose = sharedViaFolder
      ? undefined
      : () => {
          fetcher.submit(
            { path: "share/unshareContent", contentId, userId: user.userId },
            { method: "post", encType: "application/json" },
          );
        };

    if (user.email === null) {
      throw new Error("User email is null in ShareTable");
    }

    rows.push(
      <ShareTableRow
        key={user.userId}
        name={createNameNoTag(user)}
        email={user.email}
        onClose={onClose}
      />,
    );
  }

  return (
    <TableContainer
      maxHeight="200px"
      overflowY="auto"
      marginBottom="20px"
      marginTop="20px"
      position="relative"
    >
      <Table size="sm" data-test="Share Table">
        <Thead position="sticky" top={0} backgroundColor="var(--canvas)">
          <Tr>
            <Th
              colSpan={3}
              textTransform="none"
              color="inherit"
              fontSize="inherit"
              fontWeight="inherit"
              fontFamily="inherit"
              paddingLeft="0px"
              fontStyle="inherit"
            >
              <HStack>
                <Text>People with access</Text>
                <SpinnerWhileFetching state={fetcher.state} />
              </HStack>
            </Th>
          </Tr>
        </Thead>
        <Tbody>{rows}</Tbody>
      </Table>
    </TableContainer>
  );
}

function ShareTableRow({
  name,
  email,
  onClose,
  publicRow = false,
}: {
  name: string;
  email: string;
  onClose?: () => void;
  publicRow?: boolean;
}) {
  const closeLabel = `Stop sharing ${publicRow ? "publicly" : `with ${name}`}`;
  return (
    <Tr>
      <Show above="sm">
        <Td>{name}</Td>
        <Td>{email}</Td>
      </Show>
      <Hide above="sm">
        <Td>
          <VStack alignItems="left">
            <Text>{name}</Text>
            <Text>{email}</Text>
          </VStack>
        </Td>
      </Hide>
      <Td>
        {onClose ? (
          <Tooltip label={closeLabel}>
            <CloseButton
              type="submit"
              aria-label={closeLabel}
              onClick={onClose}
            />
          </Tooltip>
        ) : (
          "(inherited)"
        )}
      </Td>
    </Tr>
  );
}
