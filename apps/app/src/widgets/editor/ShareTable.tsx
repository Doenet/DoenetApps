import { ReactNode } from "react";
import { UserInfoWithEmail } from "../../types";
import {
  Text,
  Box,
  Flex,
  Tooltip,
  CloseButton,
  VStack,
} from "@chakra-ui/react";
import { useFetcher } from "react-router";
import { createNameNoTag } from "../../utils/names";

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
  footerRow,
}: {
  contentId: string;
  isPublic: boolean;
  parentIsPublic: boolean;
  sharedWith: UserInfoWithEmail[];
  parentSharedWith: UserInfoWithEmail[];
  footerRow?: ReactNode;
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
    <Box maxHeight="200px" overflowY="auto" data-test="Share Table">
      <VStack as="ul" align="stretch" spacing={0} listStyleType="none" m={0}>
        {rows}
        {footerRow}
      </VStack>
    </Box>
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
    <Box as="li" px={0} py={0} listStyleType="none">
      <Box borderBottomWidth="1px" borderColor="gray.100">
        <Flex
          align="center"
          justify="space-between"
          gap="0.75rem"
          px="0.75rem"
          py="0.6rem"
        >
          <Box flex="1" minWidth={0}>
            <Text noOfLines={1}>
              <Text as="span" fontWeight="medium">
                {name}
              </Text>
              <Text as="span" color="gray.600" fontSize="sm">
                {` (${email})`}
              </Text>
            </Text>
          </Box>
          {onClose ? (
            <Tooltip label={closeLabel}>
              <CloseButton
                type="submit"
                size="sm"
                aria-label={closeLabel}
                onClick={onClose}
                flexShrink={0}
              />
            </Tooltip>
          ) : (
            <Text color="gray.700" fontSize="sm" flexShrink={0}>
              Inherited
            </Text>
          )}
        </Flex>
      </Box>
    </Box>
  );
}
