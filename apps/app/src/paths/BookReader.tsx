import { useEffect, useRef } from "react";
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Grid,
  Heading,
  HStack,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import {
  Link as ReactRouterLink,
  redirect,
  useFetcher,
  useLoaderData,
  useLocation,
} from "react-router";
import { MdMenuBook, MdMoreVert } from "react-icons/md";
import { DoenetViewer } from "@doenet/doenetml-iframe";
import { api } from "../api/client";
import { submitOperation } from "../api/submitOperation";
import { BookToc } from "../widgets/BookToc";
import {
  ancestorFolders,
  bookPages,
  bookPageUrl,
  getLastReadPage,
  neighborPages,
  numberingPrefixFromName,
  scrollToTargetProps,
  setLastReadPage,
  startingPage,
  type BookTocEntry,
} from "../utils/book";
import { doenetImagesUrl } from "../utils/media";
import { editorUrl } from "../utils/url";
import { effectiveDarkMode, useThemeSettingContext } from "../utils/theme";
import type { OperationResponse } from "@doenet-tools/shared";

type Toc = OperationResponse<"getBookToc">;
type Page = OperationResponse<"getBookPage">;
type LoaderData =
  | { kind: "page"; toc: Toc; page: Page }
  | { kind: "notBook"; toc: Toc }
  | { kind: "empty"; toc: Toc };

export async function loader({
  params,
}: {
  params: { bookId?: string; pageId?: string };
}) {
  const bookId = params.bookId!;
  const toc = await api("getBookToc", { bookId });
  if (!toc.book.isBook) {
    return { kind: "notBook", toc } satisfies LoaderData;
  }

  const pageId = params.pageId;
  if (!pageId) {
    const start = startingPage(toc.entries, getLastReadPage(bookId));
    if (!start) {
      return { kind: "empty", toc } satisfies LoaderData;
    }
    return redirect(bookPageUrl(bookId, start.contentId));
  }

  const entry = toc.entries.find((e) => e.contentId === pageId);
  if (!entry) {
    // A `doenet:` link from a page to something outside this book (links
    // between pages go through reading mode): view it the usual way.
    return redirect(`/activityViewer/${pageId}`);
  }
  if (entry.type === "folder") {
    const first = bookPages(toc.entries).find((p) =>
      ancestorFolders(toc.entries, p.contentId).some(
        (f) => f.contentId === pageId,
      ),
    );
    return redirect(bookPageUrl(bookId, first?.contentId));
  }

  const page = await api("getBookPage", { bookId, pageId });
  return { kind: "page", toc, page } satisfies LoaderData;
}

