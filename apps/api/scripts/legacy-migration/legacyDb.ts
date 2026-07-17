// Read-only access to the scratch MySQL database holding the legacy dump
// (created by 00-load-scratch.sh). Uses a dedicated PrismaClient with the
// datasource URL overridden — raw queries only, so the Prisma schema (which
// describes the *target* database) never validates against these tables.
import { PrismaClient } from "@prisma/client";

export interface LegacyUserRow {
  userId: string;
  email: string | null;
  screenName: string | null;
  firstName: string;
  lastName: string;
}

export interface LegacyCourseRow {
  courseId: string;
  label: string;
  portfolioCourseForUserId: string | null;
}

export interface LegacyCourseContentRow {
  type: "activity" | "bank" | "section";
  courseId: string;
  doenetId: string;
  parentDoenetId: string;
  label: string;
  sortOrder: string | null;
  /** Prisma returns MySQL JSON columns already parsed. */
  jsonDefinition: unknown;
}

export interface LegacyPageRow {
  containingDoenetId: string;
  doenetId: string;
  label: string;
  isDeleted: number;
}

export interface LegacySupportFileRow {
  userId: string;
  cid: string;
  doenetId: string;
  fileType: string;
  description: string | null;
  asFileName: string | null;
  sizeInBytes: number | null;
}

export function openLegacyDb(url: string) {
  const client = new PrismaClient({ datasources: { db: { url } } });

  return {
    client,

    /** Legacy users owning a non-deleted, non-empty portfolio course. */
    portfolioUsers(): Promise<
      (LegacyUserRow & { portfolioCourseId: string })[]
    > {
      return client.$queryRawUnsafe(`
        SELECT u.userId, u.email, u.screenName, u.firstName, u.lastName,
               co.courseId AS portfolioCourseId
        FROM course co
        JOIN user u ON u.userId = co.portfolioCourseForUserId
        WHERE co.portfolioCourseForUserId IS NOT NULL
          AND co.isDeleted = 0
          AND EXISTS (SELECT 1 FROM course_content cc
                      WHERE cc.courseId = co.courseId AND cc.isDeleted = 0
                        AND cc.type IN ('activity', 'bank'))`);
    },

    /** (courseId, ownerUserId) pairs for non-deleted regular courses with content. */
    courseOwners(): Promise<{ courseId: string; userId: string }[]> {
      return client.$queryRawUnsafe(`
        SELECT DISTINCT co.courseId, cu.userId
        FROM course co
        JOIN course_user cu ON cu.courseId = co.courseId
        JOIN course_role cr ON cr.roleId = cu.roleId AND cr.isOwner = 1
        WHERE co.isDeleted = 0
          AND co.portfolioCourseForUserId IS NULL
          AND EXISTS (SELECT 1 FROM course_content cc
                      WHERE cc.courseId = co.courseId AND cc.isDeleted = 0)`);
    },

    usersByIds(userIds: string[]): Promise<LegacyUserRow[]> {
      if (userIds.length === 0) return Promise.resolve([]);
      const list = userIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
      return client.$queryRawUnsafe(`
        SELECT userId, email, screenName, firstName, lastName
        FROM user WHERE userId IN (${list})`);
    },

    coursesByIds(courseIds: string[]): Promise<LegacyCourseRow[]> {
      if (courseIds.length === 0) return Promise.resolve([]);
      const list = courseIds
        .map((id) => `'${id.replace(/'/g, "''")}'`)
        .join(",");
      return client.$queryRawUnsafe(`
        SELECT courseId, label, portfolioCourseForUserId
        FROM course WHERE courseId IN (${list})`);
    },

    /** All non-deleted content rows of one course, in legacy display order. */
    courseContent(courseId: string): Promise<LegacyCourseContentRow[]> {
      return client.$queryRawUnsafe(
        `SELECT type, courseId, doenetId, parentDoenetId, label, sortOrder, jsonDefinition
         FROM course_content
         WHERE courseId = ? AND isDeleted = 0 AND type IN ('activity','bank','section')
         ORDER BY sortOrder, doenetId`,
        courseId,
      );
    },

    /** All pages rows (including deleted, so extract can flag them). */
    allPages(): Promise<LegacyPageRow[]> {
      return client.$queryRawUnsafe(`
        SELECT containingDoenetId, doenetId, label, isDeleted FROM pages`);
    },

    /** pageId -> label for link_pages (bank-linked pages referenced by activities). */
    allLinkPages(): Promise<{ doenetId: string; label: string }[]> {
      return client.$queryRawUnsafe(`
        SELECT doenetId, label FROM link_pages`);
    },

    allSupportFiles(): Promise<LegacySupportFileRow[]> {
      return client.$queryRawUnsafe(`
        SELECT userId, cid, doenetId, fileType, description, asFileName, sizeInBytes
        FROM support_files`);
    },

    close() {
      return client.$disconnect();
    },
  };
}

export type LegacyDb = ReturnType<typeof openLegacyDb>;
