import {
  useDisclosure,
  Accordion,
  AccordionItem,
  HStack,
  AccordionButton,
  AccordionIcon,
  Spacer,
  Text,
  Tooltip,
  CloseButton,
  Button,
  Box,
} from "@chakra-ui/react";
import { FetcherWithComponents } from "react-router";
import { AddClassificationModal } from "../../popups/AddClassificationModal";
import { ContentClassification } from "../../types";
import { returnClassificationsAccordionPanel } from "../../utils/classification";
import { optimistic } from "../../utils/optimistic_ui";

/**
 * This widget allows an owner to view and edit their classifications.
 * Uses `AddClassificationModal`.
 */
export function EditClassifications({
  contentId,
  classifications,
  deleteClassificationFetcher,
  addClassificationFetcher,
}: {
  contentId: string;
  classifications: ContentClassification[];
  deleteClassificationFetcher: FetcherWithComponents<any>;
  addClassificationFetcher: FetcherWithComponents<any>;
}) {
  const currentlyDeleting = optimistic<number>(
    deleteClassificationFetcher,
    "classificationId",
    0,
  );

  const {
    isOpen: addIsOpen,
    onOpen: addOnOpen,
    onClose: addOnClose,
  } = useDisclosure();

  return (
    <Box>
      {classifications.length === 0 && <p>None added yet.</p>}
      <Accordion allowMultiple reduceMotion>
        {classifications.map((classification, i) => {
          const code = classification.code;
          const systemName =
            classification.descriptions[0].subCategory.category.system.name;

          return (
            <AccordionItem key={`classification${i}`}>
              <HStack>
                <h2>
                  <AccordionButton>
                    <HStack flex="1" textAlign="left" direction={"row"}>
                      <Text
                        as="b"
                        data-test={`Existing Classification ${i + 1}`}
                      >
                        {code}
                      </Text>
                      <Text fontSize={"small"} pt="2px">
                        {systemName}
                      </Text>
                    </HStack>
                    <AccordionIcon marginLeft="7px" />
                  </AccordionButton>
                </h2>
                <Spacer />
                <Tooltip
                  label={`Remove classification ${code}`}
                  placement="bottom-end"
                >
                  <CloseButton
                    aria-label={`Remove classification ${code}`}
                    data-test={`Remove Existing ${code}`}
                    hidden={currentlyDeleting === classification.id}
                    onClick={() => {
                      deleteClassificationFetcher.submit(
                        {
                          path: "classifications/removeClassification",
                          contentId,
                          classificationId: classification.id,
                        },
                        { method: "post", encType: "application/json" },
                      );
                    }}
                  />
                </Tooltip>
              </HStack>
              {returnClassificationsAccordionPanel(classification)}
            </AccordionItem>
          );
        })}
      </Accordion>

      <Button
        colorScheme="blue"
        size="sm"
        onClick={addOnOpen}
        ml="10px"
        mt="15px"
        data-test="Add Classification Button"
      >
        Add a classification
      </Button>
      <AddClassificationModal
        contentId={contentId}
        existingClassifications={classifications}
        isOpen={addIsOpen}
        onClose={addOnClose}
        fetcher={addClassificationFetcher}
      />
    </Box>
  );
}