export function BookReader() {
  const data = useLoaderData() as LoaderData;
  const { book, entries } = data.toc;
  const bookId = book.contentId;
  const page = data.kind === "page" ? data.page : null;
  const pageId = page?.contentId ?? null;

  const toc = useDisclosure();
  const scrollingContainer = useRef<HTMLDivElement>(null);
  const viewerContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = page ? `${page.name} - ${book.name}` : book.name;
    if (pageId) {
      setLastReadPage(bookId, pageId);
    }
    scrollingContainer.current?.scrollTo({ top: 0 });
  }, [bookId, pageId, page, book.name]);

  if (data.kind === "notBook") {
    return <NotABook toc={data.toc} />;
  }

  const tocPanel = (
    <BookToc
      bookId={bookId}
      entries={entries}
      currentPageId={pageId}
      onNavigate={toc.onClose}
    />
  );

  return (
    <Grid
      templateColumns={{ base: "1fr", lg: "300px 1fr" }}
      height="100%"
      background="background"
    >
      <Box
        display={{ base: "none", lg: "block" }}
        overflowY="auto"
        borderRight="1px solid"
        borderColor="border"
        background="surface"
        padding="12px 8px"
      >
        <Heading as="h2" size="sm" paddingX="6px" marginBottom="10px">
          <Link as={ReactRouterLink} to={bookPageUrl(bookId)}>
            {book.name}
          </Link>
        </Heading>
        {tocPanel}
      </Box>

      <Box overflowY="auto" ref={scrollingContainer}>
        <Box
          maxWidth="900px"
          marginX="auto"
          padding={{ base: "8px", md: "16px" }}
        >
          <HStack justifyContent="space-between" marginBottom="8px">
            <HStack minWidth={0}>
              <Button
                display={{ base: "inline-flex", lg: "none" }}
                size="sm"
                leftIcon={<MdMenuBook />}
                onClick={toc.onOpen}
                data-test="Book Contents Button"
              >
                Contents
              </Button>
              {page && (
                <BookBreadcrumb
                  bookId={bookId}
                  bookName={book.name}
                  entries={entries}
                  pageId={page.contentId}
                />
              )}
            </HStack>
            {book.canEdit && page && <OwnerMenu bookId={bookId} page={page} />}
          </HStack>

          {data.kind === "empty" && <Text>This book has no pages yet.</Text>}

          {page && (
            <>
              <PageNav
                bookId={bookId}
                entries={entries}
                pageId={page.contentId}
              />
              <Box ref={viewerContainer} marginY="12px">
                {page.doenetML !== null && page.doenetmlVersion !== null ? (
                  <PageViewer
                    key={page.contentId}
                    bookId={bookId}
                    numberingPrefix={numberingPrefixFromName(page.name)}
                    doenetML={page.doenetML}
                    doenetmlVersion={page.doenetmlVersion}
                    scrollingContainer={scrollingContainer}
                    viewerContainer={viewerContainer}
                  />
                ) : (
                  <Box
                    padding="16px"
                    borderRadius="md"
                    background="surface"
                    border="1px solid"
                    borderColor="border"
                  >
                    <Heading as="h1" size="md" marginBottom="8px">
                      {page.name}
                    </Heading>
                    <Text marginBottom="12px">
                      This page is a problem set, which opens in the activity
                      viewer.
                    </Text>
                    <Button
                      as={ReactRouterLink}
                      to={`/activityViewer/${page.contentId}`}
                      colorScheme="blue"
                      size="sm"
                    >
                      Open {page.name}
                    </Button>
                  </Box>
                )}
              </Box>
              <PageNav
                bookId={bookId}
                entries={entries}
                pageId={page.contentId}
              />
            </>
          )}
        </Box>
      </Box>

      <Drawer isOpen={toc.isOpen} placement="left" onClose={toc.onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader fontSize="md">{book.name}</DrawerHeader>
          <DrawerBody paddingX="8px">{tocPanel}</DrawerBody>
        </DrawerContent>
      </Drawer>
    </Grid>
  );
}

function PageViewer({
  bookId,
  numberingPrefix,
  doenetML,
  doenetmlVersion,
  scrollingContainer,
  viewerContainer,
}: {
  bookId: string;
  /** The page's section number, which DoenetML prefixes its numbers with. */
  numberingPrefix: string | null;
  doenetML: string;
  doenetmlVersion: string;
  scrollingContainer: React.RefObject<HTMLDivElement | null>;
  viewerContainer: React.RefObject<HTMLDivElement | null>;
}) {
  const { themeSetting } = useThemeSettingContext();
  const baseUrl = window.location.protocol + "//" + window.location.host;
  // A link to a figure or equation on this page arrives as `#name`.
  const { hash } = useLocation();

  // Kept in a variable, not written inline: `numberingPrefix` (Figure 3.2.1
  // on page 3.2) is newer than the DoenetML types this app is built against,
  // and DoenetML versions without it ignore it.
  const flags = {
    showCorrectness: true,
    solutionDisplayMode: "button" as const,
    showFeedback: true,
    showHints: true,
    autoSubmit: false,
    allowLoadState: false,
    allowSaveState: false,
    allowLocalState: false,
    allowSaveEvents: false,
    numberingPrefix,
  };

  function requestScrollTo(offset: number) {
    if (viewerContainer.current && scrollingContainer.current) {
      const top =
        viewerContainer.current.getBoundingClientRect().top -
        scrollingContainer.current.getBoundingClientRect().top +
        scrollingContainer.current.scrollTop;
      scrollingContainer.current.scrollTo({
        top: top + offset - 50,
        behavior: "smooth",
      });
    }
  }

  return (
    <DoenetViewer
      {...scrollToTargetProps(hash)}
      doenetML={doenetML}
      doenetmlVersion={doenetmlVersion}
      darkMode={effectiveDarkMode(themeSetting, doenetmlVersion)}
      flags={flags}
      attemptNumber={1}
      // `doenet:<id>` links resolve to `${doenetViewerUrl}/<id>`, so links
      // between pages of this book stay in reading mode.
      doenetViewerUrl={`${baseUrl}/book/${bookId}`}
      doenetImagesUrl={doenetImagesUrl}
      requestScrollTo={requestScrollTo}
    />
  );
}

