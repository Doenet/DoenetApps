import {
  Button,
  Box,
  Flex,
  Heading,
  Tooltip,
  Spacer,
  HStack,
  VStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from "@chakra-ui/react";
import { useEffect } from "react";
import { useLoaderData, Link } from "react-router";

import { CardContent } from "../widgets/Card";
import CardList from "../widgets/CardList";
import axios from "axios";
import { Content, LibraryRelations } from "../types";
import { createNameCheckIsMeTag, createNameNoTag } from "../utils/names";
import { intWithCommas } from "../utils/formatting";
import { DateTime } from "luxon";
import { editorUrl } from "../utils/url";

export async function loader() {
  const { data: pendingRequests } = await axios.get(
    `/api/curate/getCurationQueue`,
  );
  return pendingRequests;
}

export function Curate() {
  const {
    pendingContent,
    pendingLibraryRelations,
    underReviewContent,
    underReviewLibraryRelations,
    rejectedContent,
    rejectedLibraryRelations,
    publishedContent,
    publishedLibraryRelations,
  } = useLoaderData() as {
    pendingContent: Content[];
    pendingLibraryRelations: LibraryRelations[];
    underReviewContent: Content[];
    underReviewLibraryRelations: LibraryRelations[];
    rejectedContent: Content[];
    rejectedLibraryRelations: LibraryRelations[];
    publishedContent: Content[];
    publishedLibraryRelations: LibraryRelations[];
  };

  useEffect(() => {
    document.title = `Curate - Doenet`;
  }, []);

  function displayCardList(
    content: Content[],
    libraryRelations: LibraryRelations[],
    showLibraryEditor: boolean,
    minHeight?: string | { base: string; lg: string },
  ) {
    const cardContent: CardContent[] = content.map((contentData, idx) => {
      const cardLink =
        editorUrl(contentData.contentId, contentData.type) + "?curate";

      const librarySource = libraryRelations[idx].source!;

      const requestDate = DateTime.fromISO(
        librarySource.reviewRequestDate!,
      ).toLocaleString(DateTime.DATE_MED);

      const libraryEditorAvatarName = showLibraryEditor
        ? createNameNoTag(librarySource.primaryEditor!)
        : undefined;
      const libraryEditorName = showLibraryEditor
        ? createNameCheckIsMeTag(
            librarySource.primaryEditor!,
            librarySource.iAmPrimaryEditor!,
          )
        : undefined;

      return {
        content: contentData,
        ownerName: createNameNoTag(contentData.owner!),
        libraryEditorName,
        libraryEditorAvatarName,
        blurb: `Requested on ${requestDate}`,
        cardLink,
      };
    });

    return (
      <Box
        background={"white"}
        paddingTop="16px"
        paddingBottom="16px"
        minHeight={minHeight}
      >
        <CardList
          showPublicStatus={false}
          showBlurb={true}
          showActivityCategories={true}
          showOwnerName={true}
          showLibraryEditor={showLibraryEditor}
          cardContent={cardContent}
          emptyMessage={"No Activities Found!"}
        />
      </Box>
    );
  }

  const heading = (
    <Box
      backgroundColor="#fff"
      color="#000"
      height="130px"
      width="100%"
      textAlign="center"
    >
      <Heading
        as="h2"
        size="lg"
        margin=".5em"
        noOfLines={1}
        maxHeight="1.5em"
        lineHeight="normal"
        data-test="Folder Heading"
      >
        <Tooltip label="Pending curation requests">Curate</Tooltip>
      </Heading>
      <VStack width="100%">
        <Flex marginRight="1em" width="100%">
          <Spacer />
          <HStack>
            <Button
              as={Link}
              size="sm"
              colorScheme="blue"
              // hidden={searchOpen}
              data-test="See Library Button"
              to="/libraryActivities"
            >
              See Library
            </Button>
          </HStack>
        </Flex>
      </VStack>
    </Box>
  );

  const results = (
    <Tabs variant="enclosed-colored">
      <TabList>
        <Tab data-test="Pending Tab">
          Pending ({intWithCommas(pendingContent.length || 0)})
        </Tab>
        <Tab data-test="Under Review Tab">
          Under Review ({intWithCommas(underReviewContent.length || 0)})
        </Tab>
        <Tab data-test="Rejected Tab">
          Rejected ({intWithCommas(rejectedContent.length || 0)})
        </Tab>
        <Tab data-test="Published Tab">
          Published ({intWithCommas(publishedContent.length || 0)})
        </Tab>
      </TabList>

      <TabPanels data-test="Curation">
        <TabPanel padding={0} data-test="Pending Results">
          {displayCardList(pendingContent, pendingLibraryRelations, false)}
        </TabPanel>
        <TabPanel padding={0} data-test="Under Review Results">
          {displayCardList(
            underReviewContent,
            underReviewLibraryRelations,
            true,
          )}
        </TabPanel>
        <TabPanel padding={0} data-test="Rejected Results">
          {displayCardList(rejectedContent, rejectedLibraryRelations, true)}
        </TabPanel>
        <TabPanel padding={0} data-test="Published Results">
          {displayCardList(publishedContent, publishedLibraryRelations, true)}
        </TabPanel>
      </TabPanels>
    </Tabs>
  );

  return (
    <>
      {heading}
      {results}
    </>
  );
}
