import { ReactElement } from "react";
import { Text, Icon, Box, Flex } from "@chakra-ui/react";
import Card, { CardContent } from "./Card";
import { MdInfoOutline } from "react-icons/md";

export default function CardList({
  cardContent,
  showOwnerName = false,
  showBlurb = false,
  showPublicStatus = false,
  showActivityCategories = false,
  showAddButton = false,
  showLibraryEditor = false,
  emptyMessage,
  includeSelectionBox = false,
  /**
   * The set of contentIds of selected cards
   * The contentIds may or may not be included in `cardContent`
   */
  selectedCards,
  onCardSelected,
  onCardDeselected,

  disableSelectFor,
  disableAsSelectedFor,
  isAuthor = false,
  addDocumentCallback,
}: {
  cardContent: CardContent[];
  showOwnerName?: boolean;
  showBlurb?: boolean;
  showPublicStatus?: boolean;
  showActivityCategories?: boolean;
  showAddButton?: boolean;
  showLibraryEditor?: boolean;
  emptyMessage: string;
  includeSelectionBox?: boolean;
  selectedCards?: Set<string>;
  onCardSelected?: (contentId: string) => void;
  onCardDeselected?: (contentId: string) => void;
  disableSelectFor?: string[];
  disableAsSelectedFor?: string[];
  isAuthor?: boolean;
  addDocumentCallback?: (contentId: string) => void;
}) {
  if (cardContent.length === 0) {
    return (
      <Flex
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        alignContent="center"
        minHeight={200}
        background="doenet.canvas"
        padding={20}
        width="100%"
        backgroundColor="transparent"
        textAlign="center"
        borderTop="2px solid gray"
      >
        <Icon fontSize="48pt" as={MdInfoOutline} />
        <Text fontSize="36pt">{emptyMessage}</Text>
      </Flex>
    );
  }

  // let headerRow: ReactElement | null = null;

  //   headerRow = (
  //     <Flex>
  //       <Box width="100%"></Box>
  //       <Box width="100%"></Box>
  //       {showPublicStatus ? <Box width="100%">Visibility</Box> : null}
  //       <Show above="md">
  //         {showAssignmentStatus ? (
  //           <Box width="100%">Assignment Status</Box>
  //         ) : null}
  //       </Show>
  //       {showOwnerName ? (
  //         <Box width="100%">Owner</Box>
  //       ) : null}
  //       <Box width="100%"></Box>
  //     </Flex>
  //   );

  let cards: ReactElement<any> | ReactElement<any>[] = cardContent.map(
    (cardContent, idx) => {
      return (
        <Card
          key={`Card${cardContent.content.contentId}`}
          cardContent={cardContent}
          showOwnerName={showOwnerName}
          showBlurb={showBlurb}
          showPublicStatus={showPublicStatus}
          showActivityCategories={showActivityCategories}
          showAddButton={showAddButton}
          showLibraryEditor={showLibraryEditor}
          indentLevel={cardContent.indentLevel}
          includeSelectionBox={includeSelectionBox}
          isSelected={
            selectedCards?.has(cardContent.content.contentId) || false
          }
          onSelected={() => onCardSelected?.(cardContent.content.contentId)}
          onDeselected={() => onCardDeselected?.(cardContent.content.contentId)}
          isAuthor={isAuthor}
          addDocumentCallback={addDocumentCallback}
          disableSelect={disableSelectFor?.includes(
            cardContent.content.contentId,
          )}
          disableAsSelected={disableAsSelectedFor?.includes(
            cardContent.content.contentId,
          )}
          idx={idx}
        />
      );
    },
  );

  cards = (
    <Box width="100%" borderTop={"2px solid gray"}>
      {cards}
    </Box>
  );

  const panel = (
    <Flex
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      alignContent="center"
    >
      {" "}
      {cards}
    </Flex>
  );

  return (
    <>
      {/* {headerRow} */}
      {panel}
    </>
  );
}
