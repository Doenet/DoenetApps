import { Box, Button, Flex, Show } from "@chakra-ui/react";

import { Outlet, useLocation, useOutletContext } from "react-router";
import { Link as ReactRouterLink } from "react-router";
import { SiteContext } from "./SiteHeader";
import { Text } from "@chakra-ui/react";

/**
 * Layout for folder views, with side panel for navigation
 */
export function FolderContext() {
  const context = useOutletContext<SiteContext>();
  const location = useLocation();
  const activitiesPath = `/activities/${context.user?.userId ?? ""}`;
  const isActivitiesActive = location.pathname === activitiesPath;
  const isTrashActive = location.pathname.startsWith("/trash");
  const isSharedWithMeActive = location.pathname.startsWith("/sharedWithMe");

  const sidePanel = (
    <Flex
      width={{ base: "100%", md: "8rem", lg: "12rem" }}
      flexShrink={0}
      align="flex-start"
      // A hardcoded black divider is invisible on the dark background; use the
      // mode-flipping border token.
      borderRightWidth={{ base: "0", md: "2px" }}
      borderRightStyle="solid"
      borderRightColor="border"
      p={{ base: "0px", xl: "10px" }}
      minHeight={{ base: "fit-content", md: "100%" }}
      flexDir={{ base: "row", md: "column" }}
    >
      <Button
        as={ReactRouterLink}
        to={activitiesPath}
        variant="ghost"
        justifyContent="flex-start"
        width={isActivitiesActive ? "100%" : "calc(100% - 4px)"}
        backgroundColor={
          isActivitiesActive ? "doenet.lightBlue" : "transparent"
        }
        // Active bg is a fixed light blue, so pin dark text (ghost-button text
        // otherwise flips near-white in dark mode -> unreadable on light blue).
        color={isActivitiesActive ? "gray.800" : undefined}
        _hover={
          isActivitiesActive
            ? { backgroundColor: "doenet.lightBlue" }
            : { backgroundColor: "surfaceMuted" }
        }
        borderLeftWidth={isActivitiesActive ? "4px" : "0"}
        marginLeft={isActivitiesActive ? "0" : "4px"}
        borderLeftColor={isActivitiesActive ? "doenet.mainBlue" : "transparent"}
        aria-current={isActivitiesActive ? "page" : undefined}
        data-test="My Activities Link"
      >
        <Text fontSize="large">My Activities</Text>
      </Button>

      <Button
        as={ReactRouterLink}
        to={`/sharedWithMe/${context.user?.userId ?? ""}`}
        variant="ghost"
        justifyContent="flex-start"
        width={isSharedWithMeActive ? "100%" : "calc(100% - 4px)"}
        backgroundColor={
          isSharedWithMeActive ? "doenet.lightBlue" : "transparent"
        }
        color={isSharedWithMeActive ? "gray.800" : undefined}
        _hover={
          isSharedWithMeActive
            ? { backgroundColor: "doenet.lightBlue" }
            : { backgroundColor: "surfaceMuted" }
        }
        borderLeftWidth={isSharedWithMeActive ? "4px" : "0"}
        marginLeft={isSharedWithMeActive ? "0" : "4px"}
        borderLeftColor={
          isSharedWithMeActive ? "doenet.mainBlue" : "transparent"
        }
        aria-current={isSharedWithMeActive ? "page" : undefined}
        data-test="Shared With Me Button"
      >
        <Text fontSize="large">
          <Show above="lg">Shared with me</Show>
          <Show below="lg">Shared</Show>
        </Text>
      </Button>

      <Button
        as={ReactRouterLink}
        to={`/trash`}
        variant="ghost"
        justifyContent="flex-start"
        width={isTrashActive ? "100%" : "calc(100% - 4px)"}
        backgroundColor={isTrashActive ? "doenet.lightBlue" : "transparent"}
        color={isTrashActive ? "gray.800" : undefined}
        _hover={
          isTrashActive
            ? { backgroundColor: "doenet.lightBlue" }
            : { backgroundColor: "surfaceMuted" }
        }
        borderLeftWidth={isTrashActive ? "4px" : "0"}
        marginLeft={isTrashActive ? "0" : "4px"}
        borderLeftColor={isTrashActive ? "doenet.mainBlue" : "transparent"}
        aria-current={isTrashActive ? "page" : undefined}
        data-test="Trash Link"
      >
        <Text fontSize="large">Trash</Text>
      </Button>
    </Flex>
  );

  return (
    <Flex
      align="flex-start"
      overflowY="hidden"
      height="100%"
      width="100%"
      flexDir={{ base: "column", md: "row" }}
    >
      {sidePanel}
      <Box
        width={{
          base: "100%",
          md: "calc(100% - 8rem)",
          lg: "calc(100% - 12rem)",
        }}
        height="100%"
        overflowY="auto"
      >
        <Outlet context={context} />
      </Box>
    </Flex>
  );
}
