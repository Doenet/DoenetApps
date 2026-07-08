import { UserInfoWithEmail, Visibility } from "../../types";

/**
 * Identifies which public-sharing requirement the content currently fails or is
 * still waiting on, so the sharing UI can explain why the content cannot be
 * listed publicly yet.
 */
export type PublicShareIssue =
  | "missingRequiredCategories"
  | "errorsCheck"
  | "errorsCheckPending"
  | "accessibilityCheck"
  | "accessibilityCheckPending";

/**
 * Snapshot of the sharing state for one content item, used by the share modal
 * and by editor headers that surface public compliance warnings.
 */
export type SharingData = {
  ownerId: string;
  visibility: Visibility;
  parentVisibility: Visibility;
  canSharePublicly: boolean;
  publicShareIssues: PublicShareIssue[];
  sharedWith: UserInfoWithEmail[];
  parentSharedWith: UserInfoWithEmail[];
};
