import { ReactElement } from "react";
import { ContentClassification } from "../types";
import {
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  ListItem,
  UnorderedList,
} from "@chakra-ui/react";
import {
  getClassificationAugmentedDescription,
  reformatClassificationData,
} from "./activity";

export function returnClassificationsAccordionPanel(
  classification: ContentClassification,
) {
  const {
    categoryLabel,
    category,
    subCategoryLabel,
    subCategory,
    description,
    descriptionLabel,
  } = reformatClassificationData(classification);

  let aliasNote: ReactElement<any> | null = null;
  if (classification.descriptions.length > 1) {
    aliasNote = (
      <Accordion allowToggle>
        <AccordionItem>
          <AccordionButton>
            Aliases: <AccordionIcon marginLeft="7px" />
          </AccordionButton>
          <AccordionPanel>
            <UnorderedList>
              {classification.descriptions.slice(1).map((description, i) => {
                return (
                  <ListItem key={i}>
                    &quot;
                    {getClassificationAugmentedDescription(
                      classification,
                      i + 1,
                    )}
                    &quot; from {description.subCategory.category.system.name}
                  </ListItem>
                );
              })}
            </UnorderedList>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    );
  }
  return (
    <AccordionPanel>
      <Text>
        <Text as="i">{categoryLabel}: </Text>
        {category}
      </Text>
      <Text>
        <Text as="i">{subCategoryLabel}: </Text>
        {subCategory}
      </Text>
      <Text>
        <Text as="i">{descriptionLabel}: </Text>
        {description}
      </Text>
      {aliasNote}
    </AccordionPanel>
  );
}
