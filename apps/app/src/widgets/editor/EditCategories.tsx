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
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { activityCategoryIcons } from "../../utils/activity";
import { Category, CategoryGroup } from "@doenet-tools/shared";
import { dispatchShareStatusRefresh } from "../../utils/shareStatus";

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
  const fetcher = useFetcher();
  const [optimisticCategoryOverrides, setOptimisticCategoryOverrides] =
    useState<Record<string, boolean>>({});
  const [hasPendingSubmission, setHasPendingSubmission] = useState(false);

  useEffect(() => {
    setOptimisticCategoryOverrides({});
  }, [categories]);

  useEffect(() => {
    if (hasPendingSubmission && fetcher.state === "idle") {
      dispatchShareStatusRefresh(contentId);
      setHasPendingSubmission(false);
    }
  }, [contentId, fetcher.state, hasPendingSubmission]);

  const optimisticCategories = getOptimisticCategories({
    categories,
    allCategories,
    optimisticCategoryOverrides,
  });

  function submitCategories(categoriesUpdate: Record<string, boolean>) {
    setHasPendingSubmission(true);
    setOptimisticCategoryOverrides((prev) => ({
      ...prev,
      ...categoriesUpdate,
    }));

    fetcher.submit(
      {
        path: "updateContent/updateCategories",
        contentId,
        categories: categoriesUpdate,
      },
      { method: "post", encType: "application/json" },
    );
  }

  for (const group of allCategories) {
    const groupBox = [];
    const groupIsMissing = !group.categories.some(
      (groupCategory) => optimisticCategories[groupCategory.code],
    );

    if (showRequired && group.isRequired) {
      groupBox.push(
        <Alert
          status="warning"
          key={`Required Alert ${group.name}`}
          data-test={`Required Alert ${group.name}`}
          visibility={groupIsMissing ? "visible" : "hidden"}
          aria-hidden={!groupIsMissing}
          py="0.35rem"
          px="0.6rem"
          mb="0.35rem"
          borderRadius="md"
        >
          <AlertIcon boxSize="0.9rem" mr="0.4rem" />
          <AlertTitle fontSize="sm" lineHeight="1.2">
            Required
          </AlertTitle>
        </Alert>,
      );
    }

    groupBox.push(
      <Heading key={`Group Heading ${group.name}`} size="md" mb="0.5rem">
        {group.name}
      </Heading>,
    );

    if (group.isExclusive) {
      groupBox.push(
        <CategoryRadios
          key={`Radio ${group.name}`}
          submitCategories={submitCategories}
          selectedCode={
            group.categories.find(
              (groupCategory) => optimisticCategories[groupCategory.code],
            )?.code ?? null
          }
          categoryGroup={group}
        />,
      );
    } else {
      for (const category of group.categories) {
        groupBox.push(
          <CategoryCheckbox
            key={category.code}
            submitCategories={submitCategories}
            category={category}
            isChecked={Boolean(optimisticCategories[category.code])}
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
  submitCategories,
  category,
  isChecked,
}: {
  submitCategories: (categoriesUpdate: Record<string, boolean>) => void;
  category: Category;
  isChecked: boolean;
}) {
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
        isChecked={isChecked}
        onChange={(event) => {
          const categories: Record<string, boolean> = {};
          categories[category.code] = event.target.checked;
          submitCategories(categories);
        }}
      >
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
      </Checkbox>
    </>
  );
}

function CategoryRadios({
  submitCategories,
  selectedCode,
  categoryGroup,
}: {
  submitCategories: (categoriesUpdate: Record<string, boolean>) => void;
  selectedCode: string | null;
  categoryGroup: CategoryGroup;
}) {
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
        submitCategories(categories);
      }}
      value={selectedCode ?? undefined}
    >
      <VStack align="flex-start">{radios}</VStack>
    </RadioGroup>
  );
}

function getOptimisticCategories({
  categories,
  allCategories,
  optimisticCategoryOverrides,
}: {
  categories: Category[];
  allCategories: CategoryGroup[];
  optimisticCategoryOverrides: Record<string, boolean>;
}) {
  const optimisticCategories = Object.fromEntries(
    allCategories.flatMap((group) =>
      group.categories.map((category) => [category.code, false] as const),
    ),
  ) as Record<string, boolean>;

  for (const category of categories) {
    optimisticCategories[category.code] = true;
  }

  Object.assign(optimisticCategories, optimisticCategoryOverrides);

  return optimisticCategories;
}
