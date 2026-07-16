// The intermediate model: the contract between 01-extract (which reads the
// legacy scratch DB + media tree) and the later stages (image upload, import).
// Written to build/model.json. Contains file *paths*, never file contents,
// so it stays small enough to review and diff.

import type { ActivityShape } from "./flatten";

export interface PageRef {
  pageId: string;
  label: string;
  /** Path of the DoenetML source relative to the legacy media dir, or null if the file is missing. */
  sourceFile: string | null;
  bytes: number;
  /** cids of uploaded media referenced from this page via doenet:cid= */
  cids: string[];
}

export interface ActivityNode {
  kind: "activity";
  legacyDoenetId: string;
  legacyCourseId: string;
  label: string;
  legacyType: "activity" | "bank";
  shape: ActivityShape;
  pages: PageRef[];
  issues: string[];
}

export interface SectionNode {
  kind: "section";
  legacyDoenetId: string;
  label: string;
  children: TreeNode[];
  issues: string[];
}

export type TreeNode = ActivityNode | SectionNode;

export interface CourseModel {
  legacyCourseId: string;
  label: string;
  ownerLegacyUserIds: string[];
  tree: TreeNode[];
}

export interface UserModel {
  legacyUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  screenName: string;
  /** Flat list of portfolio activities, or null if the user has no portfolio. */
  portfolio: ActivityNode[] | null;
  /** Ids of the courses this user owns (bodies live in Model.courses). */
  ownedCourseIds: string[];
}

export interface SupportFileInfo {
  cid: string;
  ext: string;
  mimeType: string;
  description: string | null;
  asFileName: string | null;
  /** Path relative to the legacy media dir, or null if the file is missing. */
  file: string | null;
  bytes: number;
  uploaderName: string;
}

export interface Model {
  generatedAt: string;
  /** Media dir the model was extracted from — informational only; later
   * stages resolve files against config.legacyMediaDir so model.json stays
   * portable across machines. */
  legacyMediaDir: string;
  users: UserModel[];
  /** Courses keyed by legacyCourseId; a multi-owner course appears once. */
  courses: Record<string, CourseModel>;
  /** Referenced uploadable media, keyed by cid. */
  supportFiles: Record<string, SupportFileInfo>;
  stats: Record<string, number>;
}
