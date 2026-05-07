import { TbPuzzle } from "react-icons/tb";
import {
  MdAssignment,
  MdOutlineOndemandVideo,
  MdOutlineSwipeLeft,
} from "react-icons/md";
import {
  ContentClassification,
  Content,
  ContentType,
  DoenetmlVersion,
} from "../types";
import { ActivitySource } from "@doenet-tools/shared";
import { IconType } from "react-icons/lib";
import { FaFolder } from "react-icons/fa";
import { FaListOl } from "react-icons/fa6";
import { RiArchive2Fill } from "react-icons/ri";
import { ReactElement, createElement } from "react";
import { Icon } from "@chakra-ui/react";
import { IoStatsChart } from "react-icons/io5";

/**
 * Content category icons. Displayed in this order.
 */
export const activityCategoryIcons = {
  isQuestion: TbPuzzle,
  isInteractive: MdOutlineSwipeLeft,
  containsVideo: MdOutlineOndemandVideo,
};

/**
 * Return augmented description from `classification`
 * with index given by the specified `index` (which defaults to `0`).
 *
 * If the classification system has `categoriesInDescription` set to `true`, then this
 * text include the category and subcategory, along with the description.
 * Otherwise, the text is just the description.
 */
export function getClassificationAugmentedDescription(
  classification: ContentClassification,
  index: number = 0,
) {
  const description = classification.descriptions[index];
  const categoriesInDescription =
    description.subCategory.category.system.categoriesInDescription;

  if (categoriesInDescription) {
    return (
      description.subCategory.category.category +
      " | " +
      description.subCategory.subCategory +
      " | " +
      description.description
    );
  } else {
    return description.description;
  }
}

/**
 * Reformat the description from `classification`
 * with index given by the specified `index` (which defaults to `0`).
 * Return a single object with information about that description.
 */
export function reformatClassificationData(
  classification: ContentClassification,
  index: number = 0,
) {
  const description = classification.descriptions[index];
  const system = description.subCategory.category.system;
  return {
    code: classification.code,
    systemName: system.name,
    categoryLabel: system.categoryLabel,
    category: description.subCategory.category.category,
    subCategoryLabel: system.subCategoryLabel,
    subCategory: description.subCategory.subCategory,
    descriptionLabel: system.descriptionLabel,
    description: description.description,
  };
}

/**
 * Find the the index of the first description of `classification`
 * that matches `systemName`, and if specified, also matches the `category` and `subCategory`.
 */
export function findClassificationDescriptionIndex({
  classification,
  systemName,
  category,
  subCategory,
}: {
  classification: ContentClassification;
  systemName: string;
  category?: string;
  subCategory?: string;
}) {
  const classificationList = classification.descriptions.map((_v, i) =>
    reformatClassificationData(classification, i),
  );

  return classificationList.findIndex((c) => {
    if (c.systemName !== systemName) {
      return false;
    }
    if (!category) {
      return true;
    }
    if (c.category !== category) {
      return false;
    }
    if (!subCategory) {
      return true;
    }
    return c.subCategory === subCategory;
  });
}

export function compileActivityFromContent(activity: Content): ActivitySource {
  switch (activity.type) {
    case "singleDoc": {
      return {
        id: activity.contentId,
        type: activity.type,
        title: activity.name,
        isDescription: false,
        doenetML: activity.doenetML,
        version: activity.doenetmlVersion.fullVersion,
        numVariants: activity.numVariants,
      };
    }
    case "select": {
      return {
        id: activity.contentId,
        type: activity.type,
        title: activity.name,
        numToSelect: activity.numToSelect,
        selectByVariant: activity.selectByVariant,
        items: activity.children.map(compileActivityFromContent),
      };
    }
    case "sequence": {
      return {
        id: activity.contentId,
        type: activity.type,
        title: activity.name,
        shuffle: activity.shuffle,
        items: activity.children.map(compileActivityFromContent),
      };
    }
    case "folder": {
      throw Error("No folder here");
    }
  }
}

export const contentTypeToName = {
  singleDoc: "Document",
  select: "Question Bank",
  sequence: "Problem Set",
  folder: "Folder",
};

export function getAllowedParentTypes(childTypes: ContentType[]) {
  const allowedParentTypes: ContentType[] = ["folder"];
  if (!childTypes.includes("folder") && !childTypes.includes("sequence")) {
    allowedParentTypes.push("sequence");
    if (!childTypes.includes("select")) {
      allowedParentTypes.push("select");
    }
  }
  return allowedParentTypes.reverse();
}

export function getIconInfo(contentType: ContentType, isAssignment: boolean) {
  let iconImage: IconType;
  let iconColor: string;
  if (isAssignment) {
    iconImage = IoStatsChart;
    iconColor = "blue";
  } else if (contentType === "folder") {
    iconImage = FaFolder;
    iconColor = "#e6b800";
  } else if (contentType === "singleDoc") {
    iconImage = MdAssignment;
    iconColor = "#ff6600";
  } else if (contentType === "sequence") {
    iconImage = FaListOl;
    iconColor = "#cc3399";
  } else {
    // select
    iconImage = RiArchive2Fill;
    iconColor = "#009933";
  }

  return { iconImage, iconColor };
}

export const menuIcons: Record<string, ReactElement<any>> = {};

for (const t of ["folder", "sequence", "select", "singleDoc"]) {
  const ct = t as ContentType;
  const { iconImage, iconColor } = getIconInfo(ct, false);
  const icon = createElement(Icon, {
    as: iconImage,
    color: iconColor,
    marginRight: "5px",
    "aria-label": contentTypeToName[ct],
  });

  menuIcons[t] = icon;
}

export function getDoenetMLDeprecationWarnings(
  doenetmlVersion: DoenetmlVersion,
) {
  return doenetmlVersion.deprecated
    ? [
        {
          level: 1,
          message: `DoenetML version
            ${doenetmlVersion.displayedVersion} is deprecated.
            ${doenetmlVersion.deprecationMessage}`,
          doenetMLrange: {},
        },
      ]
    : [];
}
