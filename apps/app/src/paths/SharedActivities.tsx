import {
  Box,
  Flex,
  Heading,
  Tooltip,
  List,
  MenuItem,
  useDisclosure,
  HStack,
  CloseButton,
  Text,
  Button,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  useLoaderData,
  useFetcher,
  Link,
  useOutletContext,
  useNavigate,
} from "react-router";

import { CardContent } from "../widgets/Card";
import axios from "axios";
import { createNameNoTag } from "../utils/names";
import { Content } from "../types";
import { DisplayLicenseItem } from "../widgets/Licenses";
import { ContentInfoDrawer } from "../drawers/ContentInfoDrawer";
import CardList from "../widgets/CardList";
import { menuIcons } from "../utils/activity";
import { SiteContext } from "./SiteHeader";
import { AddContentToMenu } from "../popups/AddContentToMenu";
import { CreateContentMenu } from "../dropdowns/CreateContentMenu";
import { CopyContentAndReportFinish } from "../popups/CopyContentAndReportFinish";
import { useCardSelections } from "../hooks/cardSelections";

export async function loader({ params }: { params: any }) {
  const { data } = await axios.get(
    `/api/contentList/getSharedContent/${params.ownerId}/${params.parentId ?? ""}`,
  );

  const { data: owner } = await axios.get(
    `/api/user/getUser/${params.ownerId}`,
  );

  return {
    content: data.content,
    ownerId: params.ownerId,
    owner,
    parent: data.parent,
  };
}

