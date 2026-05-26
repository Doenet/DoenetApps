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
      borderRight={{ base: "none", md: "solid 2px black" }}
      borderBottom={{ base: "solid 2px black", md: "none" }}
      p={{ base: "0px", xl: "10px" }}
      minHeight={{ base: "fit-content", md: "100%" }}
      flexDir={{ base: "row", md: "column" }}
    >
      <Button
        as={ReactRouterLink}
        to={activitiesPath}
        variant="ghost"
        justifyContent="flex-start"
        width={{
          base: "auto",
          md: isActivitiesActive ? "100%" : "calc(100% - 4px)",
        }}
        backgroundColor={
          isActivitiesActive ? "doenet.lightBlue" : "transparent"
        }
        _hover={
          isActivitiesActive
            ? { backgroundColor: "doenet.lightBlue" }
            : { backgroundColor: "gray.50" }
        }
        borderLeftWidth={{ base: "0", md: isActivitiesActive ? "4px" : "0" }}
        marginLeft={{ base: "0", md: isActivitiesActive ? "0" : "4px" }}
        borderLeftColor={isActivitiesActive ? "doenet.mainBlue" : "transparent"}
        borderBottomWidth={{ base: isActivitiesActive ? "3px" : "0", md: "0" }}
        borderBottomColor={
          isActivitiesActive ? "doenet.mainBlue" : "transparent"
        }
        opacity={{ base: isActivitiesActive ? 1 : 0.5, md: 1 }}
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
        width={{
          base: "auto",
          md: isSharedWithMeActive ? "100%" : "calc(100% - 4px)",
        }}
        backgroundColor={
          isSharedWithMeActive ? "doenet.lightBlue" : "transparent"
        }
        _hover={
          isSharedWithMeActive
            ? { backgroundColor: "doenet.lightBlue" }
            : { backgroundColor: "gray.50" }
        }
        borderLeftWidth={{ base: "0", md: isSharedWithMeActive ? "4px" : "0" }}
        marginLeft={{ base: "0", md: isSharedWithMeActive ? "0" : "4px" }}
        borderLeftColor={
          isSharedWithMeActive ? "doenet.mainBlue" : "transparent"
        }
        borderBottomWidth={{
          base: isSharedWithMeActive ? "3px" : "0",
          md: "0",
        }}
        borderBottomColor={
          isSharedWithMeActive ? "doenet.mainBlue" : "transparent"
        }
        opacity={{ base: isSharedWithMeActive ? 1 : 0.5, md: 1 }}
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
        width={{
          base: "auto",
          md: isTrashActive ? "100%" : "calc(100% - 4px)",
        }}
        backgroundColor={isTrashActive ? "doenet.lightBlue" : "transparent"}
        _hover={
          isTrashActive
            ? { backgroundColor: "doenet.lightBlue" }
            : { backgroundColor: "gray.50" }
        }
        borderLeftWidth={{ base: "0", md: isTrashActive ? "4px" : "0" }}
        marginLeft={{ base: "0", md: isTrashActive ? "0" : "4px" }}
        borderLeftColor={isTrashActive ? "doenet.mainBlue" : "transparent"}
        borderBottomWidth={{ base: isTrashActive ? "3px" : "0", md: "0" }}
        borderBottomColor={isTrashActive ? "doenet.mainBlue" : "transparent"}
        opacity={{ base: isTrashActive ? 1 : 0.5, md: 1 }}
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
