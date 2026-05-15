import { AuditState } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../model";
import { filterEditableActivity, getIsEditor } from "../utils/permissions";
import { ContentPayload, contentSelect } from "../utils/prismaSelect";
import { InvalidRequestError } from "../utils/error";

/**
 * Enumerates the content-audit issues that can affect a content node.
 *
 * These issue codes are returned by helpers in this module and represent
 * the conditions that must be confirmed before content is treated
 * as having passed the audit.
 */
export type ContentAuditIssue = "errorsCheck" | "accessibilityCheck";

/**
 * The audit status for a piece of content.
 *
 * Each check stores whether the content is known to pass, known to fail,
 * or has not been audited since the latest source change.
 */
export type ContentAudit = {
  errorsCheck: AuditState;
  accessibilityCheck: AuditState;
};

/**
 * Prisma selection for the minimal set of database fields (from
 * the `content` table) needed to manage audits.
 */
export const selectContentAuditFields = contentSelect({
  type: true,
  errorsCheck: true,
  accessibilityCheck: true,
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
  errorsCheck: AuditState.unchecked,
  accessibilityCheck: AuditState.unchecked,
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
  const { type, errorsCheck, accessibilityCheck } = contentAuditFields;

  if (type === "singleDoc" && errorsCheck !== AuditState.pass) {
    issues.push("errorsCheck");
  }
  if (type === "singleDoc" && accessibilityCheck !== AuditState.pass) {
    issues.push("accessibilityCheck");
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
 * states are reset to `unchecked` because the previous audit no longer applies.
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
  source,
  errorsCheckPasses,
  accessibilityCheckPasses,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
  source: string;
  errorsCheckPasses: boolean;
  accessibilityCheckPasses: boolean;
}): Promise<ContentAuditFields> {
  const isEditor = await getIsEditor(loggedInUserId);

  const content = await prisma.content.findFirstOrThrow({
    where: {
      id: contentId,
      ...filterEditableActivity(loggedInUserId, isEditor),
      type: "singleDoc",
    },
    select: {
      id: true,
      source: true,
    },
  });

  if (content.source !== source) {
    throw new InvalidRequestError(
      "Content source is out of date",
      StatusCodes.CONFLICT,
    );
  }

  return await prisma.content.update({
    where: { id: contentId },
    data: {
      errorsCheck: errorsCheckPasses ? AuditState.pass : AuditState.fail,
      accessibilityCheck: accessibilityCheckPasses
        ? AuditState.pass
        : AuditState.fail,
    },
    select: {
      ...selectContentAuditFields,
    },
  });
}
