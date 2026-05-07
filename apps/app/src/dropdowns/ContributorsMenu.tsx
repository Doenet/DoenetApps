import { ChevronDownIcon } from "@chakra-ui/icons";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Flex,
  AvatarGroup,
  Text,
  Link as ChakraLink,
  Tooltip,
  HStack,
} from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router";
import { createNameNoTag, createNameCheckCurateTag } from "../utils/names";
import { Content, ActivityRemixItem } from "../types";
import { JSX } from "react";
import { AccessibleAvatar } from "../widgets/AccessibleAvatar";

export default function ContributorsMenu({
  contributorHistory,
  activity,
  isOpen,
  onMenuOpenChange,
}: {
  contributorHistory: ActivityRemixItem[];
  activity: Content;
  isOpen?: boolean;
  onMenuOpenChange?: (isOpen: boolean) => void;
}) {
  if (!activity.owner) {
    return null;
  }
  const ownerAvatarName = createNameNoTag(activity.owner);
  const ownerName = createNameCheckCurateTag(activity.owner);

  const byLine = (
    <>
      by{" "}
      <Tooltip
        label={`Go to ${ownerAvatarName}'s shared activities`}
        openDelay={1000}
      >
        <ChakraLink
          as={ReactRouterLink}
          to={`/sharedActivities/${activity.owner.userId}`}
          aria-label={`Go to ${ownerAvatarName}'s shared activities`}
        >
          {ownerName}
        </ChakraLink>
      </Tooltip>
    </>
  );

  let recentByLine: JSX.Element | null = null;
  if (contributorHistory.length > 0) {
    recentByLine = (
      <>
        remixed from{" "}
        <Tooltip
          label={`Go to ${contributorHistory[0].originContent.name}`}
          openDelay={1000}
        >
          <ChakraLink
            as={ReactRouterLink}
            to={`/activityViewer/${contributorHistory[0].originContent.contentId}`}
            aria-label={`Go to ${contributorHistory[0].originContent.name}`}
          >
            {contributorHistory[0].originContent.name} by{" "}
            {createNameCheckCurateTag(
              contributorHistory[0].originContent.owner,
            )}
          </ChakraLink>
        </Tooltip>
      </>
    );
  }

  const avatars = [
    <AccessibleAvatar
      key={`avatarauthor`}
      margin="6px 12px"
      border="0"
      size="sm"
      name={ownerAvatarName}
    />,
  ];

  avatars.push(
    ...contributorHistory.map((contrib_hist, i) => (
      <AccessibleAvatar
        key={`avatar${i}`}
        margin="6px 12px"
        border="0"
        size="sm"
        name={createNameNoTag(contrib_hist.originContent.owner)}
      />
    )),
  );

  function handleMenuOpen() {
    onMenuOpenChange?.(true);
  }

  function handleMenuClose() {
    onMenuOpenChange?.(false);
  }

  return (
    <Flex>
      <Menu isOpen={isOpen} onOpen={handleMenuOpen} onClose={handleMenuClose}>
        <MenuButton as="button" data-test="contributors menu">
          <Flex>
            <AvatarGroup size="sm" max={2}>
              {avatars}
            </AvatarGroup>
            <Flex ml="4px" mt="10px">
              <ChevronDownIcon />
            </Flex>
          </Flex>
        </MenuButton>
        <MenuList maxHeight="40vh" overflowY="auto">
          <MenuItem
            key={"miauthor"}
            data-test={"contributors menu item author"}
            padding="0px"
            paddingRight="12px"
            cursor="default"
          >
            <Tooltip
              label={`Go to ${ownerAvatarName}'s shared activities`}
              openDelay={1000}
            >
              <ChakraLink
                as={ReactRouterLink}
                to={`/sharedActivities/${activity.owner.userId}`}
                aria-label={`Go to ${ownerAvatarName}'s shared activities`}
              >
                {avatars[0]}{" "}
              </ChakraLink>
            </Tooltip>
            <HStack cursor="default">
              <Text noOfLines={1} maxWidth="400px">
                {activity.name}
              </Text>{" "}
              <Text>by {ownerName}</Text>
            </HStack>
          </MenuItem>
          {contributorHistory.map((contrib_hist, i) => {
            const menuText = `${contrib_hist.originContent.name} by ${createNameCheckCurateTag(contrib_hist.originContent.owner)}`;
            const activityRef = `/activityViewer/${contrib_hist.originContent.contentId}`;
            const activityLabel = `Go to ${contrib_hist.originContent.name}`;
            const userRef = `/sharedActivities/${contrib_hist.originContent.owner.userId}`;
            const userLabel = `Go to ${createNameNoTag(contrib_hist.originContent.owner)}'s shared activities`;
            return (
              <MenuItem
                key={`mi${i}`}
                data-test={`contributors menu item ${i}`}
                padding="0px"
                as={ReactRouterLink}
                to={activityRef}
                aria-label={activityLabel}
              >
                <Tooltip label={userLabel} openDelay={1000}>
                  <ChakraLink
                    as={ReactRouterLink}
                    to={userRef}
                    aria-label={userLabel}
                  >
                    {avatars[i + 1]}{" "}
                  </ChakraLink>
                </Tooltip>

                <Tooltip label={activityLabel} openDelay={1000}>
                  <ChakraLink
                    as={ReactRouterLink}
                    to={activityRef}
                    aria-label={activityLabel}
                  >
                    <Text padding="10px 0px">{menuText}</Text>
                  </ChakraLink>
                </Tooltip>
              </MenuItem>
            );
          })}
        </MenuList>
      </Menu>
      <Flex flexDirection="column" pt="10px" data-test="info on contributors">
        <Text fontSize="14px" ml="4px" lineHeight="1">
          {byLine}
        </Text>
        <Text fontSize="12px" ml="4px" mt="0px">
          {recentByLine}
          {contributorHistory.length > 2 && ", ..."}
        </Text>
      </Flex>
    </Flex>
  );
}