export function SharedActivities() {
  const { content, ownerId, owner, parent } = useLoaderData() as {
    content: Content[];
    ownerId: string;
    owner: {
      firstNames: string | null;
      lastNames: string;
    };
    parent: Content | null;
  };

  const { user, addTo, setAddTo, allLicenses } =
    useOutletContext<SiteContext>();

  const navigate = useNavigate();

  const parentLicense = parent
    ? (allLicenses.find((l) => l.code === parent.licenseCode) ?? null)
    : null;

  const cardSelections = useCardSelections({
    ids: content.map((c) => c.contentId),
  });

  const selectedContentDescriptions = content.filter((c) =>
    cardSelections.ids.has(c.contentId),
  );

  useEffect(() => {
    document.title = parent
      ? `Folder ${parent.name}`
      : `Shared Activities of ${createNameNoTag(owner)} - Doenet`;
  }, [owner, parent]);

  const fetcher = useFetcher();

  // Used by CreateContentMenu component
  const createContentMenuCreateFetcher = useFetcher();
  const createContentMenuSaveNameFetcher = useFetcher();

  const [infoContentId, setInfoContentId] = useState<string | null>(null);

  const {
    isOpen: infoIsOpen,
    onOpen: infoOnOpen,
    onClose: infoOnClose,
  } = useDisclosure();

  let contentData: Content | undefined;
  if (infoContentId) {
    const index = content.findIndex((obj) => obj.contentId == infoContentId);
    if (index != -1) {
      contentData = content[index];
    } else {
      //Throw error not found
    }
  }

  const infoDrawer =
    contentData && infoContentId ? (
      <ContentInfoDrawer
        isOpen={infoIsOpen}
        onClose={infoOnClose}
        contentData={contentData}
        allLicenses={allLicenses}
      />
    ) : null;

  const {
    isOpen: copyDialogIsOpen,
    onOpen: copyDialogOnOpen,
    onClose: copyDialogOnClose,
  } = useDisclosure();

  const copyContentModal =
    addTo !== null ? (
      <CopyContentAndReportFinish
        isOpen={copyDialogIsOpen}
        onClose={copyDialogOnClose}
        contentIds={[...cardSelections.ids]}
        desiredParent={addTo}
        action="Add"
        setAddTo={setAddTo}
        user={user ?? null}
        fetcher={fetcher}
        onNavigate={navigate}
      />
    ) : null;

  const headingText = parent ? (
    <>Folder: {parent.name}</>
  ) : (
    `Shared Activities of ${createNameNoTag(owner)}`
  );

  const heading = (
    <Box
      backgroundColor="#fff"
      color="#000"
      height="120px"
      width="100%"
      textAlign="center"
    >
      <Flex
        width="100%"
        paddingRight="0.5em"
        paddingLeft="1em"
        alignItems="middle"
      >
        <Box marginTop="5px" height="24px">
          {parent ? (
            <Link
              to={`/sharedActivities/${ownerId}${parent.parent ? "/" + parent.parent.contentId : ""}`}
              style={{
                color: "var(--mainBlue)",
              }}
            >
              {" "}
              &lt; Back to{" "}
              {parent.parent
                ? parent.parent.name
                : `Shared Activities of ${createNameNoTag(owner)}`}
            </Link>
          ) : null}
        </Box>
      </Flex>

      <Tooltip label={headingText}>
        <Heading
          as="h2"
          size="lg"
          noOfLines={1}
          height="46px"
          data-test="Folder Heading"
        >
          {headingText}
        </Heading>
      </Tooltip>

      <Flex
        width="100%"
        height="40px"
        justifyContent="center"
        alignItems="center"
      >
        <Flex
          height="30px"
          width="100%"
          alignContent="center"
          hidden={!cardSelections.areActive && addTo === null}
          backgroundColor="gray.100"
          justifyContent="center"
        >
          {addTo !== null ? (
            <HStack hidden={cardSelections.areActive}>
              <CloseButton
                size="sm"
                onClick={() => {
                  setAddTo(null);
                }}
              />{" "}
              <Text noOfLines={1}>
                Adding items to: {menuIcons[addTo.type]}
                <strong>{addTo.name}</strong>
              </Text>
            </HStack>
          ) : null}
          <HStack hidden={!cardSelections.areActive}>
            <CloseButton size="sm" onClick={cardSelections.clear} />{" "}
            <Text>{cardSelections.count} selected</Text>
            <HStack hidden={addTo !== null}>
              <AddContentToMenu
                fetcher={fetcher}
                sourceContent={selectedContentDescriptions}
                size="xs"
                colorScheme="blue"
                label="Add selected to"
                user={user ?? null}
                onNavigate={(url) => navigate(url)}
                setAddTo={setAddTo}
              />
              <CreateContentMenu
                sourceContent={selectedContentDescriptions}
                size="xs"
                colorScheme="blue"
                label="Create from selected"
                user={user ?? null}
                navigate={navigate}
                createFetcher={createContentMenuCreateFetcher}
                saveNameFetcher={createContentMenuSaveNameFetcher}
              />
            </HStack>
            {addTo !== null ? (
              <Button
                data-test="Add Selected To Button"
                size="xs"
                colorScheme="blue"
                onClick={() => {
                  copyDialogOnOpen();
                }}
              >
                Add selected to: {menuIcons[addTo.type]}
                <strong>
                  {addTo.name.substring(0, 10)}
                  {addTo.name.length > 10 ? "..." : ""}
                </strong>
              </Button>
            ) : null}
          </HStack>
        </Flex>
      </Flex>
    </Box>
  );

  const cardContent: CardContent[] = content.map((activity) => {
    const contentType = activity.type === "folder" ? "Folder" : "Activity";

    const menuItems = (
      <MenuItem
        data-test={`${contentType} Information`}
        onClick={() => {
          setInfoContentId(activity.contentId);
          infoOnOpen();
        }}
      >
        {contentType} information
      </MenuItem>
    );

    return {
      content: activity,
      cardLink:
        activity.type == "folder"
          ? `/sharedActivities/${activity.ownerId}/${activity.contentId}`
          : `/activityViewer/${activity.contentId}`,
      menuItems,
    };
  });

  const mainPanel = (
    <CardList
      showOwnerName={false}
      showBlurb={false}
      showPublicStatus={false}
      showActivityCategories={true}
      emptyMessage={"No Activities Yet"}
      cardContent={cardContent}
      includeSelectionBox={user ? true : false}
      selectedCards={cardSelections.ids}
      onCardSelected={cardSelections.add}
      onCardDeselected={cardSelections.remove}
      disableSelectFor={addTo ? [addTo.contentId] : undefined}
    />
  );

  return (
    <>
      {infoDrawer}
      {copyContentModal}
      {heading}
      <Flex
        data-test="Shared Activities"
        padding=".5em 10px"
        margin="0"
        width="100%"
        background={"white"}
        minHeight="calc(80vh - 130px)"
        flexDirection="column"
      >
        {mainPanel}
      </Flex>
      <Box
        background="gray"
        width="100%"
        color="var(--canvas)"
        padding="20px"
        minHeight="20vh"
      >
        {parent ? (
          parentLicense ? (
            parentLicense.isComposition ? (
              <>
                <p>
                  <strong>{parent.name}</strong> by {owner.firstNames}{" "}
                  {owner.lastNames} is shared with these licenses:
                </p>
                <List spacing="20px" marginTop="10px">
                  {parentLicense.composedOf.map((comp) => (
                    <DisplayLicenseItem licenseItem={comp} key={comp.code} />
                  ))}
                </List>
                <p style={{ marginTop: "10px" }}>
                  You are free to use either license when reusing this work.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>{parent.name}</strong> by {owner.firstNames}{" "}
                  {owner.lastNames} is shared using the license:
                </p>
                <List marginTop="10px">
                  <DisplayLicenseItem licenseItem={parentLicense} />
                </List>
              </>
            )
          ) : (
            <p>
              <strong>{parent.name}</strong> by {owner.firstNames}{" "}
              {owner.lastNames} is shared, but a license was not specified.
              Contact the author to determine in what ways you can reuse this
              activity.
            </p>
          )
        ) : null}
      </Box>
    </>
  );
}
