import { expect, test } from "vitest";
import { createTestUser } from "./utils";
import { ContentType } from "@prisma/client";
import { createContent, deleteContent } from "../query/activity";
import { prisma } from "../model";
import {
  getRecentContent,
  purgeOldRecentContent,
  recordRecentContent,
} from "../query/recent";

test("add and check recent content", async () => {
  const user = await createTestUser();
  const userId = user.userId;

  const contentIds: Uint8Array[] = [];

  // add 5 activities
  for (let i = 0; i < 5; i++) {
    const { contentId: contentId } = await createContent({
      loggedInUserId: userId,
      contentType: "singleDoc",
      parentId: null,
    });
    await recordRecentContent(userId, "edit", contentId);
    contentIds.push(contentId);
  }

  // get recent should get all five
  let recent = await getRecentContent({ loggedInUserId: userId, mode: "edit" });
  expect(recent.map((r) => r.contentId)).eqls([...contentIds].reverse());

  // add a couple more activities
  for (let i = 0; i < 2; i++) {
    const { contentId: contentId } = await createContent({
      loggedInUserId: userId,
      contentType: "singleDoc",
      parentId: null,
    });
    await recordRecentContent(userId, "edit", contentId);
    contentIds.push(contentId);
  }

  // get the most recent 5
  recent = await getRecentContent({ loggedInUserId: userId, mode: "edit" });
  expect(recent.map((r) => r.contentId)).eqls(
    [...contentIds].reverse().slice(0, 5),
  );
});

test("add and check recent content, different types", async () => {
  const user = await createTestUser();
  const userId = user.userId;

  const contents: { contentId: Uint8Array; type: ContentType }[] = [];

  // add five items of each content type
  for (let i = 0; i < 5; i++) {
    const { contentId: contentId } = await createContent({
      loggedInUserId: userId,
      contentType: "singleDoc",
      parentId: null,
    });
    await recordRecentContent(userId, "edit", contentId);
    contents.push({ contentId: contentId, type: "singleDoc" });

    const { contentId: folderId } = await createContent({
      loggedInUserId: userId,
      contentType: "folder",
      parentId: null,
    });
    await recordRecentContent(userId, "edit", folderId);
    contents.push({ contentId: folderId, type: "folder" });

    const { contentId: sequenceId } = await createContent({
      loggedInUserId: userId,
      contentType: "sequence",
      parentId: null,
    });
    await recordRecentContent(userId, "edit", sequenceId);
    contents.push({ contentId: sequenceId, type: "sequence" });

    const { contentId: selectId } = await createContent({
      loggedInUserId: userId,
      contentType: "select",
      parentId: null,
    });
    await recordRecentContent(userId, "edit", selectId);
    contents.push({ contentId: selectId, type: "select" });
  }

  // get recent with no arguments should get the most recent 5
  let recent = await getRecentContent({ loggedInUserId: userId, mode: "edit" });
  expect(recent.map((r) => r.contentId)).eqls(
    contents
      .map((c) => c.contentId)
      .reverse()
      .slice(0, 5),
  );

  // get just the 5 from each type
  for (const type of ["singleDoc", "folder", "sequence", "select"]) {
    recent = await getRecentContent({
      loggedInUserId: userId,
      mode: "edit",
      restrictToTypes: [type as ContentType],
    });
    expect(recent.map((r) => r.contentId)).eqls(
      contents
        .filter((c) => c.type === type)
        .map((c) => c.contentId)
        .reverse(),
    );
  }

  // add a couple more activities of each type
  for (let i = 0; i < 2; i++) {
    const { contentId: contentId } = await createContent({
      loggedInUserId: userId,
      contentType: "singleDoc",
      parentId: null,
    });
    await recordRecentContent(userId, "edit", contentId);
    contents.push({ contentId: contentId, type: "singleDoc" });

    const { contentId: folderId } = await createContent({
      loggedInUserId: userId,
      contentType: "folder",
      parentId: null,
    });
    await recordRecentContent(userId, "edit", folderId);
    contents.push({ contentId: folderId, type: "folder" });

    const { contentId: sequenceId } = await createContent({
      loggedInUserId: userId,
      contentType: "sequence",
      parentId: null,
    });
    await recordRecentContent(userId, "edit", sequenceId);
    contents.push({ contentId: sequenceId, type: "sequence" });

    const { contentId: selectId } = await createContent({
      loggedInUserId: userId,
      contentType: "select",
      parentId: null,
    });
    await recordRecentContent(userId, "edit", selectId);
    contents.push({ contentId: selectId, type: "select" });
  }

  // get recent with no arguments should get the most recent 10
  recent = await getRecentContent({ loggedInUserId: userId, mode: "edit" });
  expect(recent.map((r) => r.contentId)).eqls(
    contents
      .map((c) => c.contentId)
      .reverse()
      .slice(0, 5),
  );

  // get just the most recent 5 from each type
  for (const type of ["singleDoc", "folder", "sequence", "select"]) {
    recent = await getRecentContent({
      loggedInUserId: userId,
      mode: "edit",
      restrictToTypes: [type as ContentType],
    });
    expect(recent.map((r) => r.contentId)).eqls(
      contents
        .filter((c) => c.type === type)
        .map((c) => c.contentId)
        .reverse()
        .slice(0, 5),
    );
  }
});

test("recent content excludes deleted", async () => {
  const user = await createTestUser();
  const userId = user.userId;

  // add a couple activities
  const { contentId: contentId1 } = await createContent({
    loggedInUserId: userId,
    contentType: "singleDoc",
    parentId: null,
  });
  await recordRecentContent(userId, "edit", contentId1);
  const { contentId: contentId2 } = await createContent({
    loggedInUserId: userId,
    contentType: "singleDoc",
    parentId: null,
  });
  await recordRecentContent(userId, "edit", contentId2);

  // get recent should get both
  let recent = await getRecentContent({ loggedInUserId: userId, mode: "edit" });
  expect(recent.map((r) => r.contentId)).eqls([contentId2, contentId1]);

  // delete one
  await deleteContent({ contentId: contentId1, loggedInUserId: userId });

  // list excludes deleted
  recent = await getRecentContent({ loggedInUserId: userId, mode: "edit" });
  expect(recent.map((r) => r.contentId)).eqls([contentId2]);
});

test("purge recent content", { timeout: 30000 }, async () => {
  const { userId: user1Id } = await createTestUser();
  const { userId: user2Id } = await createTestUser();

  // add 150 activities for each user
  for (let i = 0; i < 150; i++) {
    const { contentId: activity1Id } = await createContent({
      loggedInUserId: user1Id,
      contentType: "singleDoc",
      parentId: null,
    });
    await recordRecentContent(user1Id, "edit", activity1Id);
    const { contentId: activity2Id } = await createContent({
      loggedInUserId: user2Id,
      contentType: "singleDoc",
      parentId: null,
    });
    await recordRecentContent(user2Id, "edit", activity2Id);
  }

  expect(
    await prisma.recentContent.count({
      where: { userId: user1Id },
    }),
  ).eq(150);
  expect(
    await prisma.recentContent.count({
      where: { userId: user2Id },
    }),
  ).eq(150);

  await purgeOldRecentContent();
  expect(
    await prisma.recentContent.count({
      where: { userId: user1Id },
    }),
  ).eq(100);
  expect(
    await prisma.recentContent.count({
      where: { userId: user2Id },
    }),
  ).eq(100);
});
