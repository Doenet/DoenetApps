import { getCategoryIssues, type CategoryIssue } from "@doenet-tools/shared";
import { ContentType, Visibility } from "@prisma/client";
import {
  getContentAuditIssues,
  selectContentAuditFields,
  type ContentAuditIssue,
} from "../content-audit";
import { prisma } from "../model";
import { InvalidRequestError } from "../utils/error";
import { getDescendantIds } from "../query/activity";
import type { AccessPolicy } from "./types";
import { filterExcludeAssignments } from "../utils/permissions";
import { StatusCodes } from "http-status-codes";
import { isEqualUUID } from "../utils/uuid";
import {
  ContentPayload,
  contentSelect,
  mergeContentSelects,
} from "../utils/prismaSelect";
import { isAssignment, selectAssignmentFields } from "../assignments";
import { getAllCategories, selectCategoryFields } from "../categories";

// __________________________________________________________________________
//
//
//                     Exported types and functions
//
// __________________________________________________________________________
//

/**
 * Issues that would prevent a content item from being shared publicly
 */
export type PublicShareIssue = CategoryIssue | ContentAuditIssue;

/**
 * A violation that would prevent a content item from being shared publicly
 */
export type PublicShareViolation = {
  contentId: Uint8Array;
  name: string;
  type: ContentType;
  issues: PublicShareIssue[];
};

/**
 * Updates the visibility of a content item and its descendants.
 *
 * Rules:
 * 1. Only the owner can change visibility
 * 2. Assignments cannot have their visibility changed (always private)
 * 3. A child cannot be less public than its parent
 * 4. Content within an assignment cannot have visibility changed
 * 5. There are additional criteria to be shared publicly, see {@link getPublicShareViolations}
 */
export async function updateVisibility({
  loggedInUserId,
  contentId,
  visibility,
}: {
  loggedInUserId: Uint8Array;
  contentId: Uint8Array;
  visibility: Visibility;
}): Promise<AccessPolicy> {
  const content = await prisma.content.findFirst({
    where: { id: contentId, isDeletedOn: null },
    select: selectRelevantFields,
  });

  if (!content || !isEqualUUID(content.ownerId, loggedInUserId)) {
    throw new InvalidRequestError("Content not found", StatusCodes.NOT_FOUND);
  }

  if (isAssignment(content)) {
    throw new InvalidRequestError("Assignment visibility cannot be changed");
  }

  // Validate hierarchy: child cannot be less public than parent
  if (content.parent) {
    const parentLevel = visibilityOrder[content.parent.visibility];
    const newLevel = visibilityOrder[visibility];
    if (newLevel < parentLevel) {
      throw new InvalidRequestError(
        `Cannot set visibility to ${visibility} (less public than parent's ${content.parent.visibility})`,
      );
    }
  }

  const descendantIds = await getDescendantIds(contentId, {
    excludeAssignments: true,
  });
  const contentIds = [contentId, ...descendantIds];

  if (visibility === "public") {
    if (content.type === "folder") {
      throw new InvalidRequestError(
        `Publicly sharing folders is not yet implemented.`,
      );
    }

    const violations = await getPublicShareViolationsForContent({
      content,
      descendantIds,
    });

    if (violations.length > 0) {
      throw new InvalidRequestError(formatPublicShareViolation(violations));
    }
  }

  const publiclySharedAt = visibility === "public" ? new Date() : null;

  // Update share timestamp for those whose share status is changing
  const updateTimestamp = prisma.content.updateMany({
    where: {
      id: { in: contentIds },
      NOT: { visibility },
      ...filterExcludeAssignments,
    },
    data: { publiclySharedAt },
  });

  const updateContent = prisma.content.updateMany({
    where: {
      id: { in: contentIds },
      ...filterExcludeAssignments,
    },
    data: {
      visibility,
      isPublic: visibility === "public", // legacy flag, remove eventually
    },
  });

  // Note: updateTimestamp first because it checks `visibility` status
  await prisma.$transaction([updateTimestamp, updateContent]);

  return { visibility };
}

// __________________________________________________________________________
//
//
//                 Internal types and helper functions
//
//___________________________________________________________________________
//

// Visibility levels ordered from most restrictive to least restrictive
const visibilityOrder: Record<Visibility, number> = {
  private: 0,
  unlisted: 1,
  public: 2,
};

const generalFields = contentSelect({
  id: true,
  name: true,
  type: true,
  ownerId: true,
  visibility: true,
  parent: {
    select: {
      visibility: true,
    },
  },
});

const selectRelevantFields = mergeContentSelects(
  generalFields,
  selectContentAuditFields,
  selectAssignmentFields,
);

type RelevantFields = ContentPayload<typeof selectRelevantFields>;

/**
 * Checks a content item and its descendants for issues that would prevent it from being made `public`.
 *
 * Criteria for public sharing:
 * 1. All required categories must be filled out
 * 2. Documents must have no errors
 * 3. Documents must have no level 1 accessibility violations
 */
export async function getPublicShareViolations({
  contentIds,
}: {
  contentIds: Uint8Array[];
}): Promise<PublicShareViolation[]> {
  const [contentId, ...descendantIds] = contentIds;

  if (!contentId) {
    return [];
  }

  const content = await prisma.content.findUniqueOrThrow({
    where: { id: contentId, isDeletedOn: null },
    select: selectRelevantFields,
  });

  return getPublicShareViolationsForContent({ content, descendantIds });
}

async function getPublicShareViolationsForContent({
  content,
  descendantIds,
}: {
  content: RelevantFields;
  descendantIds: Uint8Array[];
}): Promise<PublicShareViolation[]> {
  const fetchDescendantAudits = prisma.content.findMany({
    where: { id: { in: descendantIds } },
    select: mergeContentSelects(
      selectContentAuditFields,
      { id: true },
      { name: true },
      { type: true },
    ),
  });

  const fetchAllCategories = getAllCategories();

  const fetchCategoryFields = prisma.content.findUniqueOrThrow({
    where: { id: content.id },
    select: selectCategoryFields,
  });

  const [descendantAudits, { allCategories }, { categories }] =
    await Promise.all([
      fetchDescendantAudits,
      fetchAllCategories,
      fetchCategoryFields,
    ]);

  const violations: PublicShareViolation[] = descendantAudits.map((audit) => ({
    contentId: audit.id,
    name: audit.name,
    type: audit.type,
    issues: getContentAuditIssues(audit),
  }));
  violations.push({
    contentId: content.id,
    name: content.name,
    type: content.type,
    issues: [
      ...getContentAuditIssues(content),
      ...getCategoryIssues({ allCategories, categories }),
    ],
  });

  return violations.filter((violation) => violation.issues.length > 0);
}

/**
 * Formats a list of public share violations into a user-friendly error message.
 */
function formatPublicShareViolation(violations: PublicShareViolation[]) {
  const issues = new Set(violations.flatMap((violation) => violation.issues));
  const blockingCriteria: string[] = [];

  if (issues.has("missingRequiredCategories")) {
    blockingCriteria.push("required categories are filled out");
  }
  if (issues.has("errorsCheck") || issues.has("errorsCheckPending")) {
    blockingCriteria.push("documents have no errors");
  }
  if (
    issues.has("accessibilityCheck") ||
    issues.has("accessibilityCheckPending")
  ) {
    blockingCriteria.push("documents have no level 1 accessibility violations");
  }
  return `Content cannot be made public until ${blockingCriteria.join(", ")}.`;
}
