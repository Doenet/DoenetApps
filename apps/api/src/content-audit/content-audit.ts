import { prisma } from "../model";
import { filterEditableActivity, getIsEditor } from "../utils/permissions";
import { ContentPayload, contentSelect } from "../utils/prismaSelect";

export type ContentAuditIssue =
  | "documentErrors"
  | "level1AccessibilityViolations";

export type ContentAudit = {
  noErrorsConfirmed: boolean;
  accessibilityConfirmed: boolean;
};

export const selectContentAuditFields = contentSelect({
  type: true,
  noErrorsConfirmed: true,
  accessibilityConfirmed: true,
});

export type ContentAuditFields = ContentPayload<
  typeof selectContentAuditFields
>;

export const resetContentAuditFields: ContentAudit = {
  noErrorsConfirmed: false,
  accessibilityConfirmed: false,
} satisfies ContentAudit;

export function getContentAuditIssues(
  contentAuditFields: ContentAuditFields,
): ContentAuditIssue[] {
  const issues: ContentAuditIssue[] = [];
  const { type, noErrorsConfirmed, accessibilityConfirmed } =
    contentAuditFields;

  if (type === "singleDoc" && !noErrorsConfirmed) {
    issues.push("documentErrors");
  }
  if (type === "singleDoc" && !accessibilityConfirmed) {
    issues.push("level1AccessibilityViolations");
  }

  return issues;
}

export function contentAuditPasses(
  contentAuditFields: ContentAuditFields,
): boolean {
  return getContentAuditIssues(contentAuditFields).length === 0;
}

export function maintainContentAuditFields(source: string | undefined) {
  return source === undefined ? {} : resetContentAuditFields;
}

export async function updateContentAudit({
  contentId,
  loggedInUserId,
  noErrorsConfirmed,
  accessibilityConfirmed,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
} & ContentAudit): Promise<ContentAudit> {
  const isEditor = await getIsEditor(loggedInUserId);

  await prisma.content.findFirstOrThrow({
    where: {
      id: contentId,
      ...filterEditableActivity(loggedInUserId, isEditor),
      type: "singleDoc",
    },
    select: { id: true },
  });

  return await prisma.content.update({
    where: { id: contentId },
    data: {
      noErrorsConfirmed,
      accessibilityConfirmed,
    },
    select: {
      ...selectContentAuditFields,
    },
  });
}
