import { ReactElement, useEffect, useRef, useState } from "react";
import {
  useLoaderData,
  useNavigate,
  useOutletContext,
  Link as ReactRouterLink,
} from "react-router";

import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  IconButton,
  Link as ChakraLink,
  List,
  ListItem,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Hide,
  Show,
  Text,
  Tooltip,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { BsPlayBtnFill } from "react-icons/bs";
import {
  MdEditNote,
  MdOutlineAdd,
  MdOutlineEditOff,
  MdOutlineInfo,
} from "react-icons/md";
import { useFetcher } from "react-router";

import axios from "axios";
import {
  Content,
  DoenetmlVersion,
  LibraryRelations,
  ActivityRemixItem,
  Doc,
  ProblemSet,
} from "../types";
import { CompoundActivityEditor } from "../views/CompoundActivityEditor";
import {
  compileActivityFromContent,
  contentTypeToName,
  getAllowedParentTypes,
  getClassificationAugmentedDescription,
  getDoenetMLDeprecationWarnings,
  getIconInfo,
  menuIcons,
} from "../utils/activity";
import { ActivitySource, isActivitySource } from "@doenet-tools/shared";
import { DoenetEditor, DoenetViewer } from "@doenet/doenetml-iframe";
import { ActivityViewer as DoenetActivityViewer } from "@doenet/assignment-viewer";
import { processRemixes } from "../utils/processRemixes";
import ContributorsMenu from "../dropdowns/ContributorsMenu";
import { ContentInfoDrawer } from "../drawers/ContentInfoDrawer";
import { createNameCheckCurateTag } from "../utils/names";
import { DisplayLicenseItem } from "../widgets/Licenses";
import { SiteContext } from "./SiteHeader";
import { AddContentToMenu } from "../popups/AddContentToMenu";
import { CopyContentAndReportFinish } from "../popups/CopyContentAndReportFinish";
import { CloseIcon } from "@chakra-ui/icons";
import { BsBookmarkCheck } from "react-icons/bs";
import { ImCheckmark } from "react-icons/im";
import { BlueBanner } from "../widgets/BlueBanner";
import { useIframeMenuDismissOverlay } from "../utils/useIframeMenuDismissOverlay";
import { IFRAME_MENU_IDS } from "../utils/iframeMenuIds";
import { useControlledMenu } from "../utils/useControlledMenu";
import { MenuDismissOverlay } from "../components/MenuDismissOverlay";

export async function loader({ params }: { params: any }) {
  const {
    data: { activity: activityData, remixSources, libraryRelations },
  } = await axios.get(
    `/api/activityEditView/getActivityViewerData/${params.contentId}`,
  );

  const contentId = params.contentId;

  if (activityData.type === "singleDoc") {
    const doenetML = activityData.doenetML;
    const doenetmlVersion: DoenetmlVersion = activityData.doenetmlVersion;

    const contributorHistory = processRemixes(remixSources);

    return {
      type: activityData.type,
      activityData,
      doenetML,
      doenetmlVersion,
      contentId,
      contributorHistory,
      libraryRelations,
    };
  } else {
    const activityJsonFromRevision = activityData.activityJson
      ? JSON.parse(activityData.activityJson)
      : null;

    const activityJson = isActivitySource(activityJsonFromRevision)
      ? activityJsonFromRevision
      : compileActivityFromContent(activityData);

    return {
      type: activityData.type,
      activityData,
      activityJson,
      contentId,
      contributorHistory: [],
      libraryRelations,
    };
  }
}