/** "Previous" and "Next" page links. */
export function PageNav({
  bookId,
  entries,
  pageId,
}: {
  bookId: string;
  entries: BookTocEntry[];
  pageId: string;
}) {
  const { previous, next } = neighborPages(entries, pageId);
  return (
    <Flex
      as="nav"
      aria-label="Pages"
      justifyContent="space-between"
      gap="8px"
      data-test="Book Page Nav"
    >
      <Box>
        {previous && (
          <Button
            as={ReactRouterLink}
            to={bookPageUrl(bookId, previous.contentId)}
            size="sm"
            variant="outline"
            whiteSpace="normal"
            height="auto"
            paddingY="6px"
            rel="prev"
          >
            ← {previous.name}
          </Button>
        )}
      </Box>
      <Box textAlign="right">
        {next && (
          <Button
            as={ReactRouterLink}
            to={bookPageUrl(bookId, next.contentId)}
            size="sm"
            variant="outline"
            whiteSpace="normal"
            height="auto"
            paddingY="6px"
            rel="next"
          >
            {next.name} →
          </Button>
        )}
      </Box>
    </Flex>
  );
}

function BookBreadcrumb({
  bookId,
  bookName,
  entries,
  pageId,
}: {
  bookId: string;
  bookName: string;
  entries: BookTocEntry[];
  pageId: string;
}) {
  const folders = ancestorFolders(entries, pageId);
  const current = entries.find((e) => e.contentId === pageId);
  return (
    <Breadcrumb fontSize="sm" separator="›" minWidth={0} overflow="hidden">
      <BreadcrumbItem display={{ base: "none", md: "inline-flex" }}>
        <BreadcrumbLink as={ReactRouterLink} to={bookPageUrl(bookId)}>
          {bookName}
        </BreadcrumbLink>
      </BreadcrumbItem>
      {folders.map((f) => (
        <BreadcrumbItem
          key={f.contentId}
          display={{ base: "none", md: "inline-flex" }}
        >
          <BreadcrumbLink
            as={ReactRouterLink}
            to={bookPageUrl(bookId, f.contentId)}
          >
            {f.name}
          </BreadcrumbLink>
        </BreadcrumbItem>
      ))}
      <BreadcrumbItem isCurrentPage>
        <BreadcrumbLink>{current?.name}</BreadcrumbLink>
      </BreadcrumbItem>
    </Breadcrumb>
  );
}

function OwnerMenu({ bookId, page }: { bookId: string; page: Page }) {
  const fetcher = useFetcher();
  return (
    <Menu placement="bottom-end">
      <MenuButton
        as={Button}
        size="sm"
        variant="ghost"
        aria-label="Book options"
        data-test="Book Owner Menu"
      >
        <MdMoreVert />
      </MenuButton>
      <MenuList zIndex="1000">
        <MenuItem
          as={ReactRouterLink}
          to={editorUrl(page.contentId, page.type, "edit")}
        >
          Edit this page
        </MenuItem>
        <MenuItem
          onClick={() =>
            submitOperation(fetcher, "setIsBook", {
              contentId: bookId,
              isBook: false,
            })
          }
        >
          Stop reading this folder as a book
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

function NotABook({ toc }: { toc: Toc }) {
  const fetcher = useFetcher();
  const { book } = toc;
  const folderUrl = `/activities/${book.ownerId}/${book.contentId}`;
  return (
    <Box maxWidth="700px" marginX="auto" padding="24px">
      <Heading as="h1" size="lg" marginBottom="12px">
        {book.name}
      </Heading>
      <Text marginBottom="16px">
        This folder isn't set up to be read as a book. A book shows the folder's
        documents as pages, with its subfolders as parts and chapters in a table
        of contents.
      </Text>
      <HStack>
        {book.canEdit ? (
          <Button
            colorScheme="blue"
            isLoading={fetcher.state !== "idle"}
            onClick={() =>
              submitOperation(fetcher, "setIsBook", {
                contentId: book.contentId,
                isBook: true,
              })
            }
            data-test="Make Book Button"
          >
            Make this folder a book
          </Button>
        ) : (
          <Text color="textMuted">
            Only the folder's owner can make it a book.
          </Text>
        )}
        {book.canEdit && (
          <Button as={ReactRouterLink} to={folderUrl} variant="outline">
            Back to the folder
          </Button>
        )}
      </HStack>
    </Box>
  );
}
