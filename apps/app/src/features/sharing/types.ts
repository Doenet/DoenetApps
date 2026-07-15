import { ContentType, UserInfoWithEmail, Visibility } from "../../types";

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
 * A single content item (the item itself or a descendant document) that is
 * blocking public sharing, together with the specific issues it has. Used to
 * link directly to the document(s) responsible inside a compound item.
 */
export type PublicShareBlocker = {
  contentId: string;
  name: string;
  contentType: ContentType;
  issues: PublicShareIssue[];
};

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
  publicShareBlockers: PublicShareBlocker[];
  sharedWith: UserInfoWithEmail[];
  parentSharedWith: UserInfoWithEmail[];
};