export function ActivityViewer() {
  const data = useLoaderData() as {
    contentId: string;
    libraryRelations: LibraryRelations;
    contributorHistory: ActivityRemixItem[];
  } & (
    | {
        type: "singleDoc";
        doenetML: string;
        doenetmlVersion: DoenetmlVersion;
        activityData: Doc;
      }
    | {
        type: "sequence";
        activityJson: ActivitySource;
        activityData: ProblemSet;
      }
  );

  const { activityData, contributorHistory, libraryRelations, type } = data;

  const { user, addTo, setAddTo, allLicenses } =
    useOutletContext<SiteContext>();

  const license =
    allLicenses.find((l) => l.code === activityData.licenseCode) ?? null;

  const navigate = useNavigate();

  const infoBtnRef = useRef<HTMLButtonElement>(null);
  const doenetViewerContainer = useRef<HTMLDivElement>(null);
  const scrollingContainer = useRef<HTMLDivElement>(null);

  const authorMode = user?.isAuthor;

  const [mode, setMode] = useState<"Edit" | "View">(
    authorMode ? "Edit" : "View",
  );
  const { anyMenuOpen, getMenuControl } = useIframeMenuDismissOverlay();
  const addToMenuControl = useControlledMenu(
    getMenuControl,
    IFRAME_MENU_IDS.activityViewerAddTo,
  );
  const addContentMenuControl = useControlledMenu(
    getMenuControl,
    IFRAME_MENU_IDS.activityViewerAddContent,
  );
  const contributorsMenuControl = useControlledMenu(
    getMenuControl,
    IFRAME_MENU_IDS.activityViewerContributors,
  );

  useEffect(() => {
    setMode(authorMode ? "Edit" : "View");
  }, [authorMode]);

  const fetcher = useFetcher();
  const createContentMenuCreateFetcher = useFetcher();
  const createContentMenuSaveNameFetcher = useFetcher();
  const deleteContentFetcher = useFetcher();

  useEffect(() => {
    document.title = `${activityData.name} - Doenet`;
  }, [activityData.name]);

  const [displayInfoTab, setDisplayInfoTab] = useState<
    "general" | "classifications"
  >("general");

  const [settingsContentId, setSettingsContentId] = useState<string | null>(
    null,
  );

  function matchSettingsContentId(content: Content): Content | undefined {
    if (content.contentId === settingsContentId) {
      return content;
    }
    if (content.type !== "singleDoc") {
      for (const child of content.children) {
        const res = matchSettingsContentId(child);
        if (res) {
          return res;
        }
      }
    }
    return undefined;
  }

  let contentData: Content | undefined;
  if (settingsContentId) {
    if (settingsContentId === activityData.contentId) {
      contentData = activityData;
    } else {
      if (data.type !== "singleDoc") {
        contentData = matchSettingsContentId(data.activityData);
      }
    }
  }

  const {
    isOpen: infoIsOpen,
    onOpen: infoOnOpen,
    onClose: infoOnClose,
  } = useDisclosure();

  const infoDrawer = contentData ? (
    <ContentInfoDrawer
      isOpen={infoIsOpen}
      onClose={infoOnClose}
      contentData={contentData}
      displayTab={displayInfoTab}
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
        contentIds={[activityData.contentId]}
        desiredParent={addTo}
        action="Add"
        setAddTo={setAddTo}
        user={user ?? null}
        fetcher={fetcher}
        onNavigate={navigate}
      />
    ) : null;

  let editLabel: string;
  let editLabelLong: string;
  let editTooltip: string;

  const editIcon = <MdOutlineEditOff size={20} />;
  if (authorMode) {
    if (data.type === "singleDoc") {
      editLabel = "See source";
      editLabelLong = "See source code";
      editTooltip = "See read-only view of source code";
    } else {
      editLabel = "See list";
      editLabelLong = "See list";
      editTooltip = `See read-only view of documents ${data.type === "sequence" ? "and question banks in the problem set" : "in the question bank"}`;
    }
  } else {
    editLabel = "See source";
    editLabelLong = "See source code";
    editTooltip = "Turn on author mode to see read-only view of source code";
  }

  const haveClassifications = activityData.classifications.length > 0;

  let mainContent: ReactElement<any> = <></>;

  const baseUrl = window.location.protocol + "//" + window.location.host;
  const doenetViewerUrl = `${baseUrl}/activityViewer`;

  function requestScrollTo(offset: number) {
    if (doenetViewerContainer.current && scrollingContainer.current) {
      const iframeTop =
        doenetViewerContainer.current.getBoundingClientRect().top +
        scrollingContainer.current.scrollTop;
      const targetAbsoluteTop = iframeTop + offset;

      scrollingContainer.current.scrollTo({
        top: targetAbsoluteTop - 50,
        behavior: "smooth",
      });
    }
  }

  const headerHeight = "140px";

  if (type === "singleDoc") {
    if (mode === "Edit") {
      const initialWarnings = getDoenetMLDeprecationWarnings(
        data.doenetmlVersion,
      );
      mainContent = (
        <DoenetEditor
          height={`calc(100vh - ${headerHeight})`}
          width="100%"
          doenetML={data.doenetML}
          doenetmlVersion={data.doenetmlVersion.fullVersion}
          initialWarnings={initialWarnings}
          border="none"
          readOnly={true}
          doenetViewerUrl={doenetViewerUrl}
        />
      );
    } else {
      mainContent = (
        <Box ref={doenetViewerContainer}>
          <BlueBanner headerHeight={headerHeight}>
            <DoenetViewer
              doenetML={data.doenetML}
              doenetmlVersion={data.doenetmlVersion.fullVersion}
              flags={{
                showCorrectness: true,
                solutionDisplayMode: "button",
                showFeedback: true,
                showHints: true,
                autoSubmit: false,
                allowLoadState: false,
                allowSaveState: false,
                allowLocalState: false,
                allowSaveEvents: false,
              }}
              attemptNumber={1}
              doenetViewerUrl={doenetViewerUrl}
              includeVariantSelector={true}
              requestScrollTo={requestScrollTo}
            />
          </BlueBanner>
        </Box>
      );
    }
  } else {
    if (mode === "Edit") {
      mainContent = (
        <CompoundActivityEditor
          activity={activityData}
          asViewer={true}
          fetcher={fetcher}
          createContentMenuCreateFetcher={createContentMenuCreateFetcher}
          createContentMenuSaveNameFetcher={createContentMenuSaveNameFetcher}
          deleteContentFetcher={deleteContentFetcher}
        />
      );
    } else {
      mainContent = (
        <BlueBanner headerHeight={headerHeight}>
          <DoenetActivityViewer
            source={data.activityJson}
            requestedVariantIndex={1}
            userId={"hi"}
            paginate={
              activityData.type === "sequence" ? activityData.paginate : false
            }
            activityLevelAttempts={
              activityData.assignmentInfo?.mode === "summative"
            }
            itemLevelAttempts={
              activityData.assignmentInfo?.mode === "formative"
            }
            maxAttemptsAllowed={activityData.assignmentInfo?.maxAttempts}
            showTitle={false}
            doenetViewerUrl={doenetViewerUrl}
          />
        </BlueBanner>
      );
    }
  }

  const contentTypeName = contentTypeToName[data.type];
  const ownerName = createNameCheckCurateTag(activityData.owner!);

  const { iconImage, iconColor } = getIconInfo(data.type, false);

  const typeIcon = (
    <Tooltip label={contentTypeName}>
      <Box>
        <Icon
          as={iconImage}
          color={iconColor}
          boxSizing="content-box"
          width="24px"
          height="24px"
          paddingRight="10px"
          verticalAlign="middle"
          aria-label={contentTypeName}
        />
      </Box>
    </Tooltip>
  );

  const allowedParents = getAllowedParentTypes([activityData.type]);

  const allowedParentWords = allowedParents.map((ct) =>
    contentTypeToName[ct].toLowerCase(),
  );

  let allowedParentsPhrase = allowedParentWords
    .slice(0, Math.max(1, allowedParentWords.length - 1))
    .join(", ");
  if (allowedParentWords.length > 1) {
    allowedParentsPhrase +=
      " or " + allowedParentWords[allowedParentWords.length - 1];
  }

  let addToMenu: ReactElement<any>;

  if (addTo) {
    addToMenu = (
      <Menu {...addToMenuControl.menuProps}>
        <MenuButton
          as={Button}
          size="sm"
          colorScheme="blue"
          leftIcon={<MdOutlineAdd size={20} />}
          paddingRight={{ base: "0px", md: "10px" }}
          data-test="Add To"
        >
          <Show above="md">Add to</Show>
        </MenuButton>
        <MenuList>
          <MenuItem
            data-test="Add To Selected"
            onClick={() => {
              copyDialogOnOpen();
            }}
          >
            {menuIcons[addTo.type]}{" "}
            {addTo.name.substring(0, 20) +
              (addTo.name.length > 20 ? "..." : "")}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAddTo(null);
            }}
          >
            <CloseIcon marginRight="10px" />
            Stop adding to:{" "}
            {addTo.name.substring(0, 20) +
              (addTo.name.length > 20 ? "..." : "")}
          </MenuItem>
        </MenuList>
      </Menu>
    );
  } else {
    addToMenu = (
      <AddContentToMenu
        fetcher={fetcher}
        sourceContent={[activityData]}
        size="sm"
        label={<Show above="md">Add to</Show>}
        addRightPadding={true}
        colorScheme="blue"
        toolTip={`Add ${contentTypeName.toLowerCase()} to ${allowedParentsPhrase}`}
        leftIcon={<MdOutlineAdd size={20} />}
        suggestToBeCuratedOption={
          activityData.type === "singleDoc" && !libraryRelations.activity
        }
        user={user ?? null}
        onNavigate={(url) => navigate(url)}
        setAddTo={setAddTo}
        isOpen={addContentMenuControl.menuProps.isOpen}
        onMenuOpenChange={addContentMenuControl.onMenuOpenChange}
      />
    );
  }

  return (
    <>
      {infoDrawer}
      {copyContentModal}
      <Grid
        background="doenet.lightBlue"
        height="calc(100vh - 40px)" //40px header height
        templateAreas={`"header"
      "centerContent"
      `}
        templateRows="100px auto"
        position="relative"
        ref={scrollingContainer}
        overflowY="scroll"
      >
        <GridItem
          area="header"
          height="100px"
          background="doenet.lightGray"
          width="100%"
        >
          <Flex flexDirection="column" alignItems="flex-start" mt="10px">
            <Grid
              templateAreas={`"leftControls label rightControls"`}
              templateColumns={{
                base: "82px calc(100% - 197px) 115px",
                sm: "87px calc(100% - 217px) 120px",
                md: "1fr 350px 1fr",
                lg: "1fr 450px 1fr",
              }}
              width="100%"
              height="40px"
            >
              <GridItem area="leftControls">
                <HStack ml={{ base: "5px", sm: "10px" }} mt="4px">
                  <Show above="md">
                    <Box width="50px" marginLeft="5px">
                      <ChakraLink
                        as={ReactRouterLink}
                        to={".."}
                        style={{
                          color: "var(--mainBlue)",
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(-1);
                        }}
                      >
                        {" "}
                        &lt; Back
                      </ChakraLink>
                    </Box>
                  </Show>
                  <ButtonGroup size="sm" isAttached variant="outline">
                    <Tooltip hasArrow label="View Activity">
                      <Button
                        data-test="View Mode Button"
                        isActive={mode == "View"}
                        size="sm"
                        pr={{ base: "0px", md: "10px" }}
                        colorScheme="blue"
                        leftIcon={<BsPlayBtnFill size={18} />}
                        onClick={() => {
                          setMode("View");
                        }}
                      >
                        <Show breakpoint="(min-width: 835px)">View</Show>
                      </Button>
                    </Tooltip>
                    <Tooltip hasArrow label={editTooltip}>
                      <Button
                        isActive={mode == "Edit"}
                        data-test="Edit Mode Button"
                        size="sm"
                        pr={{ base: "0px", md: "10px" }}
                        colorScheme="blue"
                        leftIcon={editIcon}
                        onClick={() => {
                          setMode("Edit");
                        }}
                      >
                        <Hide breakpoint="(max-width: 835px)">
                          <Show below="xl">{editLabel}</Show>
                          <Hide below="xl">{editLabelLong}</Hide>
                        </Hide>
                      </Button>
                    </Tooltip>
                  </ButtonGroup>
                </HStack>
              </GridItem>
              <GridItem area="label">
                <Flex justifyContent="center" alignItems="center">
                  {typeIcon}
                  <Text
                    fontSize="1.4em"
                    fontWeight="bold"
                    noOfLines={1}
                    data-test="Activity Name"
                  >
                    {activityData.name}
                  </Text>

                  {libraryRelations.source?.status === "PUBLISHED" ? (
                    <>
                      <Tooltip label="This activity is curated.">
                        <Box marginLeft="5px">
                          <ImCheckmark color="green" />
                        </Box>
                      </Tooltip>
                    </>
                  ) : null}
                  {libraryRelations.activity?.status === "PUBLISHED" && (
                    <Popover>
                      <PopoverTrigger>
                        <IconButton
                          marginLeft="5px"
                          variant="unstyled"
                          icon={
                            <BsBookmarkCheck
                              style={{ color: "var(--mainBlue)" }}
                            />
                          }
                          aria-label="A peer-reviewed version is available."
                          data-test="Library source"
                        />
                      </PopoverTrigger>
                      <PopoverContent>
                        <PopoverArrow />
                        <PopoverCloseButton />
                        <PopoverHeader style={{ fontWeight: "bold" }}>
                          This activity has been peer-reviewed!
                        </PopoverHeader>
                        <PopoverBody>
                          A{" "}
                          <ChakraLink
                            as={ReactRouterLink}
                            to={`/activityViewer/${libraryRelations.activity.activityContentId}`}
                            style={{ color: "var(--mainBlue)" }}
                          >
                            peer-reviewed
                          </ChakraLink>{" "}
                          version is available.
                        </PopoverBody>
                      </PopoverContent>
                    </Popover>
                  )}
                </Flex>
              </GridItem>
              <GridItem
                area="rightControls"
                display="flex"
                justifyContent="flex-end"
              >
                <HStack mr={{ base: "5px", sm: "10px" }}>
                  <ButtonGroup size="sm" isAttached variant="outline">
                    {user ? (
                      addToMenu
                    ) : (
                      <>
                        <Show above="xl">
                          <Button
                            data-test="Nav to signIn"
                            colorScheme="blue"
                            size="sm"
                            onClick={() => {
                              navigate("/signIn");
                            }}
                          >
                            Sign In To Use Content
                          </Button>
                        </Show>
                        {activityData.type === "singleDoc" &&
                          activityData.doenetmlVersion.default && (
                            <Tooltip
                              hasArrow
                              label={`Load into Scratch Pad`}
                              placement="bottom-end"
                            >
                              <Button
                                data-test="Load into Scratch Pad"
                                pr={{ base: "0px", md: "10px" }}
                                colorScheme="blue"
                                size="sm"
                                onClick={() => {
                                  navigate(
                                    `/scratchPad?contentId=${activityData.contentId}`,
                                  );
                                }}
                                leftIcon={<MdEditNote size={20} />}
                              >
                                <Show breakpoint="(min-width: 1030px)">
                                  Load into{" "}
                                </Show>
                                <Show above="md">Scratch Pad</Show>
                              </Button>
                            </Tooltip>
                          )}
                      </>
                    )}

                    <Tooltip
                      hasArrow
                      label={`${contentTypeName} Information`}
                      placement="bottom-end"
                    >
                      <Button
                        data-test="Info Button"
                        size="sm"
                        pr={{ base: "0px", md: "10px" }}
                        colorScheme="blue"
                        leftIcon={<MdOutlineInfo size={20} />}
                        onClick={() => {
                          setDisplayInfoTab("general");
                          setSettingsContentId(activityData.contentId);
                          infoOnOpen();
                        }}
                        ref={infoBtnRef}
                      >
                        <Show above="md">Info</Show>
                      </Button>
                    </Tooltip>
                  </ButtonGroup>
                </HStack>
              </GridItem>
            </Grid>

            <ContributorsMenu
              activity={activityData}
              contributorHistory={contributorHistory}
              isOpen={contributorsMenuControl.menuProps.isOpen}
              onMenuOpenChange={contributorsMenuControl.onMenuOpenChange}
            />
          </Flex>
        </GridItem>

        <GridItem area="centerContent" position="relative">
          {/*
            Dismiss layer used for iframe-safe menu close behavior.
          */}
          {anyMenuOpen && (
            <MenuDismissOverlay dataTest="ActivityViewer Menu Dismiss Overlay" />
          )}
          <VStack gap={0}>
            <Box
              background="var(--canvas)"
              width={mode === "Edit" ? "100%" : undefined}
              height="100%"
            >
              {mainContent}
            </Box>
            <Box
              hidden={mode === "Edit"}
              maxWidth="850px"
              width="100%"
              height="30vh"
              background="var(--canvas)"
              padding="0px"
              margin="0px"
            />
            <Flex
              hidden={mode === "Edit"}
              background="gray.600"
              maxWidth="850px"
              width="100%"
              color="var(--canvas)"
              padding="20px"
              minHeight="20vh"
            >
              <Box width={haveClassifications ? "70%" : "100%"}>
                {license ? (
                  license.isComposition ? (
                    <>
                      <p>
                        <strong>{activityData.name}</strong> by {ownerName} is
                        shared with these licenses:
                      </p>
                      <List spacing="20px" marginTop="10px">
                        {license.composedOf.map((comp) => (
                          <DisplayLicenseItem
                            licenseItem={comp}
                            key={comp.code}
                          />
                        ))}
                      </List>
                      <p style={{ marginTop: "10px" }}>
                        You are free to use either license when reusing this
                        work.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>{activityData.name}</strong> by {ownerName} is
                        shared using the license:
                      </p>
                      <List marginTop="10px">
                        <DisplayLicenseItem licenseItem={license} />
                      </List>
                    </>
                  )
                ) : (
                  <p>
                    <strong>{activityData.name}</strong> by {ownerName} is
                    shared, but a license was not specified. Contact the author
                    to determine in what ways you can reuse this activity.
                  </p>
                )}
              </Box>
              {haveClassifications ? (
                <Box
                  cursor="pointer"
                  onClick={() => {
                    setDisplayInfoTab("classifications");
                    setSettingsContentId(activityData.contentId);
                    infoOnOpen();
                  }}
                  marginLeft="40px"
                >
                  <Heading size="sm">Classifications</Heading>
                  <List data-test="Classifications Footer">
                    {activityData.classifications.map((classification, i) => {
                      return (
                        <Tooltip
                          key={i}
                          label={getClassificationAugmentedDescription(
                            classification,
                          )}
                        >
                          <ListItem>
                            {classification.code} (
                            {
                              classification.descriptions[0].subCategory
                                .category.system.shortName
                            }
                            )
                          </ListItem>
                        </Tooltip>
                      );
                    })}
                  </List>
                </Box>
              ) : null}
            </Flex>
          </VStack>
        </GridItem>
      </Grid>
    </>
  );
}
