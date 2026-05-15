import { RefObject } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
} from "@chakra-ui/react";
import { PartialContentClassification, UserInfo } from "../types";
import { CategoryGroup } from "@doenet-tools/shared";
import { NavigateFunction } from "react-router";
import { FilterPanel } from "../widgets/FilterPanel";

export function ExploreFilterDrawer({
  isOpen,
  onClose,
  finalFocusRef,
  topAuthors,
  authorInfo,
  classificationBrowse,
  subCategoryBrowse,
  categoryBrowse,
  systemBrowse,
  classificationInfo,
  countByCategory,
  categories,
  allCategories,
  search,
  navigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
  topAuthors: UserInfo[] | null;
  authorInfo: UserInfo | null;
  classificationBrowse: PartialContentClassification[] | null;
  subCategoryBrowse: PartialContentClassification[] | null;
  categoryBrowse: PartialContentClassification[] | null;
  systemBrowse: PartialContentClassification[] | null;
  classificationInfo: PartialContentClassification | null;
  countByCategory: Record<
    string,
    { numCurated?: number; numCommunity?: number }
  >;
  categories: Set<string>;
  allCategories: CategoryGroup[];
  search: string;
  navigate: NavigateFunction;
}) {
  return (
    <Drawer
      isOpen={isOpen}
      placement="left"
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size="sm"
    >
      <DrawerOverlay />
      <DrawerContent aria-label="Explore filter options">
        <DrawerCloseButton data-test="Close Filters Button" />

        <DrawerBody margin={0} padding={0}>
          <FilterPanel
            topAuthors={topAuthors}
            authorInfo={authorInfo}
            classificationBrowse={classificationBrowse}
            subCategoryBrowse={subCategoryBrowse}
            categoryBrowse={categoryBrowse}
            systemBrowse={systemBrowse}
            classificationInfo={classificationInfo}
            countByCategory={countByCategory}
            categories={categories}
            allCategories={allCategories}
            search={search}
            navigate={navigate}
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
