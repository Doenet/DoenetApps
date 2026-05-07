import {
  Menu,
  MenuButton,
  MenuList,
  VStack,
  Box,
  Checkbox,
  MenuItem,
  Text,
  Link as ChakraLink,
  Tooltip,
} from "@chakra-ui/react";
import { UserInfoWithEmail } from "../../types";
import { createNameNoTag } from "../../utils/names";
import { AccessibleAvatar } from "../../widgets/AccessibleAvatar";
import { useFetcher, useLocation } from "react-router";

/**
 * User account menu with avatar icon.
 * Displays user avatar that opens a dropdown menu with account information,
 * settings (author mode toggle), and sign out option. Shows different options
 * for anonymous vs authenticated users.
 */
export function AccountIconAndCard({ user }: { user: UserInfoWithEmail }) {
  const currentPath = useLocation().pathname;
  const fetcher = useFetcher();

  return (
    <Menu>
      <MenuButton ml="0.5rem">
        <AccessibleAvatar
          size="sm"
          name={`${user.isAnonymous ? "?" : createNameNoTag(user)}`}
        />
      </MenuButton>
      <MenuList>
        <VStack mb="20px">
          <AccessibleAvatar
            size="xl"
            name={`${user.isAnonymous ? "?" : createNameNoTag(user)}`}
          />
          <Text>
            {user.isAnonymous ? "[Anonymous]" : createNameNoTag(user)}
          </Text>
          <Text>
            {user.isAnonymous
              ? `Nickname: ${createNameNoTag(user)}`
              : user.email}
          </Text>
          {user.isAnonymous ? (
            <ChakraLink href={`/signIn?redirect=${currentPath}`}>
              Sign in to save work
            </ChakraLink>
          ) : null}
          {!user.isAnonymous ? (
            <Box height="30px" alignContent="center" marginTop="20px">
              <Tooltip
                label="In author mode, activities default to displaying with their source code"
                openDelay={500}
                placement="bottom-end"
              >
                <label>
                  Author mode:{" "}
                  <Checkbox
                    marginTop="3px"
                    isChecked={user.isAuthor}
                    onChange={() => {
                      fetcher.submit(
                        {
                          path: "user/setIsAuthor",
                          isAuthor: !user.isAuthor,
                        },
                        {
                          method: "post",
                          encType: "application/json",
                        },
                      );
                    }}
                  />
                </label>
              </Tooltip>
            </Box>
          ) : null}
        </VStack>
        {!user.isAnonymous && (
          <MenuItem
            as={ChakraLink}
            // When name change complete, redirect back to current page
            href={`/changeName?redirect=${currentPath}`}
          >
            Update name
          </MenuItem>
        )}
        <MenuItem
          as="a"
          href="/api/login/logout"
          onClick={() => {
            localStorage.removeItem("scratchPad");
          }}
        >
          {user.isAnonymous ? "Clear anonymous data" : "Log Out"}
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
