import { Box, Flex, Tooltip, Icon } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useLoaderData } from "react-router";

import { CardContent } from "../widgets/Card";
import CardList from "../widgets/CardList";
import axios from "axios";
import { Content } from "../types";
import { formatAssignmentBlurb } from "../utils/assignment";
import { NameBar } from "../widgets/NameBar";
import { BsPeople } from "react-icons/bs";
import { createNameNoTag } from "../utils/names";
import { useCardSelections } from "../hooks/cardSelections";

export async function loader() {
  const { data: results } = await axios.get(`/api/contentList/getSharedWithMe`);
  return results;
}

export function SharedWithMe() {
  const { content } = useLoaderData() as {
    content: Content[];
    userId: string;
  };

  // refs to the menu button of each content card,
  // which should be given focus when drawers are closed
  const cardMenuRefs = useRef<HTMLButtonElement[]>([]);

  const cardSelections = useCardSelections({
    ids: content.map((c) => c.contentId),
  });

  useEffect(() => {
    document.title = "Shared with me - Doenet";
  }, []);

  const titleIcon = (
    <Tooltip label={"Shared with me"}>
      <Box>
        <Icon
          as={BsPeople}
          boxSizing="content-box"
          width="24px"
          height="24px"
          mr="0.5rem"
          verticalAlign="middle"
          aria-label={"Shared with me"}
        />
      </Box>
    </Tooltip>
  );

  const headingText = (
    <NameBar
      contentId={null}
      contentName={"Shared with me"}
      isEditable={false}
      leftIcon={titleIcon}
      dataTest="Folder Title"
      fontSizeMode="folder"
    />
  );

  const heading = (
    <Flex
      justify="flex-start"
      align={["left", "center"]}
      pt="30px"
      pb="30px"
      flexDir={["column", "row"]}
      gap="5px"
    >
      {headingText}
    </Flex>
  );

  const emptyMessage = "Nothing shared with you right now.";

  const cardContent: CardContent[] = content.map((activity, position) => {
    const getCardMenuRef = (element: HTMLButtonElement) => {
      cardMenuRefs.current[position] = element;
    };

    const cardLink =
      activity.type === "folder"
        ? `/sharedActivities/${activity.ownerId}/${activity.contentId}`
        : `/activityViewer/${activity.contentId}`;

    const ownerName = createNameNoTag(activity.owner!);

    return {
      menuRef: getCardMenuRef,
      content: activity,
      blurb: formatAssignmentBlurb(activity),
      ownerName,
      cardLink,
    };
  });

  const mainPanel = (
    <CardList
      showOwnerName={true}
      showBlurb={true}
      showPublicStatus={true}
      showActivityCategories={true}
      emptyMessage={emptyMessage}
      cardContent={cardContent}
      selectedCards={cardSelections.ids}
      onCardSelected={cardSelections.add}
      onCardDeselected={cardSelections.remove}
    />
  );

  return (
    <Box
      data-test="Shared with me"
      width={{ base: "100%", md: "calc(100% - 40px)" }}
      background={"white"}
      ml={{ base: "0px", md: "20px" }}
      mr={{ base: "0px", md: "20px" }}
    >
      {heading}
      {mainPanel}
    </Box>
  );
}
