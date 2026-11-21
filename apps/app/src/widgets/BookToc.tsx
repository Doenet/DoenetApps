import { useEffect, useState } from "react";
import { Box, Button, Collapse, Link, List, ListItem } from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router";
import { MdExpandMore, MdChevronRight } from "react-icons/md";
import {
  ancestorFolders,
  bookPageUrl,
  bookTocTree,
  type BookTocEntry,
  type BookTocNode,
} from "../utils/book";

/**
 * A book's table of contents: folders (parts, chapters) as expandable
 * headings, pages as links. The folders around the current page start
 * expanded; the current page is marked with `aria-current="page"`.
 */
export function BookToc({
  bookId,
  entries,
  currentPageId,
  onNavigate,
}: {
  bookId: string;
  entries: BookTocEntry[];
  currentPageId: string | null;
  /** Called after a page link is followed (e.g. to close a drawer). */
  onNavigate?: () => void;
}) {
  const tree = bookTocTree(entries, bookId);
  const openAtStart = new Set(
    currentPageId
      ? ancestorFolders(entries, currentPageId).map((f) => f.contentId)
      : [],
  );

  return (
    <Box as="nav" aria-label="Table of contents" data-test="Book TOC">
      <TocList
        nodes={tree}
        bookId={bookId}
        currentPageId={currentPageId}
        openAtStart={openAtStart}
        onNavigate={onNavigate}
      />
    </Box>
  );
}

function TocList({
  nodes,
  ...rest
}: {
  nodes: BookTocNode[];
  bookId: string;
  currentPageId: string | null;
  openAtStart: Set<string>;
  onNavigate?: () => void;
}) {
  return (
    <List spacing="1px">
      {nodes.map((node) => (
        <ListItem key={node.contentId}>
          {node.type === "folder" ? (
            <TocFolder node={node} {...rest} />
          ) : (
            <TocPage node={node} {...rest} />
          )}
        </ListItem>
      ))}
    </List>
  );
}

function TocFolder({
  node,
  openAtStart,
  ...rest
}: {
  node: BookTocNode;
  bookId: string;
  currentPageId: string | null;
  openAtStart: Set<string>;
  onNavigate?: () => void;
}) {
  const containsCurrent = openAtStart.has(node.contentId);
  const [isOpen, setIsOpen] = useState(containsCurrent);
  // Reveal the current page when it moves into this folder (e.g. via "Next");
  // never collapse a folder the reader opened.
  useEffect(() => {
    if (containsCurrent) setIsOpen(true);
  }, [containsCurrent]);
  const listId = `book-toc-${node.contentId}`;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        width="100%"
        justifyContent="flex-start"
        whiteSpace="normal"
        textAlign="left"
        height="auto"
        paddingY="6px"
        paddingLeft={`${(node.depth - 1) * 12 + 4}px`}
        fontWeight="semibold"
        leftIcon={isOpen ? <MdExpandMore /> : <MdChevronRight />}
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen(!isOpen)}
        data-test="Book TOC Folder"
      >
        {node.name}
      </Button>
      <Collapse in={isOpen} animateOpacity={false} unmountOnExit>
        <Box id={listId}>
          <TocList nodes={node.children} openAtStart={openAtStart} {...rest} />
        </Box>
      </Collapse>
    </>
  );
}

function TocPage({
  node,
  bookId,
  currentPageId,
  onNavigate,
}: {
  node: BookTocNode;
  bookId: string;
  currentPageId: string | null;
  onNavigate?: () => void;
}) {
  const isCurrent = node.contentId === currentPageId;
  return (
    <Link
      as={ReactRouterLink}
      to={bookPageUrl(bookId, node.contentId)}
      aria-current={isCurrent ? "page" : undefined}
      display="block"
      paddingY="5px"
      paddingRight="6px"
      // line up with the folder labels, past their expand icon
      paddingLeft={`${(node.depth - 1) * 12 + 28}px`}
      borderRadius="md"
      fontSize="sm"
      fontWeight={isCurrent ? "bold" : "normal"}
      background={isCurrent ? "accent" : undefined}
      _hover={{ background: isCurrent ? "accent" : "interact" }}
      onClick={onNavigate}
      data-test="Book TOC Page"
    >
      {node.name}
    </Link>
  );
}
