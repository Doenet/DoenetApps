import {
  Text,
  Flex,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  HStack,
} from "@chakra-ui/react";
import { Content } from "../types";
import { returnClassificationsAccordionPanel } from "../utils/classification";

export function ClassificationInfo({ contentData }: { contentData: Content }) {
  const numClassifications = contentData.classifications.length;
  const allIndices = [...Array(numClassifications).keys()];

  return (
    <>
      {contentData.type !== "folder" ? (
        <Flex
          flexDirection="column"
          width="100%"
          rowGap={6}
          height="100%"
          overflowY="auto"
        >
          <Text>Classifications</Text>

          {numClassifications === 0 ? (
            <Text as="i" mt="-5" ml="3">
              None added yet.
            </Text>
          ) : (
            <Accordion allowMultiple defaultIndex={allIndices}>
              {contentData.classifications.map((classification, i) => {
                const code = classification.code;
                const systemName =
                  classification.descriptions[0].subCategory.category.system
                    .name;

                return (
                  <AccordionItem key={`classification${i}`}>
                    <HStack>
                      <h2>
                        <AccordionButton>
                          <HStack flex="1" textAlign="left" direction={"row"}>
                            <Text as="b" data-test={`Classification ${i + 1}`}>
                              {code}
                            </Text>
                            <Text pt="2px">{systemName}</Text>
                          </HStack>
                          <AccordionIcon marginLeft="7px" />
                        </AccordionButton>
                      </h2>
                    </HStack>
                    {returnClassificationsAccordionPanel(classification)}
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </Flex>
      ) : null}
    </>
  );
}
