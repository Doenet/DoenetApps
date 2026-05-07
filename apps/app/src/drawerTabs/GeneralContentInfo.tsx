import {
  Box,
  Heading,
  Icon,
  List,
  ListItem,
  Tooltip,
  UnorderedList,
} from "@chakra-ui/react";
import { Content, License } from "../types";
import { InfoIcon } from "@chakra-ui/icons";
import { DisplayLicenseItem } from "../widgets/Licenses";
import { createNameCheckCurateTag } from "../utils/names";
import { activityCategoryIcons } from "../utils/activity";

export function GeneralContentInfo({
  contentData,
  allLicenses,
}: {
  contentData: Content;
  allLicenses: License[];
}) {
  const license =
    allLicenses.find((l) => l.code === contentData.licenseCode) ?? null;
  const contentType = contentData.type === "folder" ? "Folder" : "Activity";

  const containsCategories = contentData.categories.length > 0;

  const ownerName = createNameCheckCurateTag(contentData.owner!);

  return (
    <Box>
      {contentData.type !== "folder" && containsCategories ? (
        <Box borderBottom="2px" marginBottom={4} paddingBottom={4}>
          <Heading size="sm">Activity categories</Heading>
          <UnorderedList>
            {contentData.categories.map((category) => {
              const categoryCode = category.code as
                | "isQuestion"
                | "isInteractive"
                | "containsVideo";
              return (
                <ListItem key={category.code}>
                  <Tooltip label={category.description}>
                    {category.term}
                    <Icon
                      paddingLeft="5px"
                      as={activityCategoryIcons[categoryCode]}
                      color="#666699"
                      boxSize={5}
                      verticalAlign="middle"
                    />
                  </Tooltip>
                </ListItem>
              );
            })}
          </UnorderedList>
        </Box>
      ) : null}

      <Box borderBottom="2px" marginBottom={4} paddingBottom={4}>
        {license === null ? (
          <Box
            marginTop="10px"
            border="2px solid black"
            background="orange.100"
            padding="5px"
          >
            <InfoIcon color="orange.500" mr="2px" /> {contentType} is shared
            without specifying a license. Please select a license below to
            inform other how they can use your content.
          </Box>
        ) : license.isComposition ? (
          <>
            <p>
              <em>{contentData.name}</em> by {ownerName} is shared with these
              licenses:
            </p>
            <List spacing="20px" marginTop="10px">
              {license.composedOf.map((comp) => (
                <DisplayLicenseItem licenseItem={comp} key={comp.code} />
              ))}
            </List>
            <p style={{ marginTop: "10px" }}>
              (You are free to use either of these licenses when reusing this
              work.)
            </p>
          </>
        ) : (
          <>
            <p>
              <em>{contentData.name}</em> by {ownerName} is shared with the
              license:
            </p>
            <List marginTop="10px">
              <DisplayLicenseItem licenseItem={license} />
            </List>
          </>
        )}
      </Box>

      {contentData.type === "singleDoc" &&
      (contentData.numVariants ?? 1) > 1 ? (
        <Box marginBottom="20px">
          This document has {contentData.numVariants} variants.
        </Box>
      ) : null}

      {contentData.type === "singleDoc"
        ? `DoenetML version: ${contentData.doenetmlVersion.fullVersion}`
        : null}
    </Box>
  );
}
