import {
  Alert,
  AlertIcon,
  AlertTitle,
  Card,
  Checkbox,
  Flex,
  Heading,
  HStack,
  Icon,
  Radio,
  RadioGroup,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { useFetcher } from "react-router";
import { optimistic } from "../../utils/optimistic_ui";
import { activityCategoryIcons } from "../../utils/activity";
import { Category, CategoryGroup } from "@doenet-tools/shared";

export function EditCategories({
  contentId,
  categories,
  allCategories,
  showRequired = false,
}: {
  contentId: string;
  categories: Category[];
  allCategories: CategoryGroup[];
  showRequired?: boolean;
}) {
  const output = [];

  for (const group of allCategories) {
    const groupBox = [];
    if (showRequired && group.isRequired) {
      groupBox.push(
        <Alert status="warning" key={`Required Alert ${group.name}`}>
          <AlertIcon />
          <AlertTitle>Required</AlertTitle>
        </Alert>,
      );
    }

    groupBox.push(
      <Heading key={`Group Heading ${group.name}`} size="md" mb="0.5rem">
        {group.name}
      </Heading>,
    );

    if (group.isExclusive) {
      const groupCodes = group.categories.map((g) => g.code);
      const selected =
        categories.find((c) => groupCodes.includes(c.code)) ?? null;
      groupBox.push(
        <CategoryRadios
          contentId={contentId}
          key={`Radio ${group.name}`}
          selected={selected}
          categoryGroup={group}
        />,
      );
    } else {
      for (const category of group.categories) {
        const isChecked = categories.find((v) => v.code === category.code)
          ? true
          : false;

        groupBox.push(
          <CategoryCheckbox
            contentId={contentId}
            key={category.code}
            category={category}
            isChecked={isChecked}
          />,
        );
      }
    }
    output.push(
      <Card
        key={`Card for group ${group.name}`}
        align="flex-start"
        width="15rem"
        minHeight="12rem"
        p="1rem"
        m="0.5rem"
      >
        {groupBox}
      </Card>,
    );
  }
  return (
    <Flex justify="center" direction="row" wrap="wrap">
      {output}
    </Flex>
  );
}

/**
 * This widget allows owners to view and edit the content categories of their activity - 1 checkbox for each category.
 */
function CategoryCheckbox({
  contentId,
  category,
  isChecked,
}: {
  contentId: string;
  category: Category;
  isChecked: boolean;
}) {
  const fetcher = useFetcher();
  const fallback: Record<string, boolean> = {};
  fallback[category.code] = isChecked;
  const optimisticCheckedRecord = optimistic<Record<string, boolean>>(
    fetcher,
    "categories",
    fallback,
  );
  const optimisticChecked = optimisticCheckedRecord[category.code];
  const categoryCode = category.code as
    | "isQuestion"
    | "isInteractive"
    | "containsVideo";

  return (
    <>
      <Checkbox
        ml="1rem"
        key={category.code}
        data-test={`${category.code} Checkbox`}
        isChecked={optimisticChecked}
        onChange={(event) => {
          const categories: Record<string, boolean> = {};
          categories[category.code] = event.target.checked;

          fetcher.submit(
            {
              path: "updateContent/updateCategories",
              contentId,
              categories,
            },
            { method: "post", encType: "application/json" },
          );
        }}
      >
        <Tooltip label={category.description} openDelay={100}>
          <HStack>
            <Text color={fetcher.state === "idle" ? "black" : "gray"}>
              {category.term}
            </Text>
            {activityCategoryIcons[categoryCode] && (
              <Icon
                paddingLeft="5px"
                as={activityCategoryIcons[categoryCode]}
                color="#666699"
                boxSize={5}
                verticalAlign="middle"
              />
            )}
          </HStack>
        </Tooltip>
      </Checkbox>
    </>
  );
}

function CategoryRadios({
  contentId,
  selected,
  categoryGroup,
}: {
  contentId: string;
  selected: Category | null;
  categoryGroup: CategoryGroup;
}) {
  const fetcher = useFetcher();
  const fallback: Record<string, boolean> = {};
  if (selected) {
    fallback[selected.code] = true;
  }
  const optimisticCheckedRecord = optimistic<Record<string, boolean>>(
    fetcher,
    "categories",
    fallback,
  );
  const optimisticCode = Array.from(
    Object.entries(optimisticCheckedRecord)
      .filter(([_, val]) => val)
      .map(([key, _]) => key),
  )[0];

  const radios = [];
  for (const category of categoryGroup.categories) {
    const categoryCode = category.code as
      | "isQuestion"
      | "isInteractive"
      | "containsVideo";

    radios.push(
      <Radio key={category.code} value={category.code}>
        <Tooltip label={category.description} openDelay={100}>
          <HStack>
            <Text>{category.term}</Text>
            {activityCategoryIcons[categoryCode] && (
              <Icon
                paddingLeft="5px"
                as={activityCategoryIcons[categoryCode]}
                color="#666699"
                boxSize={5}
                verticalAlign="middle"
              />
            )}
          </HStack>
        </Tooltip>
      </Radio>,
    );
  }

  return (
    <RadioGroup
      onChange={(newCode) => {
        const categories: Record<string, boolean> = {};
        for (const cat of categoryGroup.categories) {
          categories[cat.code] = false;
        }
        categories[newCode] = true;

        fetcher.submit(
          {
            path: "updateContent/updateCategories",
            contentId,
            categories,
          },
          { method: "post", encType: "application/json" },
        );
      }}
      value={optimisticCode}
    >
      <VStack align="flex-start">{radios}</VStack>
    </RadioGroup>
  );
}
