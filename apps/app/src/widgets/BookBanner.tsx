import { Button, Flex, HStack, Text } from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router";
import { MdMenuBook } from "react-icons/md";
import { bookPageUrl, type ContainingBook } from "../utils/book";

/**
 * A strip saying that what's shown is part of a book, with a link to read it
 * there, in reading mode. `contentId` is the page or folder to open the book
 * at (a folder opens at its first page).
 */
export function BookBanner({
  book,
  contentId,
  label,
}: {
  book: ContainingBook;
  contentId: string;
  /** Text before the book's name, e.g. "This activity is a page of the book". */
  label: string;
}) {
  const isTheBook = book.contentId === contentId;
  return (
    <Flex
      width="100%"
      background="surfaceMuted"
      borderTop="1px solid"
      borderBottom="1px solid"
      borderColor="border"
      justifyContent="center"
      data-test="Book Banner"
    >
      <HStack
        width="100%"
        maxWidth="850px"
        justifyContent="space-between"
        px="1rem"
        py="0.5rem"
        spacing="1rem"
      >
        <Text>
          {label} <strong>{book.name}</strong>.
        </Text>
        <Button
          as={ReactRouterLink}
          to={bookPageUrl(book.contentId, isTheBook ? undefined : contentId)}
          size="sm"
          colorScheme="blue"
          leftIcon={<MdMenuBook />}
          flexShrink={0}
          data-test="Read In Book Button"
        >
          {isTheBook ? "Read as book" : "Read it in the book"}
        </Button>
      </HStack>
    </Flex>
  );
}
