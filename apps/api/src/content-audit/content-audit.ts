import { prisma } from "../model";
import { filterEditableActivity, getIsEditor } from "../utils/permissions";
import { ContentPayload, contentSelect } from "../utils/prismaSelect";

/**
 * Enumerates the content-audit issues that can affect a content node.
 *
 * These issue codes are returned by helpers in this module and represent
 * the conditions that must be confirmed before content is treated
 * as having passed the audit.
 */
export type ContentAuditIssue =
  | "documentErrors"
  | "level1AccessibilityViolations";

/**
 * The audit status for a piece of content.
 *
 * If a flag is `true`, the content passes the check.
 * If a flag is `false`, the content either fails the
 * check or has not yet been confirmed as passing.
 */
export type ContentAudit = {
  noErrorsConfirmed: boolean;
  accessibilityConfirmed: boolean;
};

/**
 * Prisma selection for the minimal set of database fields (from
 * the `content` table) needed to manage audits.
 */
export const selectContentAuditFields = contentSelect({
  type: true,
  noErrorsConfirmed: true,
  accessibilityConfirmed: true,
});

/**
 * Payload shape produced by {@link selectContentAuditFields}.
 *
 * This is the input type expected by the audit-evaluation helpers in this
 * module.
 */
export type ContentAuditFields = ContentPayload<
  typeof selectContentAuditFields
>;

/**
 * Default audit state used after document content changes.
 *
 * Any source change invalidates earlier confirmations, so both audit flags
 * are reset to `false` until the updated document is reviewed again.
 */
export const resetContentAuditFields: ContentAudit = {
  noErrorsConfirmed: false,
  accessibilityConfirmed: false,
} satisfies ContentAudit;

/**
 * Returns the unresolved audit issues for the provided content.
 *
 * Only `singleDoc` content participates in this audit flow. Other content
 * types always return an empty list, even if the confirmation flags are false.
 *
 * @param contentAuditFields Content fields needed to evaluate audit status.
 * @returns The set of outstanding audit issues for the content.
 */
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

/**
 * Returns whether the content currently passes the content audit.
 *
 * This is a convenience wrapper around {@link getContentAuditIssues} that is
 * useful when callers only need a boolean pass/fail result.
 *
 * @param contentAuditFields Content fields needed to evaluate audit status.
 * @returns `true` when no audit issues remain, otherwise `false`.
 */
export function contentAuditPasses(
  contentAuditFields: ContentAuditFields,
): boolean {
  return getContentAuditIssues(contentAuditFields).length === 0;
}

/**
 * Use this whenever you're updating/creating content, and the update
 * might touch the doenetml source. We need to make sure that outdated
 * audits don't persist.
 *
 * When no new source is provided, this helper returns an empty update so the
 * existing confirmations are preserved. When source content is provided, both
 * confirmations are reset because the previous audit no longer applies.
 *
 * @param source Updated source content, if one is being saved.
 * @returns An empty update or a reset audit state, depending on whether the
 * source changed.
 */
export function maintainContentAuditFields(source: string | undefined) {
  return source === undefined ? {} : resetContentAuditFields;
}

/**
 * Store latest pass/fail audit results.
 *
 * The content must exist, belong to a document node, and be editable by the
 * requesting user.
 */
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
