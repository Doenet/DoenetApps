import { ReactElement, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Link as ChakraLink,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
  Flex,
  List,
  ListItem,
  Tooltip,
  Heading,
  VStack,
  Grid,
  GridItem,
  Button,
  Input,
  Show,
  Hide,
  CloseButton,
  HStack,
} from "@chakra-ui/react";
import {
  Link as ReactRouterLink,
  useLoaderData,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router";
import Searchbar from "../widgets/SearchBar";
import { Form, useFetcher } from "react-router";
import { CardContent } from "../widgets/Card";
import { createNameNoTag, createNameCheckCurateTag } from "../utils/names";
import { Content, UserInfo, PartialContentClassification } from "../types";
import { CategoryGroup } from "@doenet-tools/shared";
import CardList from "../widgets/CardList";
import { intWithCommas } from "../utils/formatting";
import { MdFilterAlt, MdFilterAltOff } from "react-icons/md";
import { clearQueryParameter } from "../utils/explore";
import { FilterPanel } from "../widgets/FilterPanel";
import { ExploreFilterDrawer } from "../drawers/ExploreFilterDrawer";
import { menuIcons } from "../utils/activity";
import { SiteContext } from "./SiteHeader";
import { AddContentToMenu } from "../popups/AddContentToMenu";
import { CopyContentAndReportFinish } from "../popups/CopyContentAndReportFinish";
import { CreateContentMenu } from "../dropdowns/CreateContentMenu";
import { useCardSelections } from "../hooks/cardSelections";

export async function loader({
  params,
  request,
}: {
  params: any;
  request: any;
}) {
  const classificationId = params.classificationId
    ? Number(params.classificationId)
    : undefined;
  const subCategoryId = params.subCategoryId
    ? Number(params.subCategoryId)
    : undefined;
  const categoryId = params.categoryId ? Number(params.categoryId) : undefined;
  let systemId = params.systemId ? Number(params.systemId) : undefined;

  let isUnclassified = false;
  if (systemId === 0) {
    systemId = undefined;
    isUnclassified = true;
  }

  const {
    data: { allCategories },
  }: { data: { allCategories: CategoryGroup[] } } = await axios.get(
    `/api/info/getAllCategories`,
  );

  const url = new URL(request.url);

  const categories: Set<string> = new Set();
  for (const categoryGroup of allCategories) {
    for (const category of categoryGroup.categories) {
      if (url.searchParams.has(category.code)) {
        categories.add(category.code);
      }
    }
  }

  const authorId = url.searchParams.get("author") ?? undefined;

  const q = url.searchParams.get("q");

  if (q) {
    //Show search results
    const { data: searchData } = await axios.post(
      `/api/explore/searchExplore`,
      {
        query: q,
        categories: [...categories.keys()],
        isUnclassified,
        systemId,
        categoryId,
        subCategoryId,
        classificationId,
        ownerId: authorId,
      },
    );

    return {
      q,
      ...searchData,
      searchedContent: searchData.content,
      categories,
      allCategories,
    };
  } else {
    const { data: browseData } = await axios.post(
      "/api/explore/browseExplore",
      {
        categories: [...categories.keys()],
        isUnclassified,
        systemId,
        categoryId,
        subCategoryId,
        classificationId,
        ownerId: authorId,
      },
    );

    return {
      ...browseData,
      categories,
      allCategories,
    };
  }
}

export function Explore() {
  const {
    q,
    topAuthors,
    matchedAuthors,
    authorInfo,
    recentContent,
    trendingContent,
    curatedContent,
    searchedContent,
    matchedClassifications,
    matchedSubCategories,
    matchedCategories,
    classificationBrowse,
    subCategoryBrowse,
    categoryBrowse,
    systemBrowse,
    classificationInfo,
    totalCount,
    countByCategory,
    categories,
    allCategories,
  } = useLoaderData() as {
    q?: string;
    topAuthors: UserInfo[] | null;
    matchedAuthors: UserInfo[] | undefined;
    authorInfo: UserInfo | null;
    recentContent?: Content[];
    trendingContent?: Content[];
    curatedContent?: Content[];
    searchedContent?: Content[];
    matchedClassifications: PartialContentClassification[] | null | undefined;
    matchedSubCategories: PartialContentClassification[] | null | undefined;
    matchedCategories: PartialContentClassification[] | null | undefined;
    classificationBrowse: PartialContentClassification[] | null;
    subCategoryBrowse: PartialContentClassification[] | null;
    categoryBrowse: PartialContentClassification[] | null;
    systemBrowse: PartialContentClassification[] | null;
    classificationInfo: PartialContentClassification | null;
    totalCount: { numCurated?: number; numCommunity?: number };
    countByCategory: Record<
      string,
      { numCurated?: number; numCommunity?: number }
    >;
    categories: Set<string>;
    allCategories: CategoryGroup[];
  };

  const {
    user,
    exploreTab: currentTab,
    setExploreTab: setCurrentTab,
    addTo,
    setAddTo,
  } = useOutletContext<SiteContext>();

  const [searchString, setSearchString] = useState(q || "");

  const fetcher = useFetcher();

  // Used by CreateContentMenu component
  const createContentMenuCreateFetcher = useFetcher();
  const createContentMenuSaveNameFetcher = useFetcher();

  const allContent: Content[] = [
    ...(recentContent ?? []),
    ...(trendingContent ?? []),
    ...(curatedContent ?? []),
    ...(searchedContent ?? []),
  ];

  const cardSelections = useCardSelections({
    ids: allContent.map((c) => c.contentId),
  });

  const selectedContentDescriptions: Content[] = [];
  const seenContentIds = new Set<string>();
  for (const content of allContent) {
    if (
      cardSelections.ids.has(content.contentId) &&
      !seenContentIds.has(content.contentId)
    ) {
      selectedContentDescriptions.push(content);
      seenContentIds.add(content.contentId);
    }
  }

  const { search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `Explore - Doenet`;
  }, []);

  useEffect(() => {
    setSearchString(q || "");
    if (currentTab == null || (!q && currentTab > 1)) {
      setCurrentTab(!totalCount.numCurated && totalCount.numCommunity ? 1 : 0);
    }
  }, [
    currentTab,
    q,
    setCurrentTab,
    totalCount.numCommunity,
    totalCount.numCurated,
  ]);

  const {
    isOpen: filterIsOpen,
    onOpen: filterOnOpen,
    onClose: filterOnClose,
  } = useDisclosure();

  const filterDrawer = (
    <ExploreFilterDrawer
      isOpen={filterIsOpen}
      onClose={filterOnClose}
      topAuthors={topAuthors}
      authorInfo={authorInfo}
      classificationBrowse={classificationBrowse}
      subCategoryBrowse={subCategoryBrowse}
      categoryBrowse={categoryBrowse}
      systemBrowse={systemBrowse}
      classificationInfo={classificationInfo}
      countByCategory={countByCategory}
      categories={categories}
      allCategories={allCategories}
      search={search}
      navigate={navigate}
    />
  );

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

  const curatedContentDisplay = useMemo(
    () =>
      curatedContent
        ? displayMatchingContent(curatedContent, {
            base: `calc(100vh - ${q ? "250" : "210"}px)`,
            lg: `calc(100vh - ${q ? "210" : "170"}px)`,
          })
        : null,
    [displayMatchingContent, curatedContent, q],
  );

  const trendingContentDisplay = useMemo(
    () => (trendingContent ? displayMatchingContent(trendingContent) : null),
    [trendingContent, displayMatchingContent],
  );

  const recentContentDisplay = useMemo(
    () =>
      recentContent
        ? displayMatchingContent(recentContent, {
            base: `calc(100vh - ${q ? "250" : "210"}px)`,
            lg: `calc(100vh - ${q ? "210" : "170"}px)`,
          })
        : null,
    [displayMatchingContent, recentContent, q],
  );

  const searchedContentDisplay = useMemo(
    () =>
      searchedContent
        ? displayMatchingContent(searchedContent, {
            base: `calc(100vh - ${q ? "250" : "210"}px)`,
            lg: `calc(100vh - ${q ? "210" : "170"}px)`,
          })
        : null,
    [displayMatchingContent, searchedContent, q],
  );

  // TODO: figure out functions inside hooks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  function displayMatchingContent(
    matches: Content[],
    minHeight?: string | { base: string; lg: string },
  ) {
    const cardContent: CardContent[] = matches.map((itemObj) => {
      const { contentId, owner, type: contentType } = itemObj;
      const cardLink =
        contentType === "folder" && owner != undefined
          ? `/sharedActivities/${owner.userId}/${contentId}`
          : `/activityViewer/${contentId}`;

      const ownerAvatarName = createNameNoTag(owner!);
      const ownerName = createNameCheckCurateTag(owner!);

      return {
        contentId,
        content: itemObj,
        ownerAvatarName,
        ownerName,
        cardLink,
      };
    });

    return (
      <Box
        background={"white"}
        paddingTop="16px"
        paddingBottom="16px"
        marginLeft={["0.1rem", "1rem"]}
        minHeight={minHeight}
      >
        <CardList
          showPublicStatus={false}
          showBlurb={false}
          showActivityCategories={true}
          showOwnerName={true}
          cardContent={cardContent}
          emptyMessage={"No Matches Found!"}
          includeSelectionBox={user ? true : false}
          selectedCards={cardSelections.ids}
          onCardSelected={cardSelections.add}
          onCardDeselected={cardSelections.remove}
          disableSelectFor={addTo ? [addTo.contentId] : undefined}
        />
      </Box>
    );
  }

  let authorMatches: ReactElement<any> | null = null;

  if (authorInfo) {
    const authorName = createNameNoTag(authorInfo);
    authorMatches = (
      <Flex>
        Currently filtered by {authorName}
        <Tooltip label={`Clear filter: ${authorName}`} openDelay={500}>
          <Button
            rightIcon={<MdFilterAltOff />}
            size="xs"
            marginLeft="10px"
            onClick={() => {
              const newSearch = clearQueryParameter("author", search);
              navigate(`.${newSearch}`);
            }}
          >
            Clear filter
          </Button>
        </Tooltip>
      </Flex>
    );
  } else if (matchedAuthors && matchedAuthors.length > 0) {
    authorMatches = (
      <>
        <Heading size="md" marginBottom="10px">
          Matching authors
        </Heading>
        <List>
          {matchedAuthors.map((author) => {
            const authorName = createNameNoTag(author);

            return (
              <ListItem key={author.userId} marginTop="5px">
                <Flex>
                  <Tooltip
                    label={`Go to shared activities of ${authorName}`}
                    openDelay={500}
                  >
                    <ChakraLink
                      as={ReactRouterLink}
                      to={`/sharedActivities/${author.userId}`}
                      data-test="Author Link"
                    >
                      {authorName}
                    </ChakraLink>
                  </Tooltip>
                  <Tooltip label={`Filter by ${authorName}`} openDelay={500}>
                    <Button
                      data-test="Filter By Matched Author"
                      rightIcon={<MdFilterAlt />}
                      size="xs"
                      marginLeft="10px"
                      onClick={() => {
                        let newSearch = search;
                        // clear the search string
                        newSearch = clearQueryParameter("q", newSearch);
                        newSearch = clearQueryParameter("author", newSearch);
                        if (newSearch) {
                          newSearch += "&";
                        } else {
                          newSearch = "?";
                        }
                        newSearch += `author=${author.userId}`;
                        navigate(`.${newSearch}`);
                        setCurrentTab(1);
                        setSearchString("");
                      }}
                      aria-label={`Filter by ${authorName}`}
                    >
                      Filter by {authorName}
                    </Button>
                  </Tooltip>
                </Flex>
              </ListItem>
            );
          })}
        </List>
      </>
    );
  }

  const classificationMatchPieces = useMemo<ReactElement<any>[]>(() => {
    const cMatchPieces: ReactElement<any>[] = [];
    if (matchedClassifications && matchedClassifications.length > 0) {
      for (const partialClass of matchedClassifications) {
        const classification = partialClass.classification!;
        const subCategory = partialClass.subCategory!;
        const category = partialClass.category!;
        const system = partialClass.system!;
        const expandedDescription = system.categoriesInDescription
          ? `${category.category} | ${subCategory.subCategory} | ${classification.description}`
          : classification.description;

        const newURL = `/explore/${system.id}/${category.id}/${subCategory.id}/${classification.id}`;

        let shortenedDescription = classification.description;
        if (shortenedDescription.length > 40) {
          shortenedDescription = shortenedDescription.substring(0, 40) + "...";
        }

        cMatchPieces.push(
          <ListItem
            key={`classification${classification.id}|${classification.descriptionId}`}
            marginTop="15px"
          >
            <VStack alignItems="left" gap={0}>
              <Box>
                {classification.code}: {expandedDescription}
              </Box>
              <Box>
                ({system.descriptionLabel} from {system.name})
              </Box>
              <Box>
                <Tooltip
                  label={`Filter by ${expandedDescription}`}
                  openDelay={500}
                  placement="bottom-end"
                >
                  <Button
                    rightIcon={<MdFilterAlt />}
                    size="xs"
                    onClick={() => {
                      let newSearch = search;
                      // clear the search string
                      newSearch = clearQueryParameter("q", newSearch);
                      navigate(`${newURL}${newSearch}`);
                      setCurrentTab(1);
                      setSearchString("");
                    }}
                    aria-label={`Filter by ${expandedDescription}`}
                  >
                    Filter by {shortenedDescription}
                  </Button>
                </Tooltip>
              </Box>
            </VStack>
          </ListItem>,
        );
      }
    }

    if (matchedSubCategories && matchedSubCategories.length > 0) {
      for (const partialClass of matchedSubCategories) {
        const subCategory = partialClass.subCategory!;
        const category = partialClass.category!;
        const system = partialClass.system!;
        const expandedDescription = system.categoriesInDescription
          ? `${category.category} | ${subCategory.subCategory}`
          : subCategory.subCategory;

        let shortenedDescription = subCategory.subCategory;
        if (shortenedDescription.length > 40) {
          shortenedDescription = shortenedDescription.substring(0, 40) + "...";
        }

        const newURL = `/explore/${system.id}/${category.id}/${subCategory.id}`;

        cMatchPieces.push(
          <ListItem key={`subcategory${subCategory.id}`} marginTop="15px">
            <VStack alignItems="left" gap={0}>
              <Box>{expandedDescription}</Box>
              <Box>
                ({system.subCategoryLabel} from {system.name})
              </Box>
              <Box>
                <Tooltip
                  label={`Filter by ${expandedDescription}`}
                  openDelay={500}
                  placement="bottom-end"
                >
                  <Button
                    rightIcon={<MdFilterAlt />}
                    size="xs"
                    onClick={() => {
                      let newSearch = search;
                      // clear the search string
                      newSearch = clearQueryParameter("q", newSearch);
                      navigate(`${newURL}${newSearch}`);
                      setCurrentTab(1);
                      setSearchString("");
                    }}
                    aria-label={`Filter by ${expandedDescription}`}
                  >
                    Filter by {shortenedDescription}
                  </Button>
                </Tooltip>
              </Box>
            </VStack>
          </ListItem>,
        );
      }
    }

    if (matchedCategories && matchedCategories.length > 0) {
      for (const partialClass of matchedCategories) {
        const category = partialClass.category!;
        const system = partialClass.system!;

        const newURL = `/explore/${system.id}/${category.id}`;

        cMatchPieces.push(
          <ListItem key={`category${category.id}`} marginTop="15px">
            <VStack alignItems="left" gap={0}>
              <Text>{category.category}</Text>
              <Text>
                ({system.categoryLabel} from {system.name})
              </Text>
              <Box>
                <Tooltip
                  label={`Filter by ${category.category}`}
                  openDelay={500}
                  placement="bottom-end"
                >
                  <Button
                    rightIcon={<MdFilterAlt />}
                    size="xs"
                    onClick={() => {
                      let newSearch = search;
                      // clear the search string
                      newSearch = clearQueryParameter("q", newSearch);
                      navigate(`${newURL}${newSearch}`);
                      setCurrentTab(1);
                      setSearchString("");
                    }}
                    aria-label={`Filter by ${category.category}`}
                  >
                    Filter by {category.category}
                  </Button>
                </Tooltip>
              </Box>
            </VStack>
          </ListItem>,
        );
      }
    }

    return cMatchPieces;
  }, [
    matchedCategories,
    matchedClassifications,
    matchedSubCategories,
    navigate,
    search,
    setCurrentTab,
  ]);

  let classificationMatches: ReactElement<any> | null = null;

  if (classificationMatchPieces.length > 0) {
    classificationMatches = (
      <>
        <Heading size="md" marginBottom="10px">
          Matching classifications
        </Heading>
        <List>{classificationMatchPieces}</List>
      </>
    );
  }

  const extraFormInputs: ReactElement<any>[] = [];
  if (authorInfo) {
    extraFormInputs.push(
      <Input
        type="hidden"
        name="author"
        key="author"
        value={authorInfo.userId}
      />,
    );
  }

  for (const categoryGroup of allCategories) {
    for (const category of categoryGroup.categories) {
      if (categories.has(category.code)) {
        extraFormInputs.push(
          <Input type="hidden" name={category.code} key={category.code} />,
        );
      }
    }
  }
  if (addTo) {
    extraFormInputs.push(
      <Input type="hidden" name="addTo" key="addTo" value={addTo.contentId} />,
    );
  }

  let numActiveFilters = categories.size;

  if (classificationInfo) {
    // add one for system or unclassified
    numActiveFilters++;

    if (classificationInfo.category) {
      numActiveFilters++;
    }

    if (classificationInfo.subCategory) {
      numActiveFilters++;
    }
    if (classificationInfo.classification) {
      numActiveFilters++;
    }
  }

  const numActiveFiltersInfo =
    numActiveFilters > 0 ? `(${numActiveFilters})` : "";

  const heading = (
    <>
      <Flex
        p={4}
        mt="1rem"
        justifyContent="center"
        alignItems="center"
        height="20px"
        width="100%"
      >
        <Box width="400px">
          <Form>
            <Searchbar
              value={searchString}
              dataTest="Search"
              name="q"
              onInput={(e) => {
                setSearchString((e.target as HTMLInputElement).value);
              }}
            />
            {extraFormInputs}
          </Form>
        </Box>
      </Flex>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height={q ? "120px" : "80px"}
        background="doenet.canvas"
      >
        <Flex
          fontSize={{ base: "16px", md: "24px" }}
          width="100%"
          justifyContent="center"
          marginBottom="2px"
          height="40px"
          alignItems="center"
          pl="4px"
          pr="4px"
          hidden={!q}
        >
          {q ? (
            <>
              <Text data-test="Search Results For">
                Search results for: {q}{" "}
              </Text>
              <Tooltip
                label="Clear search results"
                openDelay={500}
                placement="bottom-end"
              >
                <Button
                  aria-label="Clear search results"
                  variant="solid"
                  colorScheme="blue"
                  size="xs"
                  marginLeft="10px"
                  onClick={() => {
                    let newSearch = search;
                    newSearch = clearQueryParameter("q", newSearch);
                    navigate(`.${newSearch}`);
                    setSearchString("");
                  }}
                >
                  Clear
                </Button>
              </Tooltip>
            </>
          ) : null}
        </Flex>

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

        <Flex width="100%" height="40px">
          <Show below="lg">
            <Button
              onClick={filterOnOpen}
              colorScheme="blue"
              marginLeft="5px"
              rightIcon={<MdFilterAlt />}
            >
              Filter results {numActiveFiltersInfo}
            </Button>
          </Show>
        </Flex>
      </Box>
    </>
  );

  const totalMatchedClassifications =
    (matchedClassifications?.length || 0) +
    (matchedSubCategories?.length || 0) +
    (matchedCategories?.length || 0);

  const results = (
    <Tabs
      minHeight={{
        base: `calc(100vh - ${q ? "208" : "168"}px)`,
        lg: `calc(100vh - ${q ? "168" : "128"}px)`,
      }}
      variant="enclosed-colored"
      index={currentTab ?? 0}
      onChange={setCurrentTab}
    >
      <TabList>
        <Tab data-test="Curated Tab">
          Curated ({intWithCommas(totalCount.numCurated || 0)})
        </Tab>
        <Tab data-test="Community Tab">
          Community ({intWithCommas(totalCount.numCommunity || 0)})
        </Tab>
        <Tab data-test="Authors Tab" hidden={!q}>
          Authors ({intWithCommas(matchedAuthors?.length || 0)})
        </Tab>
        <Tab data-test="Classifications Tab" hidden={!q}>
          Classifications ({intWithCommas(totalMatchedClassifications)})
        </Tab>
      </TabList>

      <TabPanels data-test="Search Results">
        <TabPanel padding={0} data-test="Curated Results">
          {curatedContentDisplay}
        </TabPanel>
        <TabPanel padding={0} data-test="Community Results">
          {trendingContent && (
            <Box data-test="Trending List">
              <Heading
                size="md"
                paddingLeft="10px"
                paddingTop="10px"
                paddingBottom="10px"
                backgroundColor="gray.100"
              >
                Trending
              </Heading>
              {trendingContentDisplay}
            </Box>
          )}
          {recentContent && (
            <Box data-test="Recent Content List">
              <Heading
                size="md"
                paddingLeft="10px"
                paddingTop="10px"
                paddingBottom="10px"
                backgroundColor="gray.100"
              >
                Recent
              </Heading>
              {recentContentDisplay}
            </Box>
          )}

          {searchedContent && (
            <Box data-test="Searched Content List">
              {searchedContentDisplay}
            </Box>
          )}
        </TabPanel>
        <TabPanel>{authorMatches}</TabPanel>
        <TabPanel>{classificationMatches}</TabPanel>
      </TabPanels>
    </Tabs>
  );

  return (
    <>
      {filterDrawer}
      {copyContentModal}
      {heading}
      <Hide below="lg">
        <Grid
          width="100%"
          gridTemplateColumns="300px 1fr"
          gap="0"
          marginTop={{ base: "0px", lg: "-40px" }}
        >
          <GridItem
            marginLeft="0px"
            borderRight="2px"
            paddingRight="0px"
            marginTop="40px"
          >
            <FilterPanel
              topAuthors={topAuthors}
              authorInfo={authorInfo}
              classificationBrowse={classificationBrowse}
              subCategoryBrowse={subCategoryBrowse}
              categoryBrowse={categoryBrowse}
              systemBrowse={systemBrowse}
              classificationInfo={classificationInfo}
              countByCategory={countByCategory}
              categories={categories}
              allCategories={allCategories}
              search={search}
              navigate={navigate}
            />
          </GridItem>
          <GridItem>{results}</GridItem>
        </Grid>
      </Hide>
      <Show below="lg">{results}</Show>
    </>
  );
}
