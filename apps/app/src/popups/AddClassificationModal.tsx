import {
  Box,
  HStack,
  Select,
  CloseButton,
  Input,
  Card,
  CardBody,
  Heading,
  Highlight,
  Spacer,
  Button,
  Spinner,
  Text,
  Modal,
  ModalOverlay,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalContent,
} from "@chakra-ui/react";
import axios from "axios";
import { FormEvent, ReactElement, useEffect, useState } from "react";
import { ContentClassification, ClassificationCategoryTree } from "../types";
import {
  findClassificationDescriptionIndex,
  reformatClassificationData,
  getClassificationAugmentedDescription,
} from "../utils/activity";
import { FetcherWithComponents } from "react-router";

/**
 * This modal allows you to search for applicable classifications that you can add to your content.
 * Requires a list of `existingClassifications`on your content.
 *
 * When the modal first opens, this component queries the server for all classifications in the system (which is somewhat large).
 *
 * To manage this modal's visibility, use Chakra's `useDisclosure`. See https://v2.chakra-ui.com/docs/components/modal/usage
 */
export function AddClassificationModal({
  contentId,
  existingClassifications,
  isOpen,
  onClose,
  fetcher,
}: {
  contentId: string;
  existingClassifications: ContentClassification[];
  isOpen: boolean;
  onClose: () => void;
  fetcher: FetcherWithComponents<any>;
}) {
  // ==== Load classification categories ====
  const [classificationCategories, setClassificationCategories] = useState<
    ClassificationCategoryTree[]
  >([]);
  useEffect(() => {
    async function fetchClassificationCategories() {
      const { data } = await axios.get(
        `/api/classifications/getClassificationCategories`,
      );
      setClassificationCategories(data);
    }
    fetchClassificationCategories();
  }, []);

  // ==== State variables for search filters
  const [categoryFilter, setCategoryFilter] = useState<{
    systemId?: number;
    systemTreeIndex?: number;
    categoryId?: number;
    categoryTreeIndex?: number;
    subCategoryId?: number;
    subCategoryTreeIndex?: number;
  }>({});
  const [queryFilter, setQueryFilter] = useState<string | undefined>(undefined);

  // Function to update search filters
  let searchTermsTimeout: NodeJS.Timeout;
  function updateSearchTerms(
    e: FormEvent<HTMLInputElement>,
    immediate: boolean = false,
  ) {
    clearTimeout(searchTermsTimeout);
    if (immediate) {
      setQueryFilter((e.target as HTMLInputElement).value);
    } else {
      // if not immediate, debounce at half second
      searchTermsTimeout = setTimeout(() => {
        setQueryFilter((e.target as HTMLInputElement).value);
      }, 500);
    }
  }

  // === State variable to store our results =====
  const [classificationOptions, setClassificationOptions] = useState<
    ContentClassification[]
  >([]);

  // Every time our filter state variables change, we fetch
  // the new search results
  useEffect(() => {
    const fetchClassificationOptions = async ({
      query,
      systemId,
      categoryId,
      subCategoryId,
    }: {
      query?: string;
      systemId?: number;
      categoryId?: number;
      subCategoryId?: number;
    }) => {
      let searchParameters = "";
      if (subCategoryId !== undefined) {
        searchParameters = `subCategoryId=${subCategoryId}`;
      } else if (categoryId !== undefined) {
        searchParameters = `categoryId=${categoryId}`;
      } else if (systemId !== undefined) {
        searchParameters = `systemId=${systemId}`;
      }

      if (query !== undefined) {
        if (searchParameters) {
          searchParameters += "&";
        }
        searchParameters += `query=${query}`;
      }

      const results = await axios.get(
        `/api/classifications/searchPossibleClassifications?${searchParameters}`,
      );

      const classifications: ContentClassification[] = results.data;
      setClassificationOptions(classifications);
    };
    fetchClassificationOptions({ ...categoryFilter, query: queryFilter });
  }, [categoryFilter, queryFilter]);

  // Non-zero if waiting for server to add/remove classification (stores id)
  const [dropdownWaitingForChange, setDropdownWaitingForChange] = useState(0);
  useEffect(() => {
    setDropdownWaitingForChange(0);
  }, [existingClassifications]);

  const selectedClassification =
    categoryFilter.systemTreeIndex === undefined
      ? null
      : classificationCategories[categoryFilter.systemTreeIndex];

  const classificationSystemOptionGroups: ReactElement<any>[] = [];

  let classificationTypeOptions: ReactElement<any>[] = [];
  let lastType = "";

  for (const [i, system] of classificationCategories.entries()) {
    if (system.type !== lastType && classificationTypeOptions.length > 0) {
      if (lastType === "Primary") {
        // skip optgroup for Primary
        classificationSystemOptionGroups.push(...classificationTypeOptions);
      } else {
        classificationSystemOptionGroups.push(
          <optgroup label={lastType} key={i}>
            {classificationTypeOptions}
          </optgroup>,
        );
      }
      classificationTypeOptions = [];
    }
    lastType = system.type;

    classificationTypeOptions.push(
      <option value={i} key={i}>
        {system.name}
      </option>,
    );

    if (i === classificationCategories.length - 1) {
      classificationSystemOptionGroups.push(
        <optgroup label={system.type} key={i + 1}>
          {classificationTypeOptions}
        </optgroup>,
      );
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} scrollBehavior="inside" size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Heading size="md" pb="1rem">
            Add a classification
          </Heading>
          <ModalCloseButton />
          <HStack>
            <Select
              maxWidth="30rem"
              value={categoryFilter.systemTreeIndex ?? ""}
              placeholder="Filter by system"
              data-test="Filter By System"
              aria-label="Filter By System"
              onChange={(event) => {
                if (event.target.value) {
                  const treeIndex = Number(event.target.value);
                  setCategoryFilter({
                    systemId: classificationCategories[treeIndex].id,
                    systemTreeIndex: treeIndex,
                  });
                } else {
                  setCategoryFilter({});
                }
              }}
            >
              {classificationSystemOptionGroups}
            </Select>
            <CloseButton
              aria-label={`Stop filtering by system`}
              data-test="Stop Filter By System"
              disabled={selectedClassification === null}
              onClick={() => {
                setCategoryFilter({});
              }}
            />
          </HStack>

          <HStack>
            <Select
              maxWidth="30rem"
              value={categoryFilter.categoryTreeIndex ?? ""}
              placeholder={
                selectedClassification === null
                  ? "-"
                  : `Filter by ${selectedClassification.categoryLabel}`
              }
              aria-label={
                selectedClassification === null
                  ? "-"
                  : `Filter by ${selectedClassification.categoryLabel}`
              }
              data-test="Filter By Category"
              isDisabled={categoryFilter.systemId === undefined}
              onChange={(event) => {
                if (event.target.value) {
                  const treeIndex = Number(event.target.value);
                  setCategoryFilter((was) => {
                    const obj = { ...was };
                    obj.categoryId =
                      selectedClassification!.categories[treeIndex].id;
                    obj.categoryTreeIndex = treeIndex;
                    delete obj.subCategoryId;
                    delete obj.subCategoryTreeIndex;
                    return obj;
                  });
                } else {
                  setCategoryFilter((was) => {
                    const obj = { ...was };
                    delete obj.categoryId;
                    delete obj.categoryTreeIndex;
                    delete obj.subCategoryId;
                    delete obj.subCategoryTreeIndex;
                    return obj;
                  });
                }
              }}
            >
              {selectedClassification !== null
                ? selectedClassification.categories.map((category, i) => (
                    <option value={i} key={i}>
                      {category.category}
                    </option>
                  ))
                : null}
            </Select>
            <CloseButton
              aria-label={`Stop filtering by ${selectedClassification?.categoryLabel}`}
              data-test="Stop Filter By Category"
              disabled={categoryFilter.categoryId === undefined}
              onClick={() => {
                setCategoryFilter((was) => {
                  const obj = { ...was };
                  delete obj.categoryId;
                  delete obj.categoryTreeIndex;
                  delete obj.subCategoryId;
                  delete obj.subCategoryTreeIndex;
                  return obj;
                });
              }}
            />
          </HStack>

          <HStack>
            <Select
              maxWidth="30rem"
              value={categoryFilter.subCategoryTreeIndex ?? ""}
              placeholder={
                categoryFilter.categoryId === undefined
                  ? "-"
                  : `Filter by ${selectedClassification!.subCategoryLabel}`
              }
              aria-label={
                categoryFilter.categoryId === undefined
                  ? "-"
                  : `Filter by ${selectedClassification!.subCategoryLabel}`
              }
              data-test="Filter By Subcategory"
              isDisabled={categoryFilter.categoryId === undefined}
              onChange={(event) => {
                if (event.target.value) {
                  const treeIndex = Number(event.target.value);
                  setCategoryFilter((was) => {
                    const obj = { ...was };
                    obj.subCategoryId =
                      selectedClassification!.categories[
                        categoryFilter.categoryTreeIndex!
                      ].subCategories[treeIndex].id;
                    obj.subCategoryTreeIndex = treeIndex;
                    return obj;
                  });
                } else {
                  setCategoryFilter((was) => {
                    const obj = { ...was };
                    delete obj.subCategoryId;
                    delete obj.subCategoryTreeIndex;
                    return obj;
                  });
                }
              }}
            >
              {categoryFilter.categoryTreeIndex !== undefined
                ? selectedClassification!.categories[
                    categoryFilter.categoryTreeIndex
                  ].subCategories.map((subCategory, i) => (
                    <option value={i} key={i}>
                      {subCategory.subCategory}
                    </option>
                  ))
                : null}
            </Select>
            <CloseButton
              aria-label={`Stop filtering by ${selectedClassification?.subCategoryLabel}`}
              data-test="Stop Filter By Subcategory"
              disabled={categoryFilter.categoryId === undefined}
              onClick={() => {
                setCategoryFilter((was) => {
                  const obj = { ...was };
                  delete obj.subCategoryId;
                  delete obj.subCategoryTreeIndex;
                  return obj;
                });
              }}
            />
          </HStack>

          <Input
            type="search"
            data-test="Search Terms"
            placeholder="Filter by search terms"
            aria-label="Filter by search terms"
            maxWidth="30rem"
            onInput={updateSearchTerms}
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                updateSearchTerms(e, true);
              }
            }}
            marginBottom={10}
            marginTop={4}
          />
        </ModalHeader>
        <ModalBody>
          <Box data-test="Matching Classifications">
            {classificationOptions.length === 0 ? (
              <p>No matching classifications</p>
            ) : null}

            {classificationOptions.map((classification) => {
              const added = existingClassifications
                .map((c) => c.id)
                .includes(classification.id);
              const buttonText = added ? "Remove" : "Add";
              const actionPath = added
                ? "classifications/removeClassification"
                : "classifications/addClassification";

              let descriptionIndex = 0;

              if (selectedClassification !== null) {
                descriptionIndex = findClassificationDescriptionIndex({
                  classification,
                  systemName: selectedClassification.name,
                  category:
                    selectedClassification.categories[
                      categoryFilter.categoryTreeIndex ?? -1
                    ]?.category,
                  subCategory:
                    selectedClassification.categories[
                      categoryFilter.categoryTreeIndex ?? -1
                    ]?.subCategories[categoryFilter.subCategoryTreeIndex ?? -1]
                      ?.subCategory,
                });
              }

              if (descriptionIndex === -1) {
                return null;
              }

              const {
                code,
                systemName,
                categoryLabel,
                category,
                subCategoryLabel,
                subCategory,
                description,
                descriptionLabel,
              } = reformatClassificationData(classification, descriptionIndex);

              let aliasNote: ReactElement<any> | null = null;

              if (descriptionIndex !== 0) {
                const aliasedAugmentedDescription =
                  getClassificationAugmentedDescription(classification, 0);

                const systemChanged =
                  systemName !==
                  classification.descriptions[0].subCategory.category.system
                    .name;

                let aliasText = `"${aliasedAugmentedDescription}"`;
                if (systemChanged) {
                  aliasText += ` from ${
                    classification.descriptions[0].subCategory.category.system
                      .name
                  }`;
                }

                aliasNote =
                  descriptionIndex === 0 ? null : (
                    <Text>
                      <Text as="i">Alias of:</Text> {aliasText}
                    </Text>
                  );
              }

              return (
                <Card
                  backgroundColor={added ? "lightGray" : "var(--canvas)"}
                  key={classification.id}
                >
                  <CardBody paddingLeft={2}>
                    <HStack>
                      <Heading size="sm">
                        {code} ({systemName})
                      </Heading>
                      <Spacer />

                      <Button
                        size="sm"
                        isDisabled={
                          dropdownWaitingForChange === classification.id
                        }
                        onClick={() => {
                          setDropdownWaitingForChange(classification.id);
                          fetcher.submit(
                            {
                              path: actionPath,
                              contentId,
                              classificationId: classification.id,
                            },
                            { method: "post", encType: "application/json" },
                          );
                        }}
                        data-test={`${buttonText} ${classification.code}`}
                      >
                        {dropdownWaitingForChange === classification.id ? (
                          <Spinner />
                        ) : (
                          buttonText
                        )}
                      </Button>
                    </HStack>
                    <Box>
                      <Text>
                        <Text as="i">{categoryLabel}:</Text>{" "}
                        <Highlight
                          query={queryFilter?.split(" ") || ""}
                          styles={{ fontWeight: "bold" }}
                        >
                          {category}
                        </Highlight>
                      </Text>
                      <Text>
                        <Text as="i">{subCategoryLabel}:</Text>{" "}
                        <Highlight
                          query={queryFilter?.split(" ") || ""}
                          styles={{ fontWeight: "bold" }}
                        >
                          {subCategory}
                        </Highlight>
                      </Text>
                      <Text>
                        <Text as="i">{descriptionLabel}:</Text>{" "}
                        <Highlight
                          query={(queryFilter || "").split(" ")}
                          styles={{ fontWeight: "bold" }}
                        >
                          {description}
                        </Highlight>
                      </Text>
                      {aliasNote}
                    </Box>
                  </CardBody>
                </Card>
              );
            })}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
