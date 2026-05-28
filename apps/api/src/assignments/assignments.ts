import { ContentPayload, contentSelect } from "../utils/prismaSelect";

/**
 * Prisma selection for the minimal set of database fields (from
 * the `content` table) needed to manage assignments
 */
export const selectAssignmentFields = contentSelect({
  isAssignmentRoot: true,
  parent: {
    select: {
      isAssignmentRoot: true,
    },
  },
});

/**
 * Payload shape produced by {@link selectAssignmentFields}.
 */
export type AssignmentFields = ContentPayload<typeof selectAssignmentFields>;

/**
 * Check if content is an assignment or part of an assignment.
 *
 * Requires data from {@link selectAssignmentFields}.
 */
export function isAssignment(assignmentFields: AssignmentFields): boolean {
  // Assignment content is shallow by design, so checking the root and immediate
  // parent is sufficient to exclude all assignment-owned content here.
  return (
    assignmentFields.isAssignmentRoot ||
    assignmentFields.parent?.isAssignmentRoot === true
  );
}
