// Turns one user's slice of the model into a concrete creation plan:
// the ordered folder list, each activity's destination folder and position,
// and the set of images each folder needs. Shared by 02-upload-images
// (which needs the (folder, cid) pairs) and 03-import (which creates
// everything), so the two stages can never disagree about placement.
import { ActivityNode, CourseModel, Model, TreeNode, UserModel } from "./model";

export interface PlannedFolder {
  key: string;
  name: string;
  parentKey: string | null; // null = the "Copied Legacy Content" root
  /** Position among the parent folder's children. */
  index: number;
  legacyId: string;
  legacyCourseId: string;
}

export interface PlannedActivity {
  node: ActivityNode;
  folderKey: string;
  /** Position among the folder's children (folders and activities share one sequence). */
  index: number;
}

export interface UserPlan {
  rootKey: string;
  folders: PlannedFolder[]; // in creation order: parents always precede children
  activities: PlannedActivity[];
  /** cids referenced by each folder's activities, in first-reference order. */
  imagesByFolder: Map<string, string[]>;
}

export function planUser(user: UserModel, model: Model): UserPlan {
  const uid = user.legacyUserId;
  const rootKey = `root:${uid}`;
  const folders: PlannedFolder[] = [];
  const activities: PlannedActivity[] = [];
  const imagesByFolder = new Map<string, string[]>();

  const noteImages = (folderKey: string, node: ActivityNode) => {
    for (const page of node.pages) {
      for (const cid of page.cids) {
        // only plan images we can actually supply
        if (!model.supportFiles[cid]?.file) continue;
        const list = imagesByFolder.get(folderKey) ?? [];
        if (!list.includes(cid)) {
          list.push(cid);
          imagesByFolder.set(folderKey, list);
        }
      }
    }
  };

  const emitTree = (nodes: TreeNode[], folderKey: string) => {
    nodes.forEach((node, index) => {
      if (node.kind === "section") {
        const key = `sec:${node.legacyDoenetId}:${uid}`;
        folders.push({
          key,
          name: node.label,
          parentKey: folderKey,
          index,
          legacyId: node.legacyDoenetId,
          legacyCourseId: "",
        });
        emitTree(node.children, key);
      } else {
        activities.push({ node, folderKey, index });
        noteImages(folderKey, node);
      }
    });
  };

  let rootIndex = 0;
  if (user.portfolio && user.portfolio.length > 0) {
    const pfKey = `pf:${uid}`;
    folders.push({
      key: pfKey,
      name: "Portfolio",
      parentKey: null,
      index: rootIndex++,
      legacyId: pfKey,
      legacyCourseId: "",
    });
    user.portfolio.forEach((node, index) => {
      activities.push({ node, folderKey: pfKey, index });
      noteImages(pfKey, node);
    });
  }

  const ownedCourses = user.ownedCourseIds
    .map((id) => model.courses[id])
    .filter((c): c is CourseModel => c !== undefined);
  if (ownedCourses.length > 0) {
    const coursesKey = `courses:${uid}`;
    folders.push({
      key: coursesKey,
      name: "Courses",
      parentKey: null,
      index: rootIndex++,
      legacyId: coursesKey,
      legacyCourseId: "",
    });
    ownedCourses.forEach((course, index) => {
      const courseKey = `course:${course.legacyCourseId}:${uid}`;
      folders.push({
        key: courseKey,
        name: course.label,
        parentKey: coursesKey,
        index,
        legacyId: course.legacyCourseId,
        legacyCourseId: course.legacyCourseId,
      });
      emitTree(course.tree, courseKey);
    });
  }

  return { rootKey, folders, activities, imagesByFolder };
}
