import { describe, expect, test } from "vitest";
import { createContent } from "../query/activity";
import {
  modifyContentSharedWith,
  setContentIsPublic,
  shareContentWithEmail,
  unshareContent,
} from "../query/share";
import { getContent } from "../query/activity_edit_view";
import { getMyContent, getSharedContent } from "../query/content_list";
import { moveContent } from "../query/copy_move";
import { updateUser } from "../query/user";
import { createTestUser, setupTestContent, doc, fold, pset } from "./utils";
import {
  setContentLicense,
  getLicense,
  getAllLicenses,
} from "../query/license";
import { getEditorSettings, getEditorShareStatus } from "../query/editor";
import { getSharedWithMe } from "../query/content_list";
import { isEqualUUID } from "../utils/uuid";
import { createAssignment } from "../query/assign";
import { DateTime } from "luxon";
import { prisma } from "../model";

describe("Share tests", () => {
  test("setContentIsPublic sets content to public/private and returns result", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const { contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });

    let result = await setContentIsPublic({
      contentId,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    expect(result.isPublic).eq(true);
    expect(result.visibility).eq("public");
    let content = await getContent({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(content.isPublic).eq(true);
    expect(content.visibility).eq("public");

    result = await setContentIsPublic({
      contentId,
      isPublic: false,
      loggedInUserId: ownerId,
    });
    expect(result.isPublic).eq(false);
    expect(result.visibility).eq("private");

    content = await getContent({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(content.isPublic).eq(false);
    expect(content.visibility).eq("private");
  });

  test("shareContentWithEmail/unshareContent shares/unshares content and returns result", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const user = await createTestUser();
    if (user.email === null) {
      throw new Error("User should have email");
    }

    const { contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });

    const result = await shareContentWithEmail({
      contentId,
      loggedInUserId: ownerId,
      email: user.email,
    });

    expect(result.userId).eqls(user.userId);
    expect(result.email).eq(user.email);

    let shareStatus = await getEditorShareStatus({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(shareStatus.sharedWith.map((obj) => obj.email)).eqls([user.email]);

    const result2 = await unshareContent({
      contentId,
      loggedInUserId: ownerId,
      userId: user.userId,
    });
    expect(result2.userId).eqls(user.userId);

    shareStatus = await getEditorShareStatus({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(shareStatus.sharedWith).eqls([]);
  });

  test("content in public folder is created as public", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const { contentId: publicFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });

    await setContentLicense({
      contentId: publicFolderId,
      loggedInUserId: ownerId,
      licenseCode: "CCBYSA",
    });
    await setContentIsPublic({
      contentId: publicFolderId,
      isPublic: true,
      loggedInUserId: ownerId,
    });

    // create a folder and activity in public folder
    const { contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: publicFolderId,
    });
    const { contentId: folderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: publicFolderId,
    });

    const result = await getMyContent({
      ownerId,
      parentId: publicFolderId,
      loggedInUserId: ownerId,
    });

    if (result.notMe) {
      throw Error("shouldn't happen");
    }
    const content = result.content;
    expect(content.length).eq(2);

    expect(content[0].contentId).eqls(contentId);
    expect(content[0].isPublic).eq(true);
    expect(content[0].visibility).eq("public");
    expect(content[0].licenseCode).eq("CCBYSA");

    expect(content[1].contentId).eqls(folderId);
    expect(content[1].isPublic).eq(true);
    expect(content[1].visibility).eq("public");
    expect(content[1].licenseCode).eq("CCBYSA");
  });

  test("content in shared folder is created shared", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;
    const user = await createTestUser();
    const userId = user.userId;
    const {
      isAnonymous: _isAnonymous,
      isAuthor: _isAuthor,
      isEditor: _isEditor,
      ...userFields
    } = user;

    const { contentId: publicFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });

    await setContentLicense({
      contentId: publicFolderId,
      loggedInUserId: ownerId,
      licenseCode: "CCBYSA",
    });
    await modifyContentSharedWith({
      action: "share",
      loggedInUserId: ownerId,
      contentId: publicFolderId,
      users: [userId],
    });

    // create a folder and activity in public folder
    const { contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: publicFolderId,
    });
    const { contentId: folderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: publicFolderId,
    });

    const result = await getMyContent({
      ownerId,
      parentId: publicFolderId,
      loggedInUserId: ownerId,
    });
    if (result.notMe) {
      throw Error("shouldn't happen");
    }
    const content = result.content;
    expect(content.length).eq(2);

    expect(content[0].contentId).eqls(contentId);
    expect(content[0].isShared).eq(true);
    expect(content[0].sharedWith).eqls([userFields]);
    expect(content[0].licenseCode).eq("CCBYSA");

    expect(content[1].contentId).eqls(folderId);
    expect(content[1].isShared).eq(true);
    expect(content[1].sharedWith).eqls([userFields]);
    expect(content[1].licenseCode).eq("CCBYSA");
  });

  test("if content has a public parent, cannot make it private", async () => {
    const { userId: ownerId } = await createTestUser();

    const { contentId: folderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    await setContentLicense({
      contentId: folderId,
      loggedInUserId: ownerId,
      licenseCode: "CCBYNCSA",
    });
    await setContentIsPublic({
      contentId: folderId,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    // creating content inside a public folder make it public with same license
    const { contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: folderId,
    });
    let activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(activity.isPublic).eq(true);
    expect(activity.visibility).eq("public");
    expect(activity.licenseCode).eq("CCBYNCSA");

    // change license of content is OK
    await setContentLicense({
      contentId,
      loggedInUserId: ownerId,
      licenseCode: "CCDUAL",
    });
    activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(activity.isPublic).eq(true);
    expect(activity.visibility).eq("public");
    expect(activity.licenseCode).eq("CCDUAL");

    // since have public parent, cannot make child private
    await expect(
      setContentIsPublic({
        contentId,
        loggedInUserId: ownerId,
        isPublic: false,
      }),
    ).rejects.toThrow("cannot make it private");

    // make parent private, activity becomes private

    await setContentIsPublic({
      contentId: folderId,
      loggedInUserId: ownerId,
      isPublic: false,
    });

    activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(activity.isPublic).eq(false);
    expect(activity.visibility).eq("private");

    // make the content public
    await setContentIsPublic({
      contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(activity.isPublic).eq(true);
    expect(activity.visibility).eq("public");

    // can make it private now
    await setContentIsPublic({
      contentId,
      loggedInUserId: ownerId,
      isPublic: false,
    });
    activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(activity.isPublic).eq(false);
    expect(activity.visibility).eq("private");
  });

  // TODO: make test, if content has a parent that is shared with a user, cannot unshare with that user
  test("if content has a parent that is shared with a user, cannot unshare with that user", async () => {
    const { userId: ownerId } = await createTestUser();
    const { userId: userId1 } = await createTestUser();
    const { userId: userId2 } = await createTestUser();

    const { contentId: folderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    await setContentLicense({
      contentId: folderId,
      loggedInUserId: ownerId,
      licenseCode: "CCBYNCSA",
    });
    await modifyContentSharedWith({
      action: "share",
      contentId: folderId,
      loggedInUserId: ownerId,
      users: [userId1],
    });

    // creating content inside a shared folder make it shared with same people and with same license
    const { contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: folderId,
    });
    let activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
      includeShareDetails: true,
    });
    expect(activity.isShared).eq(true);
    expect(activity.licenseCode).eq("CCBYNCSA");
    expect(activity.sharedWith.map((s) => s.userId)).eqls([userId1]);

    // change license of content is OK
    await setContentLicense({
      contentId,
      loggedInUserId: ownerId,
      licenseCode: "CCDUAL",
    });
    activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
      includeShareDetails: true,
    });
    expect(activity.isShared).eq(true);
    expect(activity.licenseCode).eq("CCDUAL");
    expect(activity.sharedWith.map((s) => s.userId)).eqls([userId1]);

    // since have parent is shared with userId1, cannot unshare it with userId1
    await expect(
      modifyContentSharedWith({
        action: "unshare",
        contentId,
        loggedInUserId: ownerId,
        users: [userId1],
      }),
    ).rejects.toThrow("cannot stop sharing with that user");

    // can share and unshare with userId2
    await modifyContentSharedWith({
      action: "share",
      contentId,
      loggedInUserId: ownerId,
      users: [userId2],
    });
    activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
      includeShareDetails: true,
    });
    expect(activity.isShared).eq(true);
    expect(activity.licenseCode).eq("CCDUAL");
    expect(activity.sharedWith.map((s) => s.userId)).eqls([userId1, userId2]);

    await modifyContentSharedWith({
      action: "unshare",
      contentId,
      loggedInUserId: ownerId,
      users: [userId2],
    });
    activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
      includeShareDetails: true,
    });
    expect(activity.isShared).eq(true);
    expect(activity.licenseCode).eq("CCDUAL");
    expect(activity.sharedWith.map((s) => s.userId)).eqls([userId1]);

    // unshare parent with userId1, activity is unshared with userId1
    await modifyContentSharedWith({
      action: "unshare",
      contentId: folderId,
      loggedInUserId: ownerId,
      users: [userId1],
    });

    activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(activity.isShared).eq(false);
    expect(activity.licenseCode).eq("CCDUAL");
    expect(activity.sharedWith).eqls([]);

    // share the content with userId1
    await modifyContentSharedWith({
      action: "share",
      contentId,
      loggedInUserId: ownerId,
      users: [userId1],
    });
    activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
      includeShareDetails: true,
    });
    expect(activity.isShared).eq(true);
    expect(activity.licenseCode).eq("CCDUAL");
    expect(activity.sharedWith.map((s) => s.userId)).eqls([userId1]);

    // can now unshare it with userId1
    await modifyContentSharedWith({
      action: "unshare",
      contentId,
      loggedInUserId: ownerId,
      users: [userId1],
    });
    activity = await getContent({
      contentId,
      loggedInUserId: ownerId,
      includeShareDetails: true,
    });
    expect(activity.isShared).eq(false);
    expect(activity.licenseCode).eq("CCDUAL");
    expect(activity.sharedWith).eqls([]);
  });

  test(
    "sharing/unsharing a folder also shares/unshares its content",
    { timeout: 30000 },
    async () => {
      const owner = await createTestUser();
      const ownerId = owner.userId;
      let user1 = await createTestUser();
      const user1Id = user1.userId;
      user1 = await updateUser({
        loggedInUserId: user1Id,
        firstNames: "Zoe",
        lastNames: "Zaborowski",
      });
      const {
        isAnonymous: _isAnonymous1,
        isAuthor: _isAuthor1,
        isEditor: _isEditor1,
        ...userFields1
      } = user1;
      let user2 = await createTestUser();
      const user2Id = user2.userId;
      user2 = await updateUser({
        loggedInUserId: user2Id,
        firstNames: "Arya",
        lastNames: "Abbas",
      });
      const {
        isAnonymous: _isAnonymous2,
        isAuthor: _isAuthor2,
        isEditor: _isEditor2,
        ...userFields2
      } = user2;
      let user3 = await createTestUser();
      const user3Id = user3.userId;
      user3 = await updateUser({
        loggedInUserId: user3Id,
        firstNames: "Nyla",
        lastNames: "Nyquist",
      });
      const {
        isAnonymous: _isAnonymous3,
        isAuthor: _isAuthor3,
        isEditor: _isEditor3,
        ...userFields3
      } = user3;

      if (
        user1.email === null ||
        user2.email === null ||
        user3.email === null
      ) {
        throw new Error("User should have email");
      }

      const sharedUserFields = [userFields2, userFields1];
      const sharedUserFields23 = [userFields2, userFields3];

      const { contentId: sharedFolderId } = await createContent({
        loggedInUserId: ownerId,
        contentType: "folder",
        parentId: null,
      });

      // create content in folder that will become shared
      const { contentId: activity1Id } = await createContent({
        loggedInUserId: ownerId,
        contentType: "folder",
        parentId: sharedFolderId,
      });
      const { contentId: folder1Id } = await createContent({
        loggedInUserId: ownerId,
        contentType: "folder",
        parentId: sharedFolderId,
      });
      const { contentId: folder2Id } = await createContent({
        loggedInUserId: ownerId,
        contentType: "folder",
        parentId: folder1Id,
      });
      const { contentId: activity2Id } = await createContent({
        loggedInUserId: ownerId,
        contentType: "singleDoc",
        parentId: folder2Id,
      });

      let results = await getMyContent({
        ownerId,
        parentId: sharedFolderId,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      let content = results.content;

      expect(content[0].contentId).eqls(activity1Id);
      expect(content[0].isShared).eq(false);
      expect(content[0].sharedWith).eqls([]);
      expect(content[1].contentId).eqls(folder1Id);
      expect(content[1].isShared).eq(false);
      expect(content[1].sharedWith).eqls([]);

      results = await getMyContent({
        ownerId,
        parentId: folder1Id,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;
      expect(content[0].contentId).eqls(folder2Id);
      expect(content[0].isShared).eq(false);
      expect(content[0].sharedWith).eqls([]);

      results = await getMyContent({
        ownerId,
        parentId: folder2Id,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;
      expect(content[0].contentId).eqls(activity2Id);
      expect(content[0].isShared).eq(false);
      expect(content[0].sharedWith).eqls([]);

      await shareContentWithEmail({
        contentId: sharedFolderId,
        loggedInUserId: ownerId,
        email: user2.email,
      });
      await shareContentWithEmail({
        contentId: sharedFolderId,
        loggedInUserId: ownerId,
        email: user1.email,
      });

      results = await getMyContent({
        ownerId,
        parentId: sharedFolderId,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;

      expect(content[0].contentId).eqls(activity1Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls(sharedUserFields);
      expect(content[1].contentId).eqls(folder1Id);
      expect(content[1].isShared).eq(true);
      expect(content[1].sharedWith).eqls(sharedUserFields);

      results = await getMyContent({
        ownerId,
        parentId: folder1Id,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;
      expect(content[0].contentId).eqls(folder2Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls(sharedUserFields);

      results = await getMyContent({
        ownerId,
        parentId: folder2Id,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;
      expect(content[0].contentId).eqls(activity2Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls(sharedUserFields);

      // unshare with user 1
      await modifyContentSharedWith({
        action: "unshare",
        contentId: sharedFolderId,
        loggedInUserId: ownerId,
        users: [user1Id],
      });

      results = await getMyContent({
        ownerId,
        parentId: sharedFolderId,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;

      expect(content[0].contentId).eqls(activity1Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls([userFields2]);
      expect(content[1].contentId).eqls(folder1Id);
      expect(content[1].isShared).eq(true);
      expect(content[1].sharedWith).eqls([userFields2]);

      results = await getMyContent({
        ownerId,
        parentId: folder1Id,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;
      expect(content[0].contentId).eqls(folder2Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls([userFields2]);

      results = await getMyContent({
        ownerId,
        parentId: folder2Id,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;
      expect(content[0].contentId).eqls(activity2Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls([userFields2]);

      // share middle folder with user3
      await modifyContentSharedWith({
        action: "share",
        contentId: folder2Id,
        loggedInUserId: ownerId,
        users: [user3Id],
      });

      results = await getMyContent({
        ownerId,
        parentId: sharedFolderId,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;

      expect(content[0].contentId).eqls(activity1Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls([userFields2]);
      expect(content[1].contentId).eqls(folder1Id);
      expect(content[1].isShared).eq(true);
      expect(content[1].sharedWith).eqls([userFields2]);

      results = await getMyContent({
        ownerId,
        parentId: folder1Id,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;
      expect(content[0].contentId).eqls(folder2Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls(sharedUserFields23);

      results = await getMyContent({
        ownerId,
        parentId: folder2Id,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;
      expect(content[0].contentId).eqls(activity2Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls(sharedUserFields23);

      // unshare with user 2
      await modifyContentSharedWith({
        action: "unshare",
        contentId: sharedFolderId,
        loggedInUserId: ownerId,
        users: [user2Id],
      });

      results = await getMyContent({
        ownerId,
        parentId: sharedFolderId,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;

      expect(content[0].contentId).eqls(activity1Id);
      expect(content[0].isShared).eq(false);
      expect(content[0].sharedWith).eqls([]);
      expect(content[1].contentId).eqls(folder1Id);
      expect(content[1].isShared).eq(false);
      expect(content[0].sharedWith).eqls([]);

      results = await getMyContent({
        ownerId,
        parentId: folder1Id,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;
      expect(content[0].contentId).eqls(folder2Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls([userFields3]);

      results = await getMyContent({
        ownerId,
        parentId: folder2Id,
        loggedInUserId: ownerId,
      });
      if (results.notMe) {
        throw Error("shouldn't happen");
      }
      content = results.content;
      expect(content[0].contentId).eqls(activity2Id);
      expect(content[0].isShared).eq(true);
      expect(content[0].sharedWith).eqls([userFields3]);
    },
  );

  test("moving content into public folder makes it public", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const { contentId: publicFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: publicFolderId,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    // create to move into that folder
    const { contentId: activity1Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: folder1Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    const { contentId: folder2Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: folder1Id,
    });
    const { contentId: activity2Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: folder2Id,
    });

    let results = await getMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    let content = results.content;

    expect(content[1].contentId).eqls(activity1Id);
    expect(content[1].isPublic).eq(false);
    expect(content[1].visibility).eq("private");
    expect(content[1].licenseCode).eq("CCDUAL");
    expect(content[2].contentId).eqls(folder1Id);
    expect(content[2].isPublic).eq(false);
    expect(content[2].visibility).eq("private");
    expect(content[2].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder1Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(folder2Id);
    expect(content[0].isPublic).eq(false);
    expect(content[0].visibility).eq("private");
    expect(content[0].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder2Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(activity2Id);
    expect(content[0].isPublic).eq(false);
    expect(content[0].visibility).eq("private");
    expect(content[0].licenseCode).eq("CCDUAL");

    // move content into public folder
    await moveContent({
      contentId: activity1Id,
      changeParentIdTo: publicFolderId,
      loggedInUserId: ownerId,
      desiredPosition: 0,
    });
    await moveContent({
      contentId: folder1Id,
      changeParentIdTo: publicFolderId,
      loggedInUserId: ownerId,
      desiredPosition: 1,
    });

    results = await getMyContent({
      ownerId,
      parentId: publicFolderId,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;

    expect(content[0].contentId).eqls(activity1Id);
    expect(content[0].isPublic).eq(true);
    expect(content[0].visibility).eq("public");
    expect(content[0].licenseCode).eq("CCDUAL");
    expect(content[1].contentId).eqls(folder1Id);
    expect(content[1].isPublic).eq(true);
    expect(content[1].visibility).eq("public");
    expect(content[1].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder1Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(folder2Id);
    expect(content[0].isPublic).eq(true);
    expect(content[0].visibility).eq("public");
    expect(content[0].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder2Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(activity2Id);
    expect(content[0].isPublic).eq(true);
    expect(content[0].visibility).eq("public");
    expect(content[0].licenseCode).eq("CCDUAL");

    // Create a private folder and move content into that folder.
    // The content stays public.

    const { contentId: privateFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });

    await moveContent({
      contentId: activity1Id,
      changeParentIdTo: privateFolderId,
      loggedInUserId: ownerId,
      desiredPosition: 0,
    });
    await moveContent({
      contentId: folder1Id,
      changeParentIdTo: privateFolderId,
      loggedInUserId: ownerId,
      desiredPosition: 1,
    });

    results = await getMyContent({
      ownerId,
      parentId: privateFolderId,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;

    expect(content[0].contentId).eqls(activity1Id);
    expect(content[0].isPublic).eq(true);
    expect(content[0].visibility).eq("public");
    expect(content[0].licenseCode).eq("CCDUAL");
    expect(content[1].contentId).eqls(folder1Id);
    expect(content[1].isPublic).eq(true);
    expect(content[1].visibility).eq("public");
    expect(content[1].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder1Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(folder2Id);
    expect(content[0].isPublic).eq(true);
    expect(content[0].visibility).eq("public");
    expect(content[0].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder2Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(activity2Id);
    expect(content[0].isPublic).eq(true);
    expect(content[0].visibility).eq("public");
    expect(content[0].licenseCode).eq("CCDUAL");
  });

  test("moving content into shared folder shares it", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;
    const user = await createTestUser();
    const userId = user.userId;
    const {
      isAnonymous: _isAnonymous,
      isAuthor: _isAuthor,
      isEditor: _isEditor,
      ...userFields
    } = user;

    const { contentId: sharedFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    await modifyContentSharedWith({
      action: "share",
      contentId: sharedFolderId,
      loggedInUserId: ownerId,
      users: [userId],
    });

    // create to move into that folder
    const { contentId: activity1Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: folder1Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    const { contentId: folder2Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: folder1Id,
    });
    const { contentId: activity2Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: folder2Id,
    });

    let results = await getMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    let content = results.content;

    expect(content[1].contentId).eqls(activity1Id);
    expect(content[1].isShared).eq(false);
    expect(content[1].sharedWith).eqls([]);
    expect(content[1].licenseCode).eq("CCDUAL");
    expect(content[2].contentId).eqls(folder1Id);
    expect(content[2].isShared).eq(false);
    expect(content[2].sharedWith).eqls([]);
    expect(content[2].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder1Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(folder2Id);
    expect(content[0].isShared).eq(false);
    expect(content[0].sharedWith).eqls([]);
    expect(content[0].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder2Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(activity2Id);
    expect(content[0].isShared).eq(false);
    expect(content[0].sharedWith).eqls([]);
    expect(content[0].licenseCode).eq("CCDUAL");

    // move content into shared folder
    await moveContent({
      contentId: activity1Id,
      changeParentIdTo: sharedFolderId,
      loggedInUserId: ownerId,
      desiredPosition: 0,
    });
    await moveContent({
      contentId: folder1Id,
      changeParentIdTo: sharedFolderId,
      loggedInUserId: ownerId,
      desiredPosition: 1,
    });

    results = await getMyContent({
      ownerId,
      parentId: sharedFolderId,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;

    expect(content[0].contentId).eqls(activity1Id);
    expect(content[0].isShared).eq(true);
    expect(content[0].sharedWith).eqls([userFields]);
    expect(content[0].licenseCode).eq("CCDUAL");
    expect(content[1].contentId).eqls(folder1Id);
    expect(content[1].isShared).eq(true);
    expect(content[1].sharedWith).eqls([userFields]);
    expect(content[1].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder1Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(folder2Id);
    expect(content[0].isShared).eq(true);
    expect(content[0].sharedWith).eqls([userFields]);
    expect(content[0].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder2Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(activity2Id);
    expect(content[0].isShared).eq(true);
    expect(content[0].sharedWith).eqls([userFields]);
    expect(content[0].licenseCode).eq("CCDUAL");

    // Create a private folder and move content into that folder.
    // The content stays shared.

    const { contentId: privateFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });

    await moveContent({
      contentId: activity1Id,
      changeParentIdTo: privateFolderId,
      loggedInUserId: ownerId,
      desiredPosition: 0,
    });
    await moveContent({
      contentId: folder1Id,
      changeParentIdTo: privateFolderId,
      loggedInUserId: ownerId,
      desiredPosition: 1,
    });

    results = await getMyContent({
      ownerId,
      parentId: privateFolderId,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;

    expect(content[0].contentId).eqls(activity1Id);
    expect(content[0].isShared).eq(true);
    expect(content[0].sharedWith).eqls([userFields]);
    expect(content[0].licenseCode).eq("CCDUAL");
    expect(content[1].contentId).eqls(folder1Id);
    expect(content[1].isShared).eq(true);
    expect(content[1].sharedWith).eqls([userFields]);
    expect(content[1].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder1Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(folder2Id);
    expect(content[0].isShared).eq(true);
    expect(content[0].sharedWith).eqls([userFields]);
    expect(content[0].licenseCode).eq("CCDUAL");

    results = await getMyContent({
      ownerId,
      parentId: folder2Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(activity2Id);
    expect(content[0].isShared).eq(true);
    expect(content[0].sharedWith).eqls([userFields]);
    expect(content[0].licenseCode).eq("CCDUAL");
  });

  test("share with email throws error when no match", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const user = await createTestUser();
    if (user.email === null) {
      throw new Error("User should have email");
    }

    const otherEmail = `unique-${Date.now()}@example.com`;

    const { contentId: folderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    const { contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });

    await expect(
      shareContentWithEmail({
        contentId,
        loggedInUserId: ownerId,
        email: otherEmail,
      }),
    ).rejects.toThrow("User with email not found");

    await shareContentWithEmail({
      contentId,
      loggedInUserId: ownerId,
      email: user.email,
    });

    const { sharedWith } = await getEditorShareStatus({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(sharedWith.map((obj) => obj.email)).eqls([user.email]);

    await expect(
      shareContentWithEmail({
        contentId: folderId,
        loggedInUserId: ownerId,
        email: otherEmail,
      }),
    ).rejects.toThrow("User with email not found");

    await shareContentWithEmail({
      contentId: folderId,
      loggedInUserId: ownerId,
      email: user.email,
    });

    const results = await getMyContent({
      parentId: folderId,
      loggedInUserId: ownerId,
      ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    expect(results.parent!.sharedWith.map((obj) => obj.email)).eqls([
      user.email,
    ]);
  });

  test("share with email throws error when share with self", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;
    if (owner.email === null) {
      throw new Error("User should have email");
    }

    const user = await createTestUser();
    if (user.email === null) {
      throw new Error("User should have email");
    }

    const { contentId: folderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    const { contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });

    await expect(
      shareContentWithEmail({
        contentId,
        loggedInUserId: ownerId,
        email: owner.email,
      }),
    ).rejects.toThrow("Cannot share with self");

    await shareContentWithEmail({
      contentId,
      loggedInUserId: ownerId,
      email: user.email,
    });
    const { sharedWith } = await getEditorShareStatus({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(sharedWith.map((obj) => obj.email)).eqls([user.email]);

    await expect(
      shareContentWithEmail({
        contentId: folderId,
        loggedInUserId: ownerId,
        email: owner.email,
      }),
    ).rejects.toThrow("Cannot share with self");

    await shareContentWithEmail({
      contentId: folderId,
      loggedInUserId: ownerId,
      email: user.email,
    });

    const results = await getMyContent({
      parentId: folderId,
      loggedInUserId: ownerId,
      ownerId,
    });

    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    expect(results.parent!.sharedWith.map((obj) => obj.email)).eqls([
      user.email,
    ]);
  });

  test("get licenses", async () => {
    const { license: cc_by_sa } = await getLicense("CCBYSA");
    expect(cc_by_sa.name).eq("Creative Commons Attribution-ShareAlike 4.0");
    expect(cc_by_sa.imageURL).eq("/creative_commons_by_sa.png");
    expect(cc_by_sa.smallImageURL).eq("/by-sa-sm.png");
    expect(cc_by_sa.licenseURL).eq(
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );

    const { license: cc_by_nc_sa } = await getLicense("CCBYNCSA");
    expect(cc_by_nc_sa.name).eq(
      "Creative Commons Attribution-NonCommercial-ShareAlike 4.0",
    );
    expect(cc_by_nc_sa.imageURL).eq("/creative_commons_by_nc_sa.png");
    expect(cc_by_nc_sa.smallImageURL).eq("/by-nc-sa-sm.png");
    expect(cc_by_nc_sa.licenseURL).eq(
      "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    );

    const { license: cc_dual } = await getLicense("CCDUAL");
    expect(cc_dual.name).eq(
      "Dual license Creative Commons Attribution-ShareAlike 4.0 OR Attribution-NonCommercial-ShareAlike 4.0",
    );

    expect(cc_dual.composedOf[0].name).eq(
      "Creative Commons Attribution-ShareAlike 4.0",
    );
    expect(cc_dual.composedOf[0].imageURL).eq("/creative_commons_by_sa.png");
    expect(cc_dual.composedOf[0].smallImageURL).eq("/by-sa-sm.png");
    expect(cc_dual.composedOf[0].licenseURL).eq(
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );
    expect(cc_dual.composedOf[1].name).eq(
      "Creative Commons Attribution-NonCommercial-ShareAlike 4.0",
    );
    expect(cc_dual.composedOf[1].imageURL).eq("/creative_commons_by_nc_sa.png");
    expect(cc_dual.composedOf[1].smallImageURL).eq("/by-nc-sa-sm.png");
    expect(cc_dual.composedOf[1].licenseURL).eq(
      "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    );

    const { allLicenses: all } = await getAllLicenses();
    expect(all.map((x) => x.code)).eqls(["CCDUAL", "CCBYSA", "CCBYNCSA"]);
  });

  test("set license to make public", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;
    const { contentId: contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });

    // make public with CCBYSA license
    await setContentLicense({
      contentId,
      loggedInUserId: ownerId,
      licenseCode: "CCBYSA",
    });
    await setContentIsPublic({
      contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    let { licenseCode } = await getEditorSettings({
      contentId,
      loggedInUserId: ownerId,
    });
    let { isPublic, visibility } = await getEditorShareStatus({
      contentId,
      loggedInUserId: ownerId,
    });
    expect(isPublic).eq(true);
    expect(visibility).eq("public");

    expect(licenseCode).eq("CCBYSA");

    const { allLicenses } = await getAllLicenses();
    let fullLicense = allLicenses.find((v) => v.code === licenseCode)!;
    expect(fullLicense.name).eq("Creative Commons Attribution-ShareAlike 4.0");
    expect(fullLicense.licenseURL).eq(
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );
    expect(fullLicense.imageURL).eq("/creative_commons_by_sa.png");

    // make private
    await setContentIsPublic({
      contentId,
      loggedInUserId: ownerId,
      isPublic: false,
    });
    ({ isPublic, visibility } = await getEditorShareStatus({
      contentId,
      loggedInUserId: ownerId,
    }));
    expect(isPublic).eq(false);
    expect(visibility).eq("private");

    // make public with CCBYNCSA license
    await setContentLicense({
      contentId,
      loggedInUserId: ownerId,
      licenseCode: "CCBYNCSA",
    });
    await setContentIsPublic({
      contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    ({ isPublic, visibility } = await getEditorShareStatus({
      contentId,
      loggedInUserId: ownerId,
    }));
    ({ licenseCode } = await getEditorSettings({
      contentId,
      loggedInUserId: ownerId,
    }));
    expect(isPublic).eq(true);
    expect(visibility).eq("public");

    expect(licenseCode).eq("CCBYNCSA");
    fullLicense = allLicenses.find((v) => v.code === licenseCode)!;

    expect(fullLicense.name).eq(
      "Creative Commons Attribution-NonCommercial-ShareAlike 4.0",
    );
    expect(fullLicense.licenseURL).eq(
      "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    );
    expect(fullLicense.imageURL).eq("/creative_commons_by_nc_sa.png");

    // switch license to dual
    await setContentLicense({
      contentId,
      loggedInUserId: ownerId,
      licenseCode: "CCDUAL",
    });

    ({ isPublic, visibility } = await getEditorShareStatus({
      contentId,
      loggedInUserId: ownerId,
    }));
    ({ licenseCode } = await getEditorSettings({
      contentId,
      loggedInUserId: ownerId,
    }));
    fullLicense = allLicenses.find((v) => v.code === licenseCode)!;

    expect(isPublic).eq(true);
    expect(visibility).eq("public");

    expect(fullLicense.code).eq("CCDUAL");
    expect(fullLicense.name).eq(
      "Dual license Creative Commons Attribution-ShareAlike 4.0 OR Attribution-NonCommercial-ShareAlike 4.0",
    );

    expect(fullLicense.composedOf[0].code).eq("CCBYSA");
    expect(fullLicense.composedOf[0].name).eq(
      "Creative Commons Attribution-ShareAlike 4.0",
    );
    expect(fullLicense.composedOf[0].licenseURL).eq(
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );
    expect(fullLicense.composedOf[0].imageURL).eq(
      "/creative_commons_by_sa.png",
    );

    expect(fullLicense.composedOf[1].code).eq("CCBYNCSA");
    expect(fullLicense.composedOf[1].name).eq(
      "Creative Commons Attribution-NonCommercial-ShareAlike 4.0",
    );
    expect(fullLicense.composedOf[1].licenseURL).eq(
      "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    );
    expect(fullLicense.composedOf[1].imageURL).eq(
      "/creative_commons_by_nc_sa.png",
    );
  });
});

describe("sharedWithMe()", () => {
  // TODO: Do we need this test?
  test.skip("can see all content shared with me by email", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const recipient = await createTestUser();
    const recipientId = recipient.userId;
    if (recipient.email === null) {
      throw new Error("User should have email");
    }

    // create some content and share with recipient by email
    const [folder1, _folder2, doc1, _doc2, ps1, _doc3] = await setupTestContent(
      ownerId,
      {
        folder1: fold({
          folder2: fold({
            doc1: doc(""),
          }),
          doc2: doc(""),
          ps1: pset({
            doc3: doc(""),
          }),
        }),
      },
    );

    // Share folder1, doc1, and ps1
    // Share the top-level one first,
    // so that we check to see if the inside ones are tracking the root share correctly
    await shareContentWithEmail({
      contentId: folder1,
      loggedInUserId: ownerId,
      email: recipient.email,
    });
    await shareContentWithEmail({
      contentId: doc1,
      loggedInUserId: ownerId,
      email: recipient.email,
    });
    await shareContentWithEmail({
      contentId: ps1,
      loggedInUserId: ownerId,
      email: recipient.email,
    });

    // get content shared with recipient
    const shared = await getSharedWithMe({ loggedInUserId: recipientId });

    expect(shared.content.length).toEqual(3);

    function foundWithCorrectFormat(contentId: Uint8Array) {
      const found = shared.content.find((c) =>
        isEqualUUID(c.contentId, contentId),
      );
      expect(found).toBeDefined();
      // shared entries should include owner details but not owner's email
      if (found) {
        expect(found.owner).toHaveProperty("userId");
        expect(found.owner).toHaveProperty("firstNames");
        expect(found.owner).toHaveProperty("lastNames");
        // owner details returned to viewer should not include email
        // (the owner object in shared results uses includeOwnerDetails which omits email)
        expect(found.owner).not.toHaveProperty("email");
      }
    }

    foundWithCorrectFormat(folder1);
    foundWithCorrectFormat(doc1);
    foundWithCorrectFormat(ps1);
  });

  test("is correctly ordered by share date", async () => {
    const { userId: ownerId } = await createTestUser();
    const recipient = await createTestUser();
    const recipientId = recipient.userId;
    if (recipient.email === null) {
      throw new Error("User should have email");
    }

    // create three top-level items using setupTestContent helper
    const [c1, c2, c3] = await setupTestContent(ownerId, {
      doc1: doc(""),
      doc2: doc(""),
      doc3: doc(""),
    });

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // share in order c1, c2, c3 with small delays so sharedOn differs
    await shareContentWithEmail({
      contentId: c1,
      loggedInUserId: ownerId,
      email: recipient.email,
    });
    await sleep(25);
    await shareContentWithEmail({
      contentId: c2,
      loggedInUserId: ownerId,
      email: recipient.email,
    });
    await sleep(25);
    await shareContentWithEmail({
      contentId: c3,
      loggedInUserId: ownerId,
      email: recipient.email,
    });

    const shared = await getSharedWithMe({ loggedInUserId: recipientId });

    // Extract the contentIds in the order returned and find our three items
    const returnedIds = shared.content.map((c) => c.contentId);

    const idx1 = returnedIds.findIndex((id) => isEqualUUID(id, c1));
    const idx2 = returnedIds.findIndex((id) => isEqualUUID(id, c2));
    const idx3 = returnedIds.findIndex((id) => isEqualUUID(id, c3));

    // All should be present
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThanOrEqual(0);
    expect(idx3).toBeGreaterThanOrEqual(0);

    // Newest (c3) should appear before c2, which should appear before c1
    expect(idx3).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx1);

    // Now unshare c2 and then resharing it should make it the newest
    await modifyContentSharedWith({
      action: "unshare",
      contentId: c2,
      loggedInUserId: ownerId,
      users: [recipientId],
    });

    // small pause to ensure timestamp changes
    await sleep(25);

    await shareContentWithEmail({
      contentId: c2,
      loggedInUserId: ownerId,
      email: recipient.email,
    });

    const shared2 = await getSharedWithMe({ loggedInUserId: recipientId });
    const returned2 = shared2.content.map((c) => c.contentId);
    const newIdx2 = returned2.findIndex((id) => isEqualUUID(id, c2));
    // c2 should now be at the top (newest)
    expect(newIdx2).toBe(0);
  });

  test.todo("hides indirectly shared content");
});

describe("shareContent()", () => {
  test.todo("fails when sharing with self");
  test.todo("fails when content does not exist");
  test.todo("fails when logged in user is not owner");
  test.todo("fails on assignments");
  test.todo("fails if parent is already shared with the user");

  test("excludes inner assignments", async () => {
    const { userId: ownerId } = await createTestUser();
    const recipient = await createTestUser();
    if (recipient.email === null) {
      throw new Error("User should have email");
    }

    // create assignment and share with recipient
    const [folderId, docId] = await setupTestContent(ownerId, {
      folder1: fold({
        doc1: doc("hi"),
      }),
    });

    // create assignment from doc1 and place it in the folder
    await createAssignment({
      contentId: docId,
      closedOn: DateTime.now().plus({ days: 7 }),
      destinationParentId: folderId,
      loggedInUserId: ownerId,
    });

    //share folder with recipient
    await shareContentWithEmail({
      contentId: folderId,
      loggedInUserId: ownerId,
      email: recipient.email,
    });

    // getSharedContent of owner's folder as seen by recipient
    const shared = await getSharedContent({
      ownerId,
      loggedInUserId: recipient.userId,
      parentId: folderId,
    });

    expect(shared.content.length).toEqual(1);
    expect(shared.content[0].contentId).toEqual(docId);
  });

  test("propagates to children", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const { contentId: publicFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });

    // create content in folder that will become public
    const { contentId: activity1Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: publicFolderId,
    });
    const { contentId: folder1Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: publicFolderId,
    });
    const { contentId: folder2Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: folder1Id,
    });
    const { contentId: activity2Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: folder2Id,
    });

    let results = await getMyContent({
      ownerId,
      parentId: publicFolderId,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    let content = results.content;

    expect(content[0].contentId).eqls(activity1Id);
    expect(content[0].isPublic).eqls(false);
    expect(content[0].visibility).eq("private");
    expect(content[1].contentId).eqls(folder1Id);
    expect(content[1].isPublic).eq(false);
    expect(content[1].visibility).eq("private");

    results = await getMyContent({
      ownerId,
      parentId: folder1Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(folder2Id);
    expect(content[0].isPublic).eq(false);
    expect(content[0].visibility).eq("private");

    results = await getMyContent({
      ownerId,
      parentId: folder2Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(activity2Id);
    expect(content[0].isPublic).eq(false);
    expect(content[0].visibility).eq("private");

    await setContentIsPublic({
      contentId: publicFolderId,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    results = await getMyContent({
      ownerId,
      parentId: publicFolderId,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;

    expect(content[0].contentId).eqls(activity1Id);
    expect(content[0].isPublic).eq(true);
    expect(content[0].visibility).eq("public");
    expect(content[1].contentId).eqls(folder1Id);
    expect(content[1].isPublic).eq(true);
    expect(content[1].visibility).eq("public");

    results = await getMyContent({
      ownerId,
      parentId: folder1Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(folder2Id);
    expect(content[0].isPublic).eq(true);
    expect(content[0].visibility).eq("public");

    results = await getMyContent({
      ownerId,
      parentId: folder2Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(activity2Id);
    expect(content[0].isPublic).eq(true);
    expect(content[0].visibility).eq("public");

    await setContentIsPublic({
      contentId: publicFolderId,
      loggedInUserId: ownerId,
      isPublic: false,
    });

    results = await getMyContent({
      ownerId,
      parentId: publicFolderId,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;

    expect(content[0].contentId).eqls(activity1Id);
    expect(content[0].isPublic).eq(false);
    expect(content[0].visibility).eq("private");
    expect(content[1].contentId).eqls(folder1Id);
    expect(content[1].isPublic).eq(false);
    expect(content[1].visibility).eq("private");

    results = await getMyContent({
      ownerId,
      parentId: folder1Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(folder2Id);
    expect(content[0].isPublic).eq(false);
    expect(content[0].visibility).eq("private");

    results = await getMyContent({
      ownerId,
      parentId: folder2Id,
      loggedInUserId: ownerId,
    });
    if (results.notMe) {
      throw Error("shouldn't happen");
    }
    content = results.content;
    expect(content[0].contentId).eqls(activity2Id);
    expect(content[0].isPublic).eq(false);
    expect(content[0].visibility).eq("private");
  });

  describe("correctly tracks root (isRootShare)", () => {
    test("share child then parent", async () => {
      const { userId: ownerId } = await createTestUser();
      const { userId: recipientId } = await createTestUser();
      const [folder1, _folder2, doc1] = await setupTestContent(ownerId, {
        folder1: fold({
          folder2: fold({
            doc1: doc(""),
          }),
        }),
      });

      // Share doc1, wait, then share folder1
      await modifyContentSharedWith({
        action: "share",
        contentId: doc1,
        loggedInUserId: ownerId,
        users: [recipientId],
      });

      // getSharedWithMe as seen by recipient
      let results = await getSharedWithMe({
        loggedInUserId: recipientId,
      });

      expect(results.content.length).toEqual(1);
      expect(results.content[0].contentId).toEqual(doc1);

      // wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await modifyContentSharedWith({
        action: "share",
        contentId: folder1,
        loggedInUserId: ownerId,
        users: [recipientId],
      });

      // getSharedWithMe as seen by recipient
      results = await getSharedWithMe({
        loggedInUserId: recipientId,
      });

      expect(results.content.length).toEqual(2);
      expect(results.content[0].contentId).toEqual(folder1);
      expect(results.content[1].contentId).toEqual(doc1);
    });

    test("share parent then child", async () => {
      const { userId: ownerId } = await createTestUser();
      const { userId: recipientId } = await createTestUser();
      const [folder1, _folder2, doc1] = await setupTestContent(ownerId, {
        folder1: fold({
          folder2: fold({
            doc1: doc(""),
          }),
        }),
      });

      // Share folder1, wait, then share doc1
      await modifyContentSharedWith({
        action: "share",
        contentId: folder1,
        loggedInUserId: ownerId,
        users: [recipientId],
      });

      // getSharedWithMe as seen by recipient
      let results = await getSharedWithMe({
        loggedInUserId: recipientId,
      });

      expect(results.content.length).toEqual(1);
      expect(results.content[0].contentId).toEqual(folder1);

      // wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await modifyContentSharedWith({
        action: "share",
        contentId: doc1,
        loggedInUserId: ownerId,
        users: [recipientId],
      });

      // getSharedWithMe as seen by recipient
      results = await getSharedWithMe({
        loggedInUserId: recipientId,
      });

      expect(results.content.length).toEqual(2);
      expect(results.content[0].contentId).toEqual(doc1);
      expect(results.content[1].contentId).toEqual(folder1);
    });
  });
});

describe("setContentIsPublic()", () => {
  test("publicly sharing content sets `publiclySharedAt` of itself and descendants", async () => {
    const { userId } = await createTestUser();
    const [folderId, _folder2Id, childContentId] = await setupTestContent(
      userId,
      {
        folder1: fold({
          folder2: fold({
            doc1: doc(""),
          }),
        }),
      },
    );

    const beforeShare = DateTime.now().minus({ seconds: 1 });
    await setContentIsPublic({
      contentId: folderId,
      loggedInUserId: userId,
      isPublic: true,
    });

    const { publiclySharedAt: folderMetric } =
      await prisma.content.findUniqueOrThrow({
        where: { id: folderId },
        select: { publiclySharedAt: true },
      });

    const { publiclySharedAt: childMetric } =
      await prisma.content.findUniqueOrThrow({
        where: { id: childContentId },
        select: { publiclySharedAt: true },
      });

    expect(folderMetric).not.toBeNull();
    expect(folderMetric!.getTime()).toBeGreaterThan(beforeShare.toMillis());
    expect(childMetric).not.toBeNull();
    expect(childMetric!.getTime()).toBeGreaterThan(beforeShare.toMillis());
    expect(folderMetric!.getTime()).toEqual(childMetric!.getTime());
  });

  test("publicly unsharing content removes `publiclySharedAt` of itself and descendants", async () => {
    const { userId } = await createTestUser();
    const [folderId, _folder2Id, childContentId] = await setupTestContent(
      userId,
      {
        folder1: fold({
          folder2: fold({
            doc1: doc(""),
          }),
        }),
      },
    );

    await setContentIsPublic({
      contentId: folderId,
      loggedInUserId: userId,
      isPublic: true,
    });

    await setContentIsPublic({
      contentId: folderId,
      loggedInUserId: userId,
      isPublic: false,
    });

    const { publiclySharedAt: folderMetric } =
      await prisma.content.findUniqueOrThrow({
        where: { id: folderId },
        select: { publiclySharedAt: true },
      });

    const { publiclySharedAt: childMetric } =
      await prisma.content.findUniqueOrThrow({
        where: { id: childContentId },
        select: { publiclySharedAt: true },
      });

    expect(folderMetric).toBeNull();
    expect(childMetric).toBeNull();
  });
});

test("new content does not have publiclySharedAt date", async () => {
  const { userId } = await createTestUser();
  const [folderId, _folder2Id, childContentId] = await setupTestContent(
    userId,
    {
      folder1: fold({
        folder2: fold({
          doc1: doc(""),
        }),
      }),
    },
  );
  const { publiclySharedAt: folderMetric } =
    await prisma.content.findUniqueOrThrow({
      where: { id: folderId },
      select: { publiclySharedAt: true },
    });

  const { publiclySharedAt: childMetric } =
    await prisma.content.findUniqueOrThrow({
      where: { id: childContentId },
      select: { publiclySharedAt: true },
    });
  expect(folderMetric).toBeNull();
  expect(childMetric).toBeNull();
});
