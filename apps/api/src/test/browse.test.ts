import { describe, expect, test } from "vitest";
import {
  createTestClassifications,
  createTestCategory,
  createTestUser,
  setupTestContent,
  doc,
} from "./utils";
import { fromUUID, isEqualUUID } from "../utils/uuid";
import {
  addClassification,
  searchPossibleClassifications,
} from "../query/classification";
import {
  createContent,
  deleteContent,
  updateContent,
  updateCategories,
} from "../query/activity";
import { modifyContentSharedWith, setContentIsPublic } from "../query/share";
import {
  browseClassificationCategoriesWithSharedContent,
  browseClassificationCategorySharedContent,
  browseClassificationSharedContent,
  browseClassificationSubCategoriesWithSharedContent,
  browseClassificationSubCategorySharedContent,
  browseClassificationsWithSharedContent,
  browseClassificationSystemsWithSharedContent,
  browseSharedContent,
  browseTrendingContent,
  browseUsersWithSharedContent,
  countMatchingContentByCategory,
  searchSharedContent,
  searchUsersWithSharedContent,
} from "../query/explore";
import { ContentType } from "@prisma/client";
import { updateUser } from "../query/user";

test("browseUsersWithSharedContent, no filter, filter by unclassified", async () => {
  const { userId } = await createTestUser();

  const classificationId = (
    await searchPossibleClassifications({ query: "FinM.A.3" })
  )[0].id;

  // owner 2 has two activities, one with a classification
  const { userId: owner1Id } = await createTestUser();
  const { contentId: activity1aId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await setContentIsPublic({
    contentId: activity1aId,
    loggedInUserId: owner1Id,
    isPublic: true,
  });
  const { contentId: activity1bId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await setContentIsPublic({
    contentId: activity1bId,
    loggedInUserId: owner1Id,
    isPublic: true,
  });
  await addClassification({
    contentId: activity1aId,
    classificationId: classificationId,
    loggedInUserId: owner1Id,
  });

  // owner 2 has three activities that have a classification
  const { userId: owner2Id } = await createTestUser();
  const { contentId: activity2aId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await setContentIsPublic({
    contentId: activity2aId,
    loggedInUserId: owner2Id,
    isPublic: true,
  });
  const { contentId: activity2bId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await setContentIsPublic({
    contentId: activity2bId,
    loggedInUserId: owner2Id,
    isPublic: true,
  });
  const { contentId: activity2cId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await setContentIsPublic({
    contentId: activity2cId,
    loggedInUserId: owner2Id,
    isPublic: true,
  });

  await addClassification({
    contentId: activity2aId,
    classificationId: classificationId,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: activity2bId,
    classificationId: classificationId,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: activity2cId,
    classificationId: classificationId,
    loggedInUserId: owner2Id,
  });

  // if don't have any filter or filter just by unclassified,
  // then there is no way to include only users from this test,
  // so just make sure one gets at least the number of results from this test

  let results = await browseUsersWithSharedContent({
    loggedInUserId: userId,
  });

  expect(results.length).greaterThanOrEqual(2);

  results = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    isUnclassified: true,
  });

  expect(results.length).greaterThanOrEqual(1);

  // to filter out just owners from this test, add a test category
  const code = Date.now().toString();
  const word = "b";
  const category = await createTestCategory({ word, code });
  const categories = { [category.code]: true };
  const categoriesSet = new Set([category.code]);
  await updateCategories({
    contentId: activity2aId,
    loggedInUserId: owner2Id,
    categories,
  });
  await updateCategories({
    contentId: activity2bId,
    loggedInUserId: owner2Id,
    categories,
  });
  await updateCategories({
    contentId: activity2cId,
    loggedInUserId: owner2Id,
    categories,
  });
  await updateCategories({
    contentId: activity1aId,
    loggedInUserId: owner1Id,
    categories,
  });
  await updateCategories({
    contentId: activity1bId,
    loggedInUserId: owner1Id,
    categories,
  });

  // when filter by category, just the two owners, sorted by number of activities
  results = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categories: categoriesSet,
  });

  expect(results.length).eq(2);
  expect(isEqualUUID(results[0].userId, owner2Id)).eq(true);
  expect(results[0].numCommunity).eq(3);
  expect(isEqualUUID(results[1].userId, owner1Id)).eq(true);
  expect(results[1].numCommunity).eq(2);

  // when filter by category and unclassified, just get owner 1
  results = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categories: categoriesSet,
    isUnclassified: true,
  });

  expect(results.length).eq(1);
  expect(isEqualUUID(results[0].userId, owner1Id)).eq(true);
  expect(results[0].numCommunity).eq(1);
});

test("browseUsersWithSharedContent returns only users with public/shared/non-deleted content", async () => {
  // to filter out just owners from this test, add a test category to all of the content
  const code = Date.now().toString();
  const word = "b";
  const category = await createTestCategory({ word, code });
  const categories = { [category.code]: true };
  const categoriesSet = new Set([category.code]);

  const user1 = await createTestUser();
  const user1Id = user1.userId;
  const user2 = await createTestUser();
  const user2Id = user2.userId;

  // owner 1 has only private and deleted content
  const owner1 = await createTestUser();
  const owner1Id = owner1.userId;

  const { contentId: activity1aId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateCategories({
    contentId: activity1aId,
    loggedInUserId: owner1Id,
    categories,
  });
  const { contentId: activity1bId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateCategories({
    contentId: activity1bId,
    loggedInUserId: owner1Id,
    categories,
  });
  const { contentId: folder1aId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "folder",
    parentId: null,
  });
  const { contentId: activity1cId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: folder1aId,
  });
  await updateCategories({
    contentId: activity1cId,
    loggedInUserId: owner1Id,
    categories,
  });
  const { contentId: activity1dId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await setContentIsPublic({
    contentId: activity1dId,
    loggedInUserId: owner1Id,
    isPublic: true,
  });
  await updateCategories({
    contentId: activity1dId,
    loggedInUserId: owner1Id,
    categories,
  });
  await deleteContent({ contentId: activity1dId, loggedInUserId: owner1Id });

  // owner 2 has two public activities
  const owner2 = await createTestUser();
  const owner2Id = owner2.userId;

  const { contentId: folder2aId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "folder",
    parentId: null,
  });
  const { contentId: activity2aId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: folder2aId,
  });
  await setContentIsPublic({
    contentId: activity2aId,
    loggedInUserId: owner2Id,
    isPublic: true,
  });
  await updateCategories({
    contentId: activity2aId,
    loggedInUserId: owner2Id,
    categories,
  });
  const { contentId: activity2bId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: folder2aId,
  });
  await setContentIsPublic({
    contentId: activity2bId,
    loggedInUserId: owner2Id,
    isPublic: true,
  });
  await updateCategories({
    contentId: activity2bId,
    loggedInUserId: owner2Id,
    categories,
  });

  // owner 3 has a activity shared with user1
  const owner3 = await createTestUser();
  const owner3Id = owner3.userId;

  const { contentId: folder3aId } = await createContent({
    loggedInUserId: owner3Id,
    contentType: "folder",
    parentId: null,
  });
  const { contentId: activity3aId } = await createContent({
    loggedInUserId: owner3Id,
    contentType: "singleDoc",
    parentId: folder3aId,
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: activity3aId,
    loggedInUserId: owner3Id,
    users: [user1Id],
  });
  await updateCategories({
    contentId: activity3aId,
    loggedInUserId: owner3Id,
    categories,
  });

  // owner 4 has three activities shared with user2
  const owner4 = await createTestUser();
  const owner4Id = owner4.userId;

  const { contentId: folder4aId } = await createContent({
    loggedInUserId: owner4Id,
    contentType: "folder",
    parentId: null,
  });
  const { contentId: activity4aId } = await createContent({
    loggedInUserId: owner4Id,
    contentType: "singleDoc",
    parentId: folder4aId,
  });
  await modifyContentSharedWith({
    contentId: activity4aId,
    loggedInUserId: owner4Id,
    action: "share",
    users: [user2Id],
  });
  await updateCategories({
    contentId: activity4aId,
    loggedInUserId: owner4Id,
    categories,
  });

  const { contentId: activity4bId } = await createContent({
    loggedInUserId: owner4Id,
    contentType: "singleDoc",
    parentId: folder4aId,
  });
  await modifyContentSharedWith({
    contentId: activity4bId,
    loggedInUserId: owner4Id,
    action: "share",
    users: [user2Id],
  });
  await updateCategories({
    contentId: activity4bId,
    loggedInUserId: owner4Id,
    categories,
  });
  const { contentId: activity4cId } = await createContent({
    loggedInUserId: owner4Id,
    contentType: "singleDoc",
    parentId: folder4aId,
  });
  await modifyContentSharedWith({
    contentId: activity4cId,
    loggedInUserId: owner4Id,
    action: "share",
    users: [user2Id],
  });
  await updateCategories({
    contentId: activity4cId,
    loggedInUserId: owner4Id,
    categories,
  });

  // user1 find only owner2, owner3
  let result = await browseUsersWithSharedContent({
    loggedInUserId: user1Id,
    categories: categoriesSet,
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(2);
  expect(isEqualUUID(result[1].userId, owner3Id)).eq(true);
  expect(result[1].numCommunity).eq(1);

  // user2 can find owner2, owner4
  result = await browseUsersWithSharedContent({
    loggedInUserId: user2Id,
    categories: categoriesSet,
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner4Id)).eq(true);
  expect(result[0].numCommunity).eq(3);
  expect(isEqualUUID(result[1].userId, owner2Id)).eq(true);
  expect(result[1].numCommunity).eq(2);
});

test("browseUsersWithSharedContent, search, returns only users with public/shared/non-deleted content", async () => {
  async function setupContent(
    ownerId: Uint8Array,
    {
      isPublic = false,
      sharedWith,
      contentType = "singleDoc",
      name,
      source,
      parentId = null,
    }: {
      isPublic?: boolean;
      sharedWith?: Uint8Array;
      contentType?: ContentType;
      name?: string;
      source?: string;
      parentId?: Uint8Array | null;
    },
  ) {
    const { contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType,
      parentId,
    });
    await updateContent({
      contentId,
      name,
      source,
      loggedInUserId: ownerId,
    });
    if (isPublic) {
      await setContentIsPublic({
        contentId,
        loggedInUserId: ownerId,
        isPublic: true,
      });
    }
    if (sharedWith) {
      await modifyContentSharedWith({
        contentId,
        loggedInUserId: ownerId,
        action: "share",
        users: [sharedWith],
      });
    }
    return contentId;
  }

  const code = Date.now().toString();

  const { userId: user1 } = await createTestUser();
  const { userId: user2 } = await createTestUser();

  // owner 1 has only private and deleted content, and public content with different text
  const { userId: owner1 } = await createTestUser();
  const folder1 = await setupContent(owner1, { contentType: "folder" });
  await setupContent(owner1, { name: `banana${code}` });
  await setupContent(owner1, { source: `banana${code}` });
  await setupContent(owner1, {
    parentId: folder1,
    name: `banana${code}`,
  });

  const activity1d = await setupContent(owner1, {
    isPublic: true,
    source: `banana${code}`,
  });
  await deleteContent({ contentId: activity1d, loggedInUserId: owner1 });

  await setupContent(owner1, {
    isPublic: true,
    source: `grape${code}`,
  });

  // owner 2 has two public activities, plus third with different text
  const { userId: owner2 } = await createTestUser();
  const folder2 = await setupContent(owner2, { contentType: "folder" });
  await setupContent(owner2, {
    isPublic: true,
    parentId: folder2,
    name: `banana${code}`,
  });
  await setupContent(owner2, {
    isPublic: true,
    parentId: folder2,
    source: `banana${code}`,
  });
  await setupContent(owner2, {
    isPublic: true,
    source: `grape${code}`,
  });

  // owner 3 has a activity shared with user1, plus public with different text
  const { userId: owner3 } = await createTestUser();
  const folder3 = await setupContent(owner3, { contentType: "folder" });
  await setupContent(owner3, {
    sharedWith: user1,
    parentId: folder3,
    name: `banana${code}`,
  });

  await setupContent(owner3, {
    isPublic: true,
    name: `grape${code}`,
  });

  // owner 4 has three activities shared with user2, plus public content with different text
  const { userId: owner4 } = await createTestUser();
  const folder4 = await setupContent(owner4, { contentType: "folder" });
  await setupContent(owner4, {
    sharedWith: user2,
    name: `banana${code}`,
  });
  await setupContent(owner4, {
    sharedWith: user2,
    parentId: folder4,
    source: `banana${code}`,
  });
  await setupContent(owner4, {
    sharedWith: user2,
    parentId: folder4,
    name: `banana${code}`,
  });

  await setupContent(owner4, {
    isPublic: true,
    name: `grape${code}`,
  });

  // user1 find only owner2, owner3
  let result = await browseUsersWithSharedContent({
    loggedInUserId: user1,
    query: `banana${code}`,
  });
  result = result.filter(
    (r) =>
      isEqualUUID(r.userId, owner1) ||
      isEqualUUID(r.userId, owner2) ||
      isEqualUUID(r.userId, owner3) ||
      isEqualUUID(r.userId, owner4),
  );
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner2)).eq(true);
  expect(result[0].numCommunity).eq(2);
  expect(isEqualUUID(result[1].userId, owner3)).eq(true);
  expect(result[1].numCommunity).eq(1);

  // user2 can find owner2, owner4
  result = await browseUsersWithSharedContent({
    loggedInUserId: user2,
    query: `banana${code}`,
  });
  result = result.filter(
    (r) =>
      isEqualUUID(r.userId, owner1) ||
      isEqualUUID(r.userId, owner2) ||
      isEqualUUID(r.userId, owner3) ||
      isEqualUUID(r.userId, owner4),
  );
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner4)).eq(true);
  expect(result[0].numCommunity).eq(3);
  expect(isEqualUUID(result[1].userId, owner2)).eq(true);
  expect(result[1].numCommunity).eq(2);
});

test("browseUsersWithSharedContent, filter by system, category, sub category, classification", async () => {
  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    systemId,
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    classificationIdA1B,
    classificationIdA2A,
    classificationIdA2B,
    categoryIdB,
    classificationIdB2B,
  } = await createTestClassifications({ word, code });

  const { userId } = await createTestUser();

  // owner 1 has only unclassified content
  const { userId: owner1Id } = await createTestUser();
  const { contentId: activity1aId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity1bId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: activity1aId,
    name: `banana${code}`,
    loggedInUserId: owner1Id,
  });
  await updateContent({
    contentId: activity1bId,
    name: `grape${code}`,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: activity1aId,
    loggedInUserId: owner1Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity1bId,
    loggedInUserId: owner1Id,
    isPublic: true,
  });

  // owner 2 has content in classification A1A
  const { userId: owner2Id } = await createTestUser();
  const { contentId: activity2aId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity2bId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: activity2aId,
    name: `grape${code}`,
    loggedInUserId: owner2Id,
  });
  await updateContent({
    contentId: activity2bId,
    name: `grape${code}`,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: activity2aId,
    loggedInUserId: owner2Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity2bId,
    loggedInUserId: owner2Id,
    isPublic: true,
  });
  await addClassification({
    contentId: activity2aId,
    classificationId: classificationIdA1A,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: activity2bId,
    classificationId: classificationIdA1A,
    loggedInUserId: owner2Id,
  });

  // owner 3 has a content in classification B2B and unclassified content
  const { userId: owner3Id } = await createTestUser();
  const { contentId: activity3aId } = await createContent({
    loggedInUserId: owner3Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity3bId } = await createContent({
    loggedInUserId: owner3Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: activity3aId,
    name: `grape${code}`,
    loggedInUserId: owner3Id,
  });
  await updateContent({
    contentId: activity3bId,
    name: `grape${code}`,
    loggedInUserId: owner3Id,
  });
  await setContentIsPublic({
    contentId: activity3aId,
    loggedInUserId: owner3Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity3bId,
    loggedInUserId: owner3Id,
    isPublic: true,
  });
  await addClassification({
    contentId: activity3aId,
    classificationId: classificationIdB2B,
    loggedInUserId: owner3Id,
  });

  // owner 4 has content in classification A1A and A1B
  const { userId: owner4Id } = await createTestUser();
  const { contentId: activity4aId } = await createContent({
    loggedInUserId: owner4Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity4bId } = await createContent({
    loggedInUserId: owner4Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity4cId } = await createContent({
    loggedInUserId: owner4Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: activity4aId,
    name: `banana${code}`,
    loggedInUserId: owner4Id,
  });
  await updateContent({
    contentId: activity4bId,
    name: `banana${code}`,
    loggedInUserId: owner4Id,
  });
  await updateContent({
    contentId: activity4cId,
    name: `banana${code}`,
    loggedInUserId: owner4Id,
  });
  await setContentIsPublic({
    contentId: activity4aId,
    loggedInUserId: owner4Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity4bId,
    loggedInUserId: owner4Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity4cId,
    loggedInUserId: owner4Id,
    isPublic: true,
  });
  await addClassification({
    contentId: activity4aId,
    classificationId: classificationIdA1A,
    loggedInUserId: owner4Id,
  });
  await addClassification({
    contentId: activity4bId,
    classificationId: classificationIdA1B,
    loggedInUserId: owner4Id,
  });
  await addClassification({
    contentId: activity4cId,
    classificationId: classificationIdA1B,
    loggedInUserId: owner4Id,
  });

  // owner 5 has content in classification A1B, B2B
  const { userId: owner5Id } = await createTestUser();
  const { contentId: activity5aId } = await createContent({
    loggedInUserId: owner5Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity5bId } = await createContent({
    loggedInUserId: owner5Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity5cId } = await createContent({
    loggedInUserId: owner5Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity5dId } = await createContent({
    loggedInUserId: owner5Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: activity5aId,
    name: `grape${code}`,
    loggedInUserId: owner5Id,
  });
  await updateContent({
    contentId: activity5bId,
    name: `grape${code}`,
    loggedInUserId: owner5Id,
  });
  await updateContent({
    contentId: activity5cId,
    name: `banana${code}`,
    loggedInUserId: owner5Id,
  });
  await updateContent({
    contentId: activity5dId,
    name: `grape${code}`,
    loggedInUserId: owner5Id,
  });
  await setContentIsPublic({
    contentId: activity5aId,
    loggedInUserId: owner5Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity5bId,
    loggedInUserId: owner5Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity5cId,
    loggedInUserId: owner5Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity5dId,
    loggedInUserId: owner5Id,
    isPublic: true,
  });
  await addClassification({
    contentId: activity5aId,
    classificationId: classificationIdA1B,
    loggedInUserId: owner5Id,
  });
  await addClassification({
    contentId: activity5bId,
    classificationId: classificationIdB2B,
    loggedInUserId: owner5Id,
  });
  await addClassification({
    contentId: activity5cId,
    classificationId: classificationIdB2B,
    loggedInUserId: owner5Id,
  });
  await addClassification({
    contentId: activity5dId,
    classificationId: classificationIdB2B,
    loggedInUserId: owner5Id,
  });

  // owner 6 has content in classification A2A, A2B, and B2B
  const { userId: owner6Id } = await createTestUser();
  const { contentId: activity6aId } = await createContent({
    loggedInUserId: owner6Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity6bId } = await createContent({
    loggedInUserId: owner6Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity6cId } = await createContent({
    loggedInUserId: owner6Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity6dId } = await createContent({
    loggedInUserId: owner6Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity6eId } = await createContent({
    loggedInUserId: owner6Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity6fId } = await createContent({
    loggedInUserId: owner6Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: activity6aId,
    name: `banana${code}`,
    loggedInUserId: owner6Id,
  });
  await updateContent({
    contentId: activity6bId,
    name: `grape${code}`,
    loggedInUserId: owner6Id,
  });
  await updateContent({
    contentId: activity6cId,
    name: `banana${code}`,
    loggedInUserId: owner6Id,
  });
  await updateContent({
    contentId: activity6dId,
    name: `grape${code}`,
    loggedInUserId: owner6Id,
  });
  await updateContent({
    contentId: activity6eId,
    name: `banana${code}`,
    loggedInUserId: owner6Id,
  });
  await updateContent({
    contentId: activity6fId,
    name: `banana${code}`,
    loggedInUserId: owner6Id,
  });
  await setContentIsPublic({
    contentId: activity6aId,
    loggedInUserId: owner6Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity6bId,
    loggedInUserId: owner6Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity6cId,
    loggedInUserId: owner6Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity6dId,
    loggedInUserId: owner6Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity6eId,
    loggedInUserId: owner6Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity6fId,
    loggedInUserId: owner6Id,
    isPublic: true,
  });
  await addClassification({
    contentId: activity6aId,
    classificationId: classificationIdA2A,
    loggedInUserId: owner6Id,
  });
  await addClassification({
    contentId: activity6bId,
    classificationId: classificationIdA2A,
    loggedInUserId: owner6Id,
  });
  await addClassification({
    contentId: activity6cId,
    classificationId: classificationIdA2B,
    loggedInUserId: owner6Id,
  });
  await addClassification({
    contentId: activity6dId,
    classificationId: classificationIdA2B,
    loggedInUserId: owner6Id,
  });
  await addClassification({
    contentId: activity6eId,
    classificationId: classificationIdB2B,
    loggedInUserId: owner6Id,
  });
  await addClassification({
    contentId: activity6fId,
    classificationId: classificationIdB2B,
    loggedInUserId: owner6Id,
  });

  // owner 7 has a content in another system
  const outsideClassificationId = (
    await searchPossibleClassifications({ query: "K.CC.1" })
  )[0].id;

  const { userId: owner7Id } = await createTestUser();
  const { contentId: activity7aId } = await createContent({
    loggedInUserId: owner7Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: activity7aId,
    name: `banana${code}`,
    loggedInUserId: owner7Id,
  });
  await setContentIsPublic({
    contentId: activity7aId,
    loggedInUserId: owner7Id,
    isPublic: true,
  });
  await addClassification({
    contentId: activity7aId,
    classificationId: outsideClassificationId,
    loggedInUserId: owner7Id,
  });

  // owners 2, 3, 4, 5, 6 have content classified in systemId
  let result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    systemId,
  });
  expect(result.length).eq(5);
  expect(isEqualUUID(result[0].userId, owner6Id)).eq(true);
  expect(result[0].numCommunity).eq(6);
  expect(isEqualUUID(result[1].userId, owner5Id)).eq(true);
  expect(result[1].numCommunity).eq(4);
  expect(isEqualUUID(result[2].userId, owner4Id)).eq(true);
  expect(result[2].numCommunity).eq(3);
  expect(isEqualUUID(result[3].userId, owner2Id)).eq(true);
  expect(result[3].numCommunity).eq(2);
  expect(isEqualUUID(result[4].userId, owner3Id)).eq(true);
  expect(result[4].numCommunity).eq(1);

  // owners 2, 4, 5, 6 have content classified in category A
  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(result.length).eq(4);
  expect(isEqualUUID(result[0].userId, owner6Id)).eq(true);
  expect(result[0].numCommunity).eq(4);
  expect(isEqualUUID(result[1].userId, owner4Id)).eq(true);
  expect(result[1].numCommunity).eq(3);
  expect(isEqualUUID(result[2].userId, owner2Id)).eq(true);
  expect(result[2].numCommunity).eq(2);
  expect(isEqualUUID(result[3].userId, owner5Id)).eq(true);
  expect(result[3].numCommunity).eq(1);

  // owners 3, 5, 6 have content classified in category B
  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdB,
  });
  expect(result.length).eq(3);
  expect(isEqualUUID(result[0].userId, owner5Id)).eq(true);
  expect(result[0].numCommunity).eq(3);
  expect(isEqualUUID(result[1].userId, owner6Id)).eq(true);
  expect(result[1].numCommunity).eq(2);
  expect(isEqualUUID(result[2].userId, owner3Id)).eq(true);
  expect(result[2].numCommunity).eq(1);

  // owners 2, 4, 5 have content classified in subcategory A1
  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(result.length).eq(3);
  expect(isEqualUUID(result[0].userId, owner4Id)).eq(true);
  expect(result[0].numCommunity).eq(3);
  expect(isEqualUUID(result[1].userId, owner2Id)).eq(true);
  expect(result[1].numCommunity).eq(2);
  expect(isEqualUUID(result[2].userId, owner5Id)).eq(true);
  expect(result[2].numCommunity).eq(1);

  // owners 2, 4 have content classified in classification A1A
  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(2);
  expect(isEqualUUID(result[1].userId, owner4Id)).eq(true);
  expect(result[1].numCommunity).eq(1);

  // owners 4, 5 have content classified in classification A1B
  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1B,
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner4Id)).eq(true);
  expect(result[0].numCommunity).eq(2);
  expect(isEqualUUID(result[1].userId, owner5Id)).eq(true);
  expect(result[1].numCommunity).eq(1);

  // now add search

  // owners 4, 5, 6 have content classified in systemId
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId,
  });
  expect(result.length).eq(3);
  expect(isEqualUUID(result[0].userId, owner6Id)).eq(true);
  expect(result[0].numCommunity).eq(4);
  expect(isEqualUUID(result[1].userId, owner4Id)).eq(true);
  expect(result[1].numCommunity).eq(3);
  expect(isEqualUUID(result[2].userId, owner5Id)).eq(true);
  expect(result[2].numCommunity).eq(1);

  // owners 4, 6 have content classified in category A
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner4Id)).eq(true);
  expect(result[0].numCommunity).eq(3);
  expect(isEqualUUID(result[1].userId, owner6Id)).eq(true);
  expect(result[1].numCommunity).eq(2);

  // owners  5, 6 have content classified in category B
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdB,
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner6Id)).eq(true);
  expect(result[0].numCommunity).eq(2);
  expect(isEqualUUID(result[1].userId, owner5Id)).eq(true);
  expect(result[1].numCommunity).eq(1);

  // owners 4 has content classified in subcategory A1
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(result.length).eq(1);
  expect(isEqualUUID(result[0].userId, owner4Id)).eq(true);
  expect(result[0].numCommunity).eq(3);

  // owners 4 has content classified in classification A1A
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
  });
  expect(result.length).eq(1);
  expect(isEqualUUID(result[0].userId, owner4Id)).eq(true);
  expect(result[0].numCommunity).eq(1);

  // owners 4 have content classified in classification A1B
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    classificationId: classificationIdA1B,
  });
  expect(result.length).eq(1);
  expect(isEqualUUID(result[0].userId, owner4Id)).eq(true);
  expect(result[0].numCommunity).eq(2);
});

test("browseUsersWithSharedContent, filter by activity category", async () => {
  // add three test categories
  const code = Date.now().toString();
  const category1Code = (await createTestCategory({ word: "a", code })).code;
  const category2Code = (await createTestCategory({ word: "b", code })).code;
  const category3Code = (await createTestCategory({ word: "c", code })).code;

  const { userId } = await createTestUser();

  // owner 1 has only content without categories and category1
  const { userId: owner1Id } = await createTestUser();
  const { contentId: activity1aId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity1bId } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: activity1aId,
    name: `banana${code}`,
    loggedInUserId: owner1Id,
  });
  await updateContent({
    contentId: activity1bId,
    name: `grape${code}`,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: activity1aId,
    loggedInUserId: owner1Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity1bId,
    loggedInUserId: owner1Id,
    isPublic: true,
  });
  await updateCategories({
    contentId: activity1bId,
    loggedInUserId: owner1Id,
    categories: { [category1Code]: true },
  });

  // owner 2 has content combinations of two categories
  const { userId: owner2Id } = await createTestUser();
  const { contentId: activity2aId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity2bId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity2cId } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: activity2aId,
    name: `banana${code}`,
    loggedInUserId: owner2Id,
  });
  await updateContent({
    contentId: activity2bId,
    name: `grape${code}`,
    loggedInUserId: owner2Id,
  });
  await updateContent({
    contentId: activity2cId,
    name: `banana${code}`,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: activity2aId,
    loggedInUserId: owner2Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity2bId,
    loggedInUserId: owner2Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity2cId,
    loggedInUserId: owner2Id,
    isPublic: true,
  });
  await updateCategories({
    contentId: activity2aId,
    loggedInUserId: owner2Id,
    categories: { [category1Code]: true, [category2Code]: true },
  });
  await updateCategories({
    contentId: activity2bId,
    loggedInUserId: owner2Id,
    categories: { [category1Code]: true, [category3Code]: true },
  });
  await updateCategories({
    contentId: activity2cId,
    loggedInUserId: owner2Id,
    categories: { [category3Code]: true, [category2Code]: true },
  });

  // owner 3 has one content with category 2 and and three with category 3
  const { userId: owner3Id } = await createTestUser();

  const { contentId: activity3aId } = await createContent({
    loggedInUserId: owner3Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity3bId } = await createContent({
    loggedInUserId: owner3Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity3cId } = await createContent({
    loggedInUserId: owner3Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: activity3dId } = await createContent({
    loggedInUserId: owner3Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: activity3aId,
    name: `banana${code}`,
    loggedInUserId: owner3Id,
  });
  await updateContent({
    contentId: activity3bId,
    name: `banana${code}`,
    loggedInUserId: owner3Id,
  });
  await updateContent({
    contentId: activity3cId,
    name: `grape${code}`,
    loggedInUserId: owner3Id,
  });
  await updateContent({
    contentId: activity3dId,
    name: `banana${code}`,
    loggedInUserId: owner3Id,
  });
  await setContentIsPublic({
    contentId: activity3aId,
    loggedInUserId: owner3Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity3bId,
    loggedInUserId: owner3Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity3cId,
    loggedInUserId: owner3Id,
    isPublic: true,
  });
  await setContentIsPublic({
    contentId: activity3dId,
    loggedInUserId: owner3Id,
    isPublic: true,
  });
  await updateCategories({
    contentId: activity3aId,
    loggedInUserId: owner3Id,
    categories: { [category2Code]: true },
  });
  await updateCategories({
    contentId: activity3bId,
    loggedInUserId: owner3Id,
    categories: { [category3Code]: true },
  });
  await updateCategories({
    contentId: activity3cId,
    loggedInUserId: owner3Id,
    categories: { [category3Code]: true },
  });
  await updateCategories({
    contentId: activity3dId,
    loggedInUserId: owner3Id,
    categories: { [category3Code]: true },
  });

  // owners 1 and 2 have category1
  let result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categories: new Set([category1Code]),
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(2);
  expect(isEqualUUID(result[1].userId, owner1Id)).eq(true);
  expect(result[1].numCommunity).eq(1);

  // owners 2 and 3 have category2
  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categories: new Set([category2Code]),
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(2);
  expect(isEqualUUID(result[1].userId, owner3Id)).eq(true);
  expect(result[1].numCommunity).eq(1);

  // owners 2 and 3 have category3
  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categories: new Set([category3Code]),
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner3Id)).eq(true);
  expect(result[0].numCommunity).eq(3);
  expect(isEqualUUID(result[1].userId, owner2Id)).eq(true);
  expect(result[1].numCommunity).eq(2);

  // owners 2 has combinations of two categories
  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categories: new Set([category1Code, category2Code]),
  });
  expect(result.length).eq(1);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(1);

  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categories: new Set([category1Code, category3Code]),
  });
  expect(result.length).eq(1);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(1);

  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categories: new Set([category3Code, category2Code]),
  });
  expect(result.length).eq(1);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(1);

  // no one has all three categories
  result = await browseUsersWithSharedContent({
    loggedInUserId: userId,
    categories: new Set([category3Code, category2Code, category1Code]),
  });
  expect(result.length).eq(0);

  // now combine with search

  // owner 2 has category1
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categories: new Set([category1Code]),
  });
  expect(result.length).eq(1);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(1);

  // owners 2 and 3 have category2
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categories: new Set([category2Code]),
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(2);
  expect(isEqualUUID(result[1].userId, owner3Id)).eq(true);
  expect(result[1].numCommunity).eq(1);

  // owners 2 and 3 have category3
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categories: new Set([category3Code]),
  });
  expect(result.length).eq(2);
  expect(isEqualUUID(result[0].userId, owner3Id)).eq(true);
  expect(result[0].numCommunity).eq(2);
  expect(isEqualUUID(result[1].userId, owner2Id)).eq(true);
  expect(result[1].numCommunity).eq(1);

  // owners 2 has most combinations of two categories
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categories: new Set([category1Code, category2Code]),
  });
  expect(result.length).eq(1);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(1);

  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categories: new Set([category1Code, category3Code]),
  });
  expect(result.length).eq(0);

  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categories: new Set([category3Code, category2Code]),
  });
  expect(result.length).eq(1);
  expect(isEqualUUID(result[0].userId, owner2Id)).eq(true);
  expect(result[0].numCommunity).eq(1);

  // no one has all three categories
  result = await browseUsersWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categories: new Set([category3Code, category2Code, category1Code]),
  });
  expect(result.length).eq(0);
});

test("browseClassificationSharedContent, returns only public/shared/non-deleted content", async () => {
  const { userId: userId1 } = await createTestUser();
  const { userId: userId2 } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const systemId = (
    await searchPossibleClassifications({ query: "FinM.A.3" })
  )[0].descriptions[0].subCategory.category.system.id;

  const { classificationIdA1A } = await createTestClassifications({
    systemId,
    word,
    code,
  });

  // add public, shared, private activities to A1A
  const { contentId: contentIdPublic1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPublic2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdShared } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPrivate } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdDeleted } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  const contentIdPublic1String = fromUUID(contentIdPublic1);
  const contentIdPublic2String = fromUUID(contentIdPublic2);
  const contentIdSharedString = fromUUID(contentIdShared);

  await setContentIsPublic({
    contentId: contentIdPublic1,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdPublic2,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdShared,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await setContentIsPublic({
    contentId: contentIdDeleted,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublic1,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublic2,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdShared,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivate,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeleted,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await deleteContent({ contentId: contentIdDeleted, loggedInUserId: ownerId });

  // user1 gets public and shared content
  let results = await browseClassificationSharedContent({
    loggedInUserId: userId1,
    classificationId: classificationIdA1A,
  });
  expect(results.content.length).eq(3);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [
      contentIdPublic1String,
      contentIdPublic2String,
      contentIdSharedString,
    ].sort(),
  );

  // user2 gets only public content
  results = await browseClassificationSharedContent({
    loggedInUserId: userId2,
    classificationId: classificationIdA1A,
  });
  expect(results.content.length).eq(2);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [contentIdPublic1String, contentIdPublic2String].sort(),
  );
});

test("browseClassificationSharedContent, filter by activity category", async () => {
  const { userId: userId } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const systemId = (
    await searchPossibleClassifications({ query: "FinM.A.3" })
  )[0].descriptions[0].subCategory.category.system.id;

  const { classificationIdA1A } = await createTestClassifications({
    systemId,
    word,
    code,
  });

  // add activities to A1A with different combinations of categories
  const { contentId: contentIdN } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQ } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdI } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdV } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQI } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQV } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdIV } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQIV } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  const contentIdNString = fromUUID(contentIdN);
  const contentIdQString = fromUUID(contentIdQ);
  const contentIdIString = fromUUID(contentIdI);
  const contentIdVString = fromUUID(contentIdV);
  const contentIdQIString = fromUUID(contentIdQI);
  const contentIdQVString = fromUUID(contentIdQV);
  const contentIdIVString = fromUUID(contentIdIV);
  const contentIdQIVString = fromUUID(contentIdQIV);

  await setContentIsPublic({
    contentId: contentIdN,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQ,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdI,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdV,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQI,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQV,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIV,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQIV,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdN,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQ,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdI,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdV,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQI,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQV,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIV,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQIV,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });

  await updateCategories({
    contentId: contentIdQ,
    loggedInUserId: ownerId,
    categories: { isQuestion: true },
  });
  await updateCategories({
    contentId: contentIdI,
    loggedInUserId: ownerId,
    categories: { isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdV,
    loggedInUserId: ownerId,
    categories: { containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdQI,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdQV,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdIV,
    loggedInUserId: ownerId,
    categories: { isInteractive: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdQIV,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true, containsVideo: true },
  });

  // get all with no filter
  let results = await browseClassificationSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
  });
  expect(results.content.length).eq(8);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [
      contentIdNString,
      contentIdQString,
      contentIdIString,
      contentIdVString,
      contentIdQIString,
      contentIdQVString,
      contentIdIVString,
      contentIdQIVString,
    ].sort(),
  );

  // filter for single category
  results = await browseClassificationSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
    categories: new Set(["isQuestion"]),
  });
  expect(results.content.length).eq(4);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [
      contentIdQString,
      contentIdQIString,
      contentIdQVString,
      contentIdQIVString,
    ].sort(),
  );

  results = await browseClassificationSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
    categories: new Set(["isInteractive"]),
  });
  expect(results.content.length).eq(4);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [
      contentIdIString,
      contentIdQIString,
      contentIdIVString,
      contentIdQIVString,
    ].sort(),
  );

  results = await browseClassificationSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
    categories: new Set(["containsVideo"]),
  });
  expect(results.content.length).eq(4);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [
      contentIdVString,
      contentIdQVString,
      contentIdIVString,
      contentIdQIVString,
    ].sort(),
  );

  // filter for pairs of categories
  results = await browseClassificationSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(results.content.length).eq(2);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [contentIdQIString, contentIdQIVString].sort(),
  );

  results = await browseClassificationSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(results.content.length).eq(2);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [contentIdQVString, contentIdQIVString].sort(),
  );

  results = await browseClassificationSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(results.content.length).eq(2);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [contentIdIVString, contentIdQIVString].sort(),
  );
});

test("browseClassificationSharedContent, filter by owner", async () => {
  const { userId: userId } = await createTestUser();
  const { userId: owner1Id } = await createTestUser();
  const { userId: owner2Id } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const systemId = (
    await searchPossibleClassifications({ query: "FinM.A.3" })
  )[0].descriptions[0].subCategory.category.system.id;

  const { classificationIdA1A } = await createTestClassifications({
    systemId,
    word,
    code,
  });

  // add activities to A1A with both owners
  const { contentId: contentId1a } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId1b } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId2 } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });

  const contentId1aString = fromUUID(contentId1a);
  const contentId1bString = fromUUID(contentId1b);
  const contentId2String = fromUUID(contentId2);

  await setContentIsPublic({
    contentId: contentId1a,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId1b,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId2,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId1a,
    classificationId: classificationIdA1A,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId1b,
    classificationId: classificationIdA1A,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId2,
    classificationId: classificationIdA1A,
    loggedInUserId: owner2Id,
  });

  // get all with no filter
  let results = await browseClassificationSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
  });
  expect(results.content.length).eq(3);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [contentId1aString, contentId1bString, contentId2String].sort(),
  );

  // filter by owner 1
  results = await browseClassificationSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
    ownerId: owner1Id,
  });
  expect(results.content.length).eq(2);
  expect(results.content.map((c) => fromUUID(c.contentId)).sort()).eqls(
    [contentId1aString, contentId1bString].sort(),
  );

  // filter by owner 2
  results = await browseClassificationSharedContent({
    loggedInUserId: userId,
    classificationId: classificationIdA1A,
    ownerId: owner2Id,
  });
  expect(results.content.length).eq(1);
  expect(isEqualUUID(results.content[0].contentId, contentId2)).eq(true);
});

test("browseSubCategorySharedContent, returns only public/shared/non-deleted content and classifications", async () => {
  const { userId: userId1 } = await createTestUser();
  const { userId: userId2 } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const systemId = (
    await searchPossibleClassifications({ query: "FinM.A.3" })
  )[0].descriptions[0].subCategory.category.system.id;

  const { subCategoryIdA1, classificationIdA1A, classificationIdA1B } =
    await createTestClassifications({
      systemId,
      word,
      code,
    });

  // add public, shared, private activities to A1A and A1B
  const { contentId: contentIdPublicA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdSharedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPrivateA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdDeletedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPublicB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdSharedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPrivateB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdDeletedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  const contentIdPublicAString = fromUUID(contentIdPublicA);
  const contentIdSharedAString = fromUUID(contentIdSharedA);
  const contentIdPublicBString = fromUUID(contentIdPublicB);
  const contentIdSharedBString = fromUUID(contentIdSharedB);

  await setContentIsPublic({
    contentId: contentIdPublicA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdPublicB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedA,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedB,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await setContentIsPublic({
    contentId: contentIdDeletedA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdDeletedB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await deleteContent({
    contentId: contentIdDeletedA,
    loggedInUserId: ownerId,
  });
  await deleteContent({
    contentId: contentIdDeletedB,
    loggedInUserId: ownerId,
  });

  // user1 gets public and shared content
  let results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId1,
    subCategoryId: subCategoryIdA1,
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(2);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentIdPublicAString, contentIdSharedAString].sort());
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(2);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentIdPublicBString, contentIdSharedBString].sort());

  // user2 gets only public content
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId2,
    subCategoryId: subCategoryIdA1,
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(1);
  expect(
    isEqualUUID(
      results.classifications[0].content[0].contentId,
      contentIdPublicA,
    ),
  ).eq(true);
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(1);
  expect(
    isEqualUUID(
      results.classifications[1].content[0].contentId,
      contentIdPublicB,
    ),
  ).eq(true);

  // if delete activity public A, then user 2 no longer sees classification A1A
  await deleteContent({ contentId: contentIdPublicA, loggedInUserId: ownerId });

  // user1 gets public and shared content
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId1,
    subCategoryId: subCategoryIdA1,
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(1);
  expect(
    isEqualUUID(
      results.classifications[0].content[0].contentId,
      contentIdSharedA,
    ),
  );
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(2);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentIdPublicBString, contentIdSharedBString].sort());

  // user2 gets only public content
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId2,
    subCategoryId: subCategoryIdA1,
  });
  expect(results.classifications.length).eq(1);
  expect(results.classifications[0].classificationId).eq(classificationIdA1B);
  expect(results.classifications[0].content.length).eq(1);
  expect(
    isEqualUUID(
      results.classifications[0].content[0].contentId,
      contentIdPublicB,
    ),
  ).eq(true);
});

test("browseSubCategorySharedContent, filter by activity category", async () => {
  const { userId } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const systemId = (
    await searchPossibleClassifications({ query: "FinM.A.3" })
  )[0].descriptions[0].subCategory.category.system.id;

  const { subCategoryIdA1, classificationIdA1A, classificationIdA1B } =
    await createTestClassifications({
      systemId,
      word,
      code,
    });

  // add activities with different categories to A1A and A1B
  const { contentId: contentIdNA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdIA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdVA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQIA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQVA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdIVA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQIVA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdNB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdIB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdVB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQIB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQVB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdIVB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQIVB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  const contentIdNAString = fromUUID(contentIdNA);
  const contentIdQAString = fromUUID(contentIdQA);
  const contentIdIAString = fromUUID(contentIdIA);
  const contentIdVAString = fromUUID(contentIdVA);
  const contentIdQIAString = fromUUID(contentIdQIA);
  const contentIdQVAString = fromUUID(contentIdQVA);
  const contentIdIVAString = fromUUID(contentIdIVA);
  const contentIdQIVAString = fromUUID(contentIdQIVA);
  const contentIdNBString = fromUUID(contentIdNB);
  const contentIdQBString = fromUUID(contentIdQB);
  const contentIdIBString = fromUUID(contentIdIB);
  const contentIdVBString = fromUUID(contentIdVB);
  const contentIdQIBString = fromUUID(contentIdQIB);
  const contentIdQVBString = fromUUID(contentIdQVB);
  const contentIdIVBString = fromUUID(contentIdIVB);
  const contentIdQIVBString = fromUUID(contentIdQIVB);

  await setContentIsPublic({
    contentId: contentIdNA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdVA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQIA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQVA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIVA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQIVA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdNB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdVB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQIB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQVB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIVB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQIVB,
    isPublic: true,
    loggedInUserId: ownerId,
  });

  await addClassification({
    contentId: contentIdNA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdVA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQIA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQVA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIVA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQIVA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdNB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdVB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQIB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQVB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIVB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQIVB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });

  await updateCategories({
    contentId: contentIdQA,
    loggedInUserId: ownerId,
    categories: { isQuestion: true },
  });
  await updateCategories({
    contentId: contentIdIA,
    loggedInUserId: ownerId,
    categories: { isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdVA,
    loggedInUserId: ownerId,
    categories: { containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdQIA,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdQVA,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdIVA,
    loggedInUserId: ownerId,
    categories: { isInteractive: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdQIVA,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true, containsVideo: true },
  });

  await updateCategories({
    contentId: contentIdQB,
    loggedInUserId: ownerId,
    categories: { isQuestion: true },
  });
  await updateCategories({
    contentId: contentIdIB,
    loggedInUserId: ownerId,
    categories: { isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdVB,
    loggedInUserId: ownerId,
    categories: { containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdQIB,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdQVB,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdIVB,
    loggedInUserId: ownerId,
    categories: { isInteractive: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdQIVB,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true, containsVideo: true },
  });

  // no filter, get everything
  let results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(8);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls(
    [
      contentIdNAString,
      contentIdQAString,
      contentIdIAString,
      contentIdVAString,
      contentIdQIAString,
      contentIdQVAString,
      contentIdIVAString,
      contentIdQIVAString,
    ].sort(),
  );
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(8);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls(
    [
      contentIdNBString,
      contentIdQBString,
      contentIdIBString,
      contentIdVBString,
      contentIdQIBString,
      contentIdQVBString,
      contentIdIVBString,
      contentIdQIVBString,
    ].sort(),
  );

  // filter by isQuestion
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion"]),
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(4);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls(
    [
      contentIdQAString,
      contentIdQIAString,
      contentIdQVAString,
      contentIdQIVAString,
    ].sort(),
  );
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(4);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls(
    [
      contentIdQBString,
      contentIdQIBString,
      contentIdQVBString,
      contentIdQIVBString,
    ].sort(),
  );

  // filter by isInteractive
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isInteractive"]),
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(4);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls(
    [
      contentIdIAString,
      contentIdQIAString,
      contentIdIVAString,
      contentIdQIVAString,
    ].sort(),
  );
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(4);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls(
    [
      contentIdIBString,
      contentIdQIBString,
      contentIdIVBString,
      contentIdQIVBString,
    ].sort(),
  );

  // filter by containsVideo
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["containsVideo"]),
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(4);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls(
    [
      contentIdVAString,
      contentIdQVAString,
      contentIdIVAString,
      contentIdQIVAString,
    ].sort(),
  );
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(4);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls(
    [
      contentIdVBString,
      contentIdQVBString,
      contentIdIVBString,
      contentIdQIVBString,
    ].sort(),
  );

  // filter by isQuestion, isInteractive
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(2);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentIdQIAString, contentIdQIVAString].sort());
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(2);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentIdQIBString, contentIdQIVBString].sort());

  // filter by isQuestion, containsVideo
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(2);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentIdQVAString, contentIdQIVAString].sort());
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(2);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentIdQVBString, contentIdQIVBString].sort());

  // filter by isInteractive, containsVideo
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(2);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentIdIVAString, contentIdQIVAString].sort());
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(2);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentIdIVBString, contentIdQIVBString].sort());

  // filter by isQuestion, isInteractive, containsVideo
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(1);
  expect(
    isEqualUUID(results.classifications[0].content[0].contentId, contentIdQIVA),
  ).eq(true);
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(1);
  expect(
    isEqualUUID(results.classifications[1].content[0].contentId, contentIdQIVB),
  ).eq(true);
});

test("browseSubCategorySharedContent, filter by owner", async () => {
  const { userId } = await createTestUser();
  const { userId: owner1Id } = await createTestUser();
  const { userId: owner2Id } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const { subCategoryIdA1, classificationIdA1A, classificationIdA1B } =
    await createTestClassifications({
      word,
      code,
    });

  // add activities with different owners to A1A and A1B
  const { contentId: contentId1A } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId2A } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId1B } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId2B } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });

  const contentId1AString = fromUUID(contentId1A);
  const contentId2AString = fromUUID(contentId2A);
  const contentId1BString = fromUUID(contentId1B);
  const contentId2BString = fromUUID(contentId2B);

  await setContentIsPublic({
    contentId: contentId1A,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId2A,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: contentId1B,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId2B,
    isPublic: true,
    loggedInUserId: owner2Id,
  });

  await addClassification({
    contentId: contentId1A,
    classificationId: classificationIdA1A,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId2A,
    classificationId: classificationIdA1A,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId1B,
    classificationId: classificationIdA1B,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId2B,
    classificationId: classificationIdA1B,
    loggedInUserId: owner2Id,
  });

  // no filter, get everything
  let results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(2);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentId1AString, contentId2AString].sort());
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(2);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentId1BString, contentId2BString].sort());

  // filter by owner 1
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    ownerId: owner1Id,
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(1);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentId1AString].sort());
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(1);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentId1BString].sort());

  // filter by owner 2
  results = await browseClassificationSubCategorySharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    ownerId: owner2Id,
  });
  expect(results.classifications.length).eq(2);
  expect(results.classifications[0].classificationId).eq(classificationIdA1A);
  expect(results.classifications[0].content.length).eq(1);
  expect(
    results.classifications[0].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentId2AString].sort());
  expect(results.classifications[1].classificationId).eq(classificationIdA1B);
  expect(results.classifications[1].content.length).eq(1);
  expect(
    results.classifications[1].content.map((c) => fromUUID(c.contentId)).sort(),
  ).eqls([contentId2BString].sort());
});

test("browseCategorySharedContent, returns only public/shared/non-deleted content and classifications", async () => {
  const { userId: userId1 } = await createTestUser();
  const { userId: userId2 } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const systemId = (
    await searchPossibleClassifications({ query: "FinM.A.3" })
  )[0].descriptions[0].subCategory.category.system.id;

  const {
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    classificationIdA1B,
    subCategoryIdA2,
    classificationIdA2A,
    classificationIdA2B,
  } = await createTestClassifications({
    systemId,
    word,
    code,
  });

  // add public, shared, private activities to A1A and A1B
  const { contentId: contentIdPublicA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdSharedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPrivateA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdDeletedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPublicB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdSharedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPrivateB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdDeletedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  const contentIdPublicAString = fromUUID(contentIdPublicA);
  const contentIdSharedAString = fromUUID(contentIdSharedA);
  const contentIdPublicBString = fromUUID(contentIdPublicB);
  const contentIdSharedBString = fromUUID(contentIdSharedB);

  await setContentIsPublic({
    contentId: contentIdPublicA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdPublicB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedA,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedB,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await setContentIsPublic({
    contentId: contentIdDeletedA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdDeletedB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });

  // add the private and deleted activities to A2A and A2B
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationIdA2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationIdA2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });

  // add a shared activity to A2B
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });

  // actually delete the deleted activities
  await deleteContent({
    contentId: contentIdDeletedA,
    loggedInUserId: ownerId,
  });
  await deleteContent({
    contentId: contentIdDeletedB,
    loggedInUserId: ownerId,
  });

  // user1 gets public and shared content and their subCategories/classifications
  let results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId1,
    categoryId: categoryIdA,
  });
  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(2);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(2);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentIdPublicAString, contentIdSharedAString].sort());
  expect(results.subCategories[0].classifications[1].classificationId).eq(
    classificationIdA1B,
  );
  expect(results.subCategories[0].classifications[1].content.length).eq(2);
  expect(
    results.subCategories[0].classifications[1].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentIdPublicBString, contentIdSharedBString].sort());

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(1);
  expect(
    isEqualUUID(
      results.subCategories[1].classifications[0].content[0].contentId,
      contentIdSharedB,
    ),
  );

  // user2 gets only public content and their subCategories/classifications
  results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId2,
    categoryId: categoryIdA,
  });
  expect(results.subCategories.length).eq(1);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(2);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(1);
  expect(
    isEqualUUID(
      results.subCategories[0].classifications[0].content[0].contentId,
      contentIdPublicA,
    ),
  ).eq(true);
  expect(results.subCategories[0].classifications[1].classificationId).eq(
    classificationIdA1B,
  );
  expect(results.subCategories[0].classifications[1].content.length).eq(1);
  expect(
    isEqualUUID(
      results.subCategories[0].classifications[1].content[0].contentId,
      contentIdPublicB,
    ),
  ).eq(true);
});

test("browseCategorySharedContent, filter by activity category", async () => {
  const { userId } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    subCategoryIdA2,
    classificationIdA2B,
  } = await createTestClassifications({
    word,
    code,
  });

  // add activities with different categories to A1A and A2B
  const { contentId: contentIdNA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdIA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdVA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQIA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQVA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdIVA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQIVA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdNB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdIB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdVB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQIB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQVB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdIVB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdQIVB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  const contentIdNAString = fromUUID(contentIdNA);
  const contentIdQAString = fromUUID(contentIdQA);
  const contentIdIAString = fromUUID(contentIdIA);
  const contentIdVAString = fromUUID(contentIdVA);
  const contentIdQIAString = fromUUID(contentIdQIA);
  const contentIdQVAString = fromUUID(contentIdQVA);
  const contentIdIVAString = fromUUID(contentIdIVA);
  const contentIdQIVAString = fromUUID(contentIdQIVA);
  const contentIdNBString = fromUUID(contentIdNB);
  const contentIdQBString = fromUUID(contentIdQB);
  const contentIdIBString = fromUUID(contentIdIB);
  const contentIdVBString = fromUUID(contentIdVB);
  const contentIdQIBString = fromUUID(contentIdQIB);
  const contentIdQVBString = fromUUID(contentIdQVB);
  const contentIdIVBString = fromUUID(contentIdIVB);
  const contentIdQIVBString = fromUUID(contentIdQIVB);

  await setContentIsPublic({
    contentId: contentIdNA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdVA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQIA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQVA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIVA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQIVA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdNB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdVB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQIB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQVB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIVB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQIVB,
    isPublic: true,
    loggedInUserId: ownerId,
  });

  await addClassification({
    contentId: contentIdNA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdVA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQIA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQVA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIVA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQIVA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdNB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdVB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQIB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQVB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIVB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQIVB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });

  await updateCategories({
    contentId: contentIdQA,
    loggedInUserId: ownerId,
    categories: { isQuestion: true },
  });
  await updateCategories({
    contentId: contentIdIA,
    loggedInUserId: ownerId,
    categories: { isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdVA,
    loggedInUserId: ownerId,
    categories: { containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdQIA,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdQVA,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdIVA,
    loggedInUserId: ownerId,
    categories: { isInteractive: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdQIVA,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true, containsVideo: true },
  });

  await updateCategories({
    contentId: contentIdQB,
    loggedInUserId: ownerId,
    categories: { isQuestion: true },
  });
  await updateCategories({
    contentId: contentIdIB,
    loggedInUserId: ownerId,
    categories: { isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdVB,
    loggedInUserId: ownerId,
    categories: { containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdQIB,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdQVB,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdIVB,
    loggedInUserId: ownerId,
    categories: { isInteractive: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdQIVB,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true, containsVideo: true },
  });

  // no filter, get everything
  let results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(8);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls(
    [
      contentIdNAString,
      contentIdQAString,
      contentIdIAString,
      contentIdVAString,
      contentIdQIAString,
      contentIdQVAString,
      contentIdIVAString,
      contentIdQIVAString,
    ].sort(),
  );

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(8);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls(
    [
      contentIdNBString,
      contentIdQBString,
      contentIdIBString,
      contentIdVBString,
      contentIdQIBString,
      contentIdQVBString,
      contentIdIVBString,
      contentIdQIVBString,
    ].sort(),
  );

  // filter by isQuestion
  results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion"]),
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );

  expect(results.subCategories[0].classifications[0].content.length).eq(4);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls(
    [
      contentIdQAString,
      contentIdQIAString,
      contentIdQVAString,
      contentIdQIVAString,
    ].sort(),
  );

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(4);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls(
    [
      contentIdQBString,
      contentIdQIBString,
      contentIdQVBString,
      contentIdQIVBString,
    ].sort(),
  );

  // filter by isInteractive
  results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isInteractive"]),
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(4);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls(
    [
      contentIdIAString,
      contentIdQIAString,
      contentIdIVAString,
      contentIdQIVAString,
    ].sort(),
  );

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(4);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls(
    [
      contentIdIBString,
      contentIdQIBString,
      contentIdIVBString,
      contentIdQIVBString,
    ].sort(),
  );

  // filter by containsVideo
  results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["containsVideo"]),
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(4);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls(
    [
      contentIdVAString,
      contentIdQVAString,
      contentIdIVAString,
      contentIdQIVAString,
    ].sort(),
  );

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(4);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls(
    [
      contentIdVBString,
      contentIdQVBString,
      contentIdIVBString,
      contentIdQIVBString,
    ].sort(),
  );

  // filter by isQuestion, isInteractive
  results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion", "isInteractive"]),
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(2);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentIdQIAString, contentIdQIVAString].sort());

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(2);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentIdQIBString, contentIdQIVBString].sort());

  // filter by isQuestion, containsVideo
  results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion", "containsVideo"]),
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(2);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentIdQVAString, contentIdQIVAString].sort());

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(2);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentIdQVBString, contentIdQIVBString].sort());

  // filter by isInteractive, containsVideo
  results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isInteractive", "containsVideo"]),
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(2);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentIdIVAString, contentIdQIVAString].sort());

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(2);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentIdIVBString, contentIdQIVBString].sort());

  // filter by isQuestion, isInteractive, containsVideo
  results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(1);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentIdQIVAString].sort());

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(1);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentIdQIVBString].sort());
});

test("browseCategorySharedContent, filter by owner", async () => {
  const { userId } = await createTestUser();
  const { userId: owner1Id } = await createTestUser();
  const { userId: owner2Id } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    subCategoryIdA2,
    classificationIdA2B,
  } = await createTestClassifications({
    word,
    code,
  });

  // add activities with different owners to A1A and A2B
  const { contentId: contentId1A } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId2A } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId1B } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId2B } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });

  const contentId1AString = fromUUID(contentId1A);
  const contentId2AString = fromUUID(contentId2A);
  const contentId1BString = fromUUID(contentId1B);
  const contentId2BString = fromUUID(contentId2B);

  await setContentIsPublic({
    contentId: contentId1A,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId2A,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: contentId1B,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId2B,
    isPublic: true,
    loggedInUserId: owner2Id,
  });

  await addClassification({
    contentId: contentId1A,
    classificationId: classificationIdA1A,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId2A,
    classificationId: classificationIdA1A,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId1B,
    classificationId: classificationIdA2B,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId2B,
    classificationId: classificationIdA2B,
    loggedInUserId: owner2Id,
  });

  // no filter, get everything
  let results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(2);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentId1AString, contentId2AString].sort());

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(2);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentId1BString, contentId2BString].sort());

  // filter by owner 1
  results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    ownerId: owner1Id,
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(1);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentId1AString].sort());

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(1);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentId1BString].sort());

  // filter by owner 2
  results = await browseClassificationCategorySharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    ownerId: owner2Id,
  });

  expect(results.subCategories.length).eq(2);
  expect(results.subCategories[0].subCategoryId).eq(subCategoryIdA1);
  expect(results.subCategories[0].classifications.length).eq(1);
  expect(results.subCategories[0].classifications[0].classificationId).eq(
    classificationIdA1A,
  );
  expect(results.subCategories[0].classifications[0].content.length).eq(1);
  expect(
    results.subCategories[0].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentId2AString].sort());

  expect(results.subCategories[1].subCategoryId).eq(subCategoryIdA2);
  expect(results.subCategories[1].classifications.length).eq(1);
  expect(results.subCategories[1].classifications[0].classificationId).eq(
    classificationIdA2B,
  );
  expect(results.subCategories[1].classifications[0].content.length).eq(1);
  expect(
    results.subCategories[1].classifications[0].content
      .map((c) => fromUUID(c.contentId))
      .sort(),
  ).eqls([contentId2BString].sort());
});

test("browse classification and subcategories with shared content, returns only classifications with public/shared/non-deleted content and classifications", async () => {
  const { userId: userId1 } = await createTestUser();
  const { userId: userId2 } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    classificationIdA1B,
    subCategoryIdA2,
    classificationIdA2A,
    classificationIdA2B,
  } = await createTestClassifications({
    word,
    code,
  });

  // add shared, private activities to A1A (one shared in both A1A and A1B)
  // add public, shared, private activities to A1B
  const { contentId: contentIdSharedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPrivateA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdDeletedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPublicB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdSharedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPrivateB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdDeletedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  await setContentIsPublic({
    contentId: contentIdPublicB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedA,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedB,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await setContentIsPublic({
    contentId: contentIdDeletedA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdDeletedB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });

  // add the private and deleted activities to A2A and A2B
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationIdA2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationIdA2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });

  // add a shared activity to A2B
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });

  // actually delete the deleted activities
  await deleteContent({
    contentId: contentIdDeletedA,
    loggedInUserId: ownerId,
  });
  await deleteContent({
    contentId: contentIdDeletedB,
    loggedInUserId: ownerId,
  });

  // user 1 gets the classifications with shared and public activities
  // Note: one activity is counted in both A1A and A1B
  // (there are only three activities total)
  let resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId1,
    subCategoryId: subCategoryIdA1,
  });

  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[1].numCommunity).eq(3);

  // user 2 gets the classification with public activities
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId2,
    subCategoryId: subCategoryIdA1,
  });

  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[0].numCommunity).eq(1);

  // user 1 gets the classification with shared activities
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId1,
    subCategoryId: subCategoryIdA2,
  });

  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2B);
  expect(resultsClass[0].numCommunity).eq(1);

  // user 2 doesn't get anything in A2
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId2,
    subCategoryId: subCategoryIdA2,
  });

  expect(resultsClass.length).eq(0);

  // user 1 gets the subcategories with shared and public activities
  // Note: even though an activity counted in both A1A and A1B
  // (leading to a count of 1 in A1A and a count of 3 in A1B)
  // the total in A1 is still 3 (that activity is not counted twice)
  let resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId1,
    categoryId: categoryIdA,
  });

  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(3);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(1);

  // user 2 gets the subcategory with public activities
  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId2,
    categoryId: categoryIdA,
  });

  expect(resultsSubcat.length).eq(1);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
});

test("browse classification and subcategories with shared content, search, returns only classifications with public/shared/non-deleted content and classifications", async () => {
  const { userId: userId1 } = await createTestUser();
  const { userId: userId2 } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    classificationIdA1B,
    subCategoryIdA2,
    classificationIdA2A,
    classificationIdA2B,
  } = await createTestClassifications({
    word,
    code,
  });

  // add shared, private activities to A1A (one shared in both A1A and A1B)
  // add public, shared, private activities to A1B
  const { contentId: contentIdSharedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdSharedA,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdPrivateA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdPrivateA,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdDeletedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdDeletedA,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdPublicB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdPublicB,
    name: `banana${code}`,
    loggedInUserId: ownerId,
  });

  const { contentId: contentIdSharedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdSharedB,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdPrivateB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdPrivateB,
    name: `banana${code}`,
    loggedInUserId: ownerId,
  });

  const { contentId: contentIdDeletedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdDeletedB,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });

  const { contentId: contentIdPublicC } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdPublicC,
    name: `grape${code}`,
    loggedInUserId: ownerId,
  });

  const { contentId: contentIdPublicD } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdPublicD,
    source: `grape${code}`,
    loggedInUserId: ownerId,
  });

  await setContentIsPublic({
    contentId: contentIdPublicB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedA,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedB,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await setContentIsPublic({
    contentId: contentIdDeletedA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdDeletedB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdPublicC,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdPublicD,
    isPublic: true,
    loggedInUserId: ownerId,
  });

  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicC,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicD,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });

  // add the private and deleted activities, and public activities with different text, to A2A and A2B
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationIdA2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationIdA2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicC,
    classificationId: classificationIdA2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicD,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });

  // add a shared activity to A2B
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });

  // actually delete the deleted activities
  await deleteContent({
    contentId: contentIdDeletedA,
    loggedInUserId: ownerId,
  });
  await deleteContent({
    contentId: contentIdDeletedB,
    loggedInUserId: ownerId,
  });

  // user 1 gets the classifications with shared and public activities
  // Note: one activity is counted in both A1A and A1B
  // (there are only three activities total)
  let resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId1,
    subCategoryId: subCategoryIdA1,
  });

  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[1].numCommunity).eq(3);

  // user 2 gets the classification with public activities
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId2,
    subCategoryId: subCategoryIdA1,
  });

  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[0].numCommunity).eq(1);

  // user 1 gets the classification with shared activities
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId1,
    subCategoryId: subCategoryIdA2,
  });

  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2B);
  expect(resultsClass[0].numCommunity).eq(1);

  // user 2 doesn't get anything in A2
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId2,
    subCategoryId: subCategoryIdA2,
  });

  expect(resultsClass.length).eq(0);

  // user 1 gets the subcategories with shared and public activities
  // Note: even though an activity counted in both A1A and A1B
  // (leading to a count of 1 in A1A and a count of 3 in A1B)
  // the total in A1 is still 3 (that activity is not counted twice)
  let resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId1,
    categoryId: categoryIdA,
  });

  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(3);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(1);

  // user 2 gets the classification with public activities
  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId2,
    categoryId: categoryIdA,
  });

  expect(resultsSubcat.length).eq(1);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
});

test("browse classification and subcategories with shared content, filter by activity category", async () => {
  const { userId } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    classificationIdA1B,
    subCategoryIdA2,
    classificationIdA2A,
    classificationIdA2B,
  } = await createTestClassifications({
    word,
    code,
  });

  // add isQuestion activity to A1A
  // add isInteractive activity to A1B
  // add video with different text to A1B
  const { contentId: contentIdQ } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdQ,
    name: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdI } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdI,
    name: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdV } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdV,
    name: `grape${code}`,
    loggedInUserId: ownerId,
  });

  await setContentIsPublic({
    contentId: contentIdQ,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdI,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdV,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQ,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdI,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdV,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });

  await updateCategories({
    contentId: contentIdQ,
    loggedInUserId: ownerId,
    categories: { isQuestion: true },
  });
  await updateCategories({
    contentId: contentIdI,
    loggedInUserId: ownerId,
    categories: { isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdV,
    loggedInUserId: ownerId,
    categories: { containsVideo: true },
  });

  // add activities with multiple categories to A2A, A2B
  const { contentId: contentIdQI } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdQI,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdQV } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdQV,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdIV } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdIV,
    source: `grape${code}`,
    loggedInUserId: ownerId,
  });

  await setContentIsPublic({
    contentId: contentIdQI,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQV,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIV,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQI,
    classificationId: classificationIdA2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQV,
    classificationId: classificationIdA2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIV,
    classificationId: classificationIdA2B,
    loggedInUserId: ownerId,
  });

  await updateCategories({
    contentId: contentIdQI,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdQV,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdIV,
    loggedInUserId: ownerId,
    categories: { isInteractive: true, containsVideo: true },
  });

  // get all activities with no filter
  let resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[1].numCommunity).eq(2);
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(2);
  expect(resultsClass[1].classification!.id).eq(classificationIdA2B);
  expect(resultsClass[1].numCommunity).eq(1);

  let resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(3);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(3);

  // filter by isQuestion
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isQuestion"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(2);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion"]),
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(2);

  // filter by isInteractive
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isInteractive"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[0].numCommunity).eq(1);
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isInteractive"]),
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA2B);
  expect(resultsClass[1].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isInteractive"]),
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(2);

  // filter by containsVideo
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["containsVideo"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[0].numCommunity).eq(1);
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["containsVideo"]),
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA2B);
  expect(resultsClass[1].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["containsVideo"]),
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(2);

  // filter by isQuestion, isInteractive
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(resultsClass.length).eq(0);
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(resultsSubcat.length).eq(1);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[0].numCommunity).eq(1);

  // filter by isQuestion, containsVideo
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(resultsClass.length).eq(0);
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(resultsSubcat.length).eq(1);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[0].numCommunity).eq(1);

  // filter by isInteractive, containsVideo
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(resultsClass.length).eq(0);
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2B);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(resultsSubcat.length).eq(1);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[0].numCommunity).eq(1);

  // filter by isQuestion, isInteractive, containsVideo
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
  });
  expect(resultsClass.length).eq(0);
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
  });
  expect(resultsClass.length).eq(0);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
  });
  expect(resultsSubcat.length).eq(0);

  // now combine with search

  // no filter besides search banana
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[1].numCommunity).eq(1);
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(2);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(2);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(2);

  // filter by isQuestion, search banana
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isQuestion"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(2);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion"]),
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(2);

  // filter by isInteractive, search banana
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isInteractive"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[0].numCommunity).eq(1);
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isInteractive"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isInteractive"]),
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(1);

  // filter by containsVideo, search banana
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["containsVideo"]),
  });
  expect(resultsClass.length).eq(0);
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["containsVideo"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["containsVideo"]),
  });
  expect(resultsSubcat.length).eq(1);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[0].numCommunity).eq(1);

  // filter by isQuestion, isInteractive, search banana
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(resultsClass.length).eq(0);
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(resultsSubcat.length).eq(1);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[0].numCommunity).eq(1);

  // filter by isQuestion, containsVideo, search banana
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(resultsClass.length).eq(0);
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA2A);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(resultsSubcat.length).eq(1);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[0].numCommunity).eq(1);

  // filter by isInteractive, containsVideo, search banana
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(resultsClass.length).eq(0);
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA2,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(resultsClass.length).eq(0);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(resultsSubcat.length).eq(0);
});

test("browse classification and subcategories with shared content, filter by owner", async () => {
  const { userId } = await createTestUser();
  const { userId: owner1Id } = await createTestUser();
  const { userId: owner2Id } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    classificationIdA1B,
    subCategoryIdA2,
    classificationIdA2A,
    classificationIdA2B,
  } = await createTestClassifications({
    word,
    code,
  });

  // add owner1 activity to A1A
  // add owner1 activity with different text to A1B
  // add owner2 activity to A1B
  // add owner2 activity with different text to A2A
  // add owner1 activity to A2B

  const { contentId: contentId1A1A } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A1A,
    name: `banana${code}`,
    loggedInUserId: owner1Id,
  });
  const { contentId: contentId1A1B } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A1B,
    name: `grape${code}`,
    loggedInUserId: owner1Id,
  });
  const { contentId: contentId2A1B } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId2A1B,
    name: `banana${code}`,
    loggedInUserId: owner2Id,
  });

  const { contentId: contentId2A2A } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId2A2A,
    name: `grape${code}`,
    loggedInUserId: owner2Id,
  });
  const { contentId: contentId1A2B } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A2B,
    name: `banana${code}`,
    loggedInUserId: owner1Id,
  });

  await setContentIsPublic({
    contentId: contentId1A1A,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId1A1B,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId2A1B,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: contentId2A2A,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: contentId1A2B,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId1A1A,
    classificationId: classificationIdA1A,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId1A1B,
    classificationId: classificationIdA1B,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId2A1B,
    classificationId: classificationIdA1B,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId2A2A,
    classificationId: classificationIdA2A,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId1A2B,
    classificationId: classificationIdA2B,
    loggedInUserId: owner1Id,
  });

  // get all activities with no filter
  let resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[1].numCommunity).eq(2);

  let resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(3);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(2);

  // filter by owner 1
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    ownerId: owner1Id,
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[1].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    ownerId: owner1Id,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(2);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(1);

  // filter by owner 2
  resultsClass = await browseClassificationsWithSharedContent({
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    ownerId: owner2Id,
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    loggedInUserId: userId,
    categoryId: categoryIdA,
    ownerId: owner2Id,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(1);

  // now combine with search

  // no filter besides search banana
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[1].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(2);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(1);

  // filter by owner 1, search banana
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    ownerId: owner1Id,
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
    ownerId: owner1Id,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(1);

  // filter by owner 2, search banana
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
    ownerId: owner2Id,
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
    ownerId: owner2Id,
  });
  expect(resultsSubcat.length).eq(1);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
});

test("browse classification and subcategories with shared content, search includes owner name if not filtering by owner", async () => {
  const code = Date.now().toString();

  const { userId } = await createTestUser();
  const { userId: owner1Id } = await createTestUser();
  await updateUser({
    loggedInUserId: owner1Id,
    firstNames: `Fred${code}`,
    lastNames: `Flintstone${code}`,
  });
  const { userId: owner2Id } = await createTestUser();
  await updateUser({
    loggedInUserId: owner2Id,
    firstNames: `Wilma${code}`,
    lastNames: `Flintstone${code}`,
  });

  // create a made up classification tree
  const word = "b";

  const {
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    classificationIdA1B,
    subCategoryIdA2,
    classificationIdA2A,
    classificationIdA2B,
  } = await createTestClassifications({
    word,
    code,
  });

  // add owner1 activity to A1A
  // add owner1 activity with different text to A1B
  // add owner2 activity to A1B
  // add owner2 activity with different text to A2A
  // add owner1 activity to A2B

  const { contentId: contentId1A1A } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A1A,
    name: `banana${code}`,
    loggedInUserId: owner1Id,
  });
  const { contentId: contentId1A1B } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A1B,
    name: `grape${code}`,
    loggedInUserId: owner1Id,
  });
  const { contentId: contentId2A1B } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId2A1B,
    name: `banana${code}`,
    loggedInUserId: owner2Id,
  });

  const { contentId: contentId2A2A } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId2A2A,
    name: `grape${code}`,
    loggedInUserId: owner2Id,
  });
  const { contentId: contentId1A2B } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A2B,
    name: `banana${code}`,
    loggedInUserId: owner1Id,
  });

  await setContentIsPublic({
    contentId: contentId1A1A,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId1A1B,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId2A1B,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: contentId2A2A,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: contentId1A2B,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId1A1A,
    classificationId: classificationIdA1A,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId1A1B,
    classificationId: classificationIdA1B,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId2A1B,
    classificationId: classificationIdA1B,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId2A2A,
    classificationId: classificationIdA2A,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId1A2B,
    classificationId: classificationIdA2B,
    loggedInUserId: owner1Id,
  });

  // search for owner 1 name
  let resultsClass = await browseClassificationsWithSharedContent({
    query: `Fred${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[1].numCommunity).eq(1);

  let resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `Fred${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(2);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(1);

  // search owner 2 name
  resultsClass = await browseClassificationsWithSharedContent({
    query: `Wilma${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(resultsClass.length).eq(1);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[0].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `Wilma${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(1);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(1);

  // search for banana and owner 1 name
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code} Fred${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[1].numCommunity).eq(2);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code} Fred${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(3);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(1);

  // search for banana and owner 2 name
  resultsClass = await browseClassificationsWithSharedContent({
    query: `banana${code} Wilma${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(resultsClass.length).eq(2);
  expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
  expect(resultsClass[0].numCommunity).eq(1);
  expect(resultsClass[1].classification!.id).eq(classificationIdA1B);
  expect(resultsClass[1].numCommunity).eq(1);

  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `banana${code} Wilma${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(resultsSubcat.length).eq(2);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(2);
  expect(resultsSubcat[1].subCategory!.id).eq(subCategoryIdA2);
  expect(resultsSubcat[1].numCommunity).eq(2);
});

test("browse classification and subcategories with shared content, search hits classifications", async () => {
  const { userId } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "orange";

  const {
    categoryIdA,
    subCategoryIdA1,
    classificationIdA1A,
    classificationIdA1B,
  } = await createTestClassifications({
    word,
    code,
  });

  const { contentId: contentId1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId3 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  await setContentIsPublic({
    contentId: contentId1,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentId2,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentId3,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentId1,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentId2,
    classificationId: classificationIdA1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentId3,
    classificationId: classificationIdA1B,
    loggedInUserId: ownerId,
  });

  // when browsing for classifications, do not get hits on classification itself
  const resultsClass = await browseClassificationsWithSharedContent({
    query: `${word}A1A${code}`,
    loggedInUserId: userId,
    subCategoryId: subCategoryIdA1,
  });
  expect(resultsClass.length).eq(0);

  // when browsing for subcategories, get hits on classifications
  let resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `${word}A1A${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(resultsSubcat.length).eq(1);
  expect(resultsSubcat[0].subCategory!.id).eq(subCategoryIdA1);
  expect(resultsSubcat[0].numCommunity).eq(2);

  // when browsing for subcategories, don't get hits on subcategory itself
  resultsSubcat = await browseClassificationSubCategoriesWithSharedContent({
    query: `${word}A1${code}`,
    loggedInUserId: userId,
    categoryId: categoryIdA,
  });
  expect(resultsSubcat.length).eq(0);
});

test("browse categories and systems with shared content, returns only classifications with public/shared/non-deleted content and classifications", async () => {
  const { userId: userId1 } = await createTestUser();
  const { userId: userId2 } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    systemId: systemId1,
    categoryIdA: categoryId1A,
    classificationIdA1A: classificationId1A1A,
    classificationIdA1B: classificationId1A1B,
    classificationIdA2A: classificationId1A2A,
    classificationIdA2B: classificationId1A2B,
    categoryIdB: categoryId1B,
    classificationIdB1A: classificationId1B1A,
    classificationIdB1B: classificationId1B1B,
    classificationIdB2A: classificationId1B2A,
    classificationIdB2B: classificationId1B2B,
  } = await createTestClassifications({
    word,
    code,
  });

  const {
    systemId: systemId2,
    classificationIdA1A: classificationId2A1A,
    categoryIdB: categoryId2B,
    classificationIdB2B: classificationId2B2B,
  } = await createTestClassifications({
    word: "b2",
    code,
  });

  // add shared, private activities to 1A1A, 1A1B, 1A2A, and/or 1A2B
  // add public, shared, private activities to 1B1A, 1B1B, 1B2A, and/or 1B2B
  const { contentId: contentIdSharedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPrivateA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdDeletedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPublicB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdSharedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdPrivateB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentIdDeletedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  await setContentIsPublic({
    contentId: contentIdPublicB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedA,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedB,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await setContentIsPublic({
    contentId: contentIdDeletedA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdDeletedB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationId1A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationId1A1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationId1A2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationId1A2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationId1A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationId1A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicB,
    classificationId: classificationId1B1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicB,
    classificationId: classificationId1B2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicB,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationId1B1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationId1B2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });

  // add the private and deleted activities to 2A1A and 2B2B
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationId2A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationId2A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationId2B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationId2B2B,
    loggedInUserId: ownerId,
  });

  // add a shared activity to 2B2B
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationId2B2B,
    loggedInUserId: ownerId,
  });

  // actually delete the deleted activities
  await deleteContent({
    contentId: contentIdDeletedA,
    loggedInUserId: ownerId,
  });
  await deleteContent({
    contentId: contentIdDeletedB,
    loggedInUserId: ownerId,
  });

  // user 1 gets the categories with shared and public activities
  let resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId1,
    systemId: systemId1,
  });

  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId1B);
  expect(resultsCat[1].numCommunity).eq(2);

  // user 2 gets the category with public activities
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId2,
    systemId: systemId1,
  });

  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1B);
  expect(resultsCat[0].numCommunity).eq(1);

  // user 1 gets the category with shared activities
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId1,
    systemId: systemId2,
  });

  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2B);
  expect(resultsCat[0].numCommunity).eq(1);

  // user 2 doesn't get anything in A2
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId2,
    systemId: systemId2,
  });

  expect(resultsCat.length).eq(0);

  // user 1 gets the systems with shared and public activities
  let resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId1,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );

  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(3);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);

  // user 2 gets the system with public activities
  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId2,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );

  expect(resultsSystem.length).eq(1);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
});

test("browse categories and systems with shared content, search, returns only classifications with public/shared/non-deleted content and classifications", async () => {
  const { userId: userId1 } = await createTestUser();
  const { userId: userId2 } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    systemId: systemId1,
    categoryIdA: categoryId1A,
    classificationIdA1A: classificationId1A1A,
    classificationIdA1B: classificationId1A1B,
    classificationIdA2A: classificationId1A2A,
    classificationIdA2B: classificationId1A2B,
    categoryIdB: categoryId1B,
    classificationIdB1A: classificationId1B1A,
    classificationIdB1B: classificationId1B1B,
    classificationIdB2A: classificationId1B2A,
    classificationIdB2B: classificationId1B2B,
  } = await createTestClassifications({
    word,
    code,
  });

  const {
    systemId: systemId2,
    classificationIdA1A: classificationId2A1A,
    categoryIdB: categoryId2B,
    classificationIdB2B: classificationId2B2B,
  } = await createTestClassifications({
    word: "b2",
    code,
  });

  // add shared, private activities to 1A1A, 1A1B, 1A2A, and/or 1A2B
  // add public, shared, private activities to 1B1A, 1B1B, 1B2A, and/or 1B2B
  const { contentId: contentIdSharedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdSharedA,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdPrivateA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdPrivateA,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdDeletedA } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdDeletedA,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdPublicB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdPublicB,
    name: `banana${code}`,
    loggedInUserId: ownerId,
  });

  const { contentId: contentIdSharedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdSharedB,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdPrivateB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdPrivateB,
    name: `banana${code}`,
    loggedInUserId: ownerId,
  });

  const { contentId: contentIdDeletedB } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdDeletedB,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });

  const { contentId: contentIdPublicC } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdPublicC,
    name: `grape${code}`,
    loggedInUserId: ownerId,
  });

  const { contentId: contentIdPublicD } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdPublicD,
    source: `grape${code}`,
    loggedInUserId: ownerId,
  });

  await setContentIsPublic({
    contentId: contentIdPublicB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedA,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await modifyContentSharedWith({
    action: "share",
    contentId: contentIdSharedB,
    loggedInUserId: ownerId,
    users: [userId1],
  });
  await setContentIsPublic({
    contentId: contentIdDeletedA,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdDeletedB,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdPublicC,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdPublicD,
    isPublic: true,
    loggedInUserId: ownerId,
  });

  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationId1A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationId1A1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationId1A2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedA,
    classificationId: classificationId1A2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationId1A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationId1A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicC,
    classificationId: classificationId1A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicC,
    classificationId: classificationId1A1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicC,
    classificationId: classificationId1A2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicB,
    classificationId: classificationId1B1B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicB,
    classificationId: classificationId1B2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicB,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationId1B1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationId1B2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicD,
    classificationId: classificationId1B2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicD,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });

  // add the private and deleted activities, and public activities with different text, to 2A1A and 2B2B
  await addClassification({
    contentId: contentIdPrivateA,
    classificationId: classificationId2A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedA,
    classificationId: classificationId2A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicC,
    classificationId: classificationId2A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPrivateB,
    classificationId: classificationId2B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdDeletedB,
    classificationId: classificationId2B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdPublicD,
    classificationId: classificationId2B2B,
    loggedInUserId: ownerId,
  });

  // add a shared activity to 2B2B
  await addClassification({
    contentId: contentIdSharedB,
    classificationId: classificationId2B2B,
    loggedInUserId: ownerId,
  });

  // actually delete the deleted activities
  await deleteContent({
    contentId: contentIdDeletedA,
    loggedInUserId: ownerId,
  });
  await deleteContent({
    contentId: contentIdDeletedB,
    loggedInUserId: ownerId,
  });

  // user 1 gets the classifications with shared and public activities
  let resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId1,
    systemId: systemId1,
  });

  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId1B);
  expect(resultsCat[1].numCommunity).eq(2);

  // user 2 gets the classification with public activities
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId2,
    systemId: systemId1,
  });

  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1B);
  expect(resultsCat[0].numCommunity).eq(1);

  // user 1 gets the classification with shared activities
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId1,
    systemId: systemId2,
  });

  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2B);
  expect(resultsCat[0].numCommunity).eq(1);

  // user 2 doesn't get anything in A2
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId2,
    systemId: systemId2,
  });

  expect(resultsCat.length).eq(0);

  // user 1 gets the subcategories with shared and public activities
  let resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId1,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );

  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(3);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);

  // user 2 gets the classification with public activities
  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId2,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );

  expect(resultsSystem.length).eq(1);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
});

test("browse categories and systems with shared content, filter by activity category", async () => {
  const { userId } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    systemId: systemId1,
    categoryIdA: categoryId1A,
    classificationIdA1A: classificationId1A1A,
    categoryIdB: categoryId1B,
    classificationIdB2B: classificationId1B2B,
  } = await createTestClassifications({
    word,
    code,
  });

  const {
    systemId: systemId2,
    categoryIdA: categoryId2A,
    classificationIdA1A: classificationId2A1A,
    categoryIdB: categoryId2B,
    classificationIdB2B: classificationId2B2B,
  } = await createTestClassifications({
    word: "b2",
    code,
  });

  // add isQuestion activity to 1A1A
  // add isInteractive activity to 2B2B
  // add video with different text to 1B2B
  const { contentId: contentIdQ } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdQ,
    name: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdI } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdI,
    name: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdV } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdV,
    name: `grape${code}`,
    loggedInUserId: ownerId,
  });

  await setContentIsPublic({
    contentId: contentIdQ,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdI,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdV,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQ,
    classificationId: classificationId1A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdI,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdV,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });

  await updateCategories({
    contentId: contentIdQ,
    loggedInUserId: ownerId,
    categories: { isQuestion: true },
  });
  await updateCategories({
    contentId: contentIdI,
    loggedInUserId: ownerId,
    categories: { isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdV,
    loggedInUserId: ownerId,
    categories: { containsVideo: true },
  });

  // add activities with multiple categories to 2A1A, 2B2B
  const { contentId: contentIdQI } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdQI,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdQV } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdQV,
    source: `banana${code}`,
    loggedInUserId: ownerId,
  });
  const { contentId: contentIdIV } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentIdIV,
    source: `grape${code}`,
    loggedInUserId: ownerId,
  });

  await setContentIsPublic({
    contentId: contentIdQI,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdQV,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentIdIV,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQI,
    classificationId: classificationId2A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdQV,
    classificationId: classificationId2A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentIdIV,
    classificationId: classificationId2B2B,
    loggedInUserId: ownerId,
  });

  await updateCategories({
    contentId: contentIdQI,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, isInteractive: true },
  });
  await updateCategories({
    contentId: contentIdQV,
    loggedInUserId: ownerId,
    categories: { isQuestion: true, containsVideo: true },
  });
  await updateCategories({
    contentId: contentIdIV,
    loggedInUserId: ownerId,
    categories: { isInteractive: true, containsVideo: true },
  });

  // get all activities with no filter
  let resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId1B);
  expect(resultsCat[1].numCommunity).eq(2);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId2,
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(2);
  expect(resultsCat[1].category!.id).eq(categoryId2B);
  expect(resultsCat[1].numCommunity).eq(1);

  let resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(3);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(3);

  // filter by isQuestion
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isQuestion"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isQuestion"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(2);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
      categories: new Set(["isQuestion"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(2);

  // filter by isInteractive
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isInteractive"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1B);
  expect(resultsCat[0].numCommunity).eq(1);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isInteractive"]),
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId2B);
  expect(resultsCat[1].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
      categories: new Set(["isInteractive"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(2);

  // filter by containsVideo
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["containsVideo"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1B);
  expect(resultsCat[0].numCommunity).eq(1);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["containsVideo"]),
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId2B);
  expect(resultsCat[1].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
      categories: new Set(["containsVideo"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(2);

  // filter by isQuestion, isInteractive
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(resultsCat.length).eq(0);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(1);
  expect(resultsSystem[0].system!.id).eq(systemId2);
  expect(resultsSystem[0].numCommunity).eq(1);

  // filter by isQuestion, containsVideo
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(resultsCat.length).eq(0);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "containsVideo"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(1);
  expect(resultsSystem[0].system!.id).eq(systemId2);
  expect(resultsSystem[0].numCommunity).eq(1);

  // filter by isInteractive, containsVideo
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(resultsCat.length).eq(0);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2B);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
      categories: new Set(["isInteractive", "containsVideo"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(1);
  expect(resultsSystem[0].system!.id).eq(systemId2);
  expect(resultsSystem[0].numCommunity).eq(1);

  // filter by isQuestion, isInteractive, containsVideo
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
  });
  expect(resultsCat.length).eq(0);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
  });
  expect(resultsCat.length).eq(0);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(0);

  // now combine with search

  // no filter besides search banana
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId1B);
  expect(resultsCat[1].numCommunity).eq(1);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId2,
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(2);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(2);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(2);

  // filter by isQuestion, search banana
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isQuestion"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isQuestion"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(2);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(2);

  // filter by isInteractive, search banana
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isInteractive"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1B);
  expect(resultsCat[0].numCommunity).eq(1);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isInteractive"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId,
      categories: new Set(["isInteractive"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);

  // filter by containsVideo, search banana
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["containsVideo"]),
  });
  expect(resultsCat.length).eq(0);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["containsVideo"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId,
      categories: new Set(["containsVideo"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(1);
  expect(resultsSystem[0].system!.id).eq(systemId2);
  expect(resultsSystem[0].numCommunity).eq(1);

  // filter by isQuestion, isInteractive, search banana
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(resultsCat.length).eq(0);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isQuestion", "isInteractive"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(1);
  expect(resultsSystem[0].system!.id).eq(systemId2);
  expect(resultsSystem[0].numCommunity).eq(1);

  // filter by isQuestion, containsVideo, search banana
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(resultsCat.length).eq(0);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isQuestion", "containsVideo"]),
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId2A);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "containsVideo"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(1);
  expect(resultsSystem[0].system!.id).eq(systemId2);
  expect(resultsSystem[0].numCommunity).eq(1);

  // filter by isInteractive, containsVideo, search banana
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(resultsCat.length).eq(0);
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId2,
    categories: new Set(["isInteractive", "containsVideo"]),
  });
  expect(resultsCat.length).eq(0);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId,
      categories: new Set(["isInteractive", "containsVideo"]),
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(0);
});

test("browse categories and systems with shared content, filter by owner", async () => {
  const { userId } = await createTestUser();
  const { userId: owner1Id } = await createTestUser();
  const { userId: owner2Id } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "b";

  const {
    systemId: systemId1,
    categoryIdA: categoryId1A,
    classificationIdA1A: classificationId1A1A,
    categoryIdB: categoryId1B,
    classificationIdB2B: classificationId1B2B,
  } = await createTestClassifications({
    word,
    code,
  });

  const {
    systemId: systemId2,
    classificationIdA1A: classificationId2A1A,
    classificationIdB2B: classificationId2B2B,
  } = await createTestClassifications({
    word: "b2",
    code,
  });

  // add owner1 activity to 1A1A
  // add owner1 activity with different text to 1B2B
  // add owner2 activity to 1B2B
  // add owner2 activity with different text to 2A1A
  // add owner1 activity to 2B2B

  const { contentId: contentId1A1A } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A1A,
    name: `banana${code}`,
    loggedInUserId: owner1Id,
  });
  const { contentId: contentId1A1B } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A1B,
    name: `grape${code}`,
    loggedInUserId: owner1Id,
  });
  const { contentId: contentId2A1B } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId2A1B,
    name: `banana${code}`,
    loggedInUserId: owner2Id,
  });

  const { contentId: contentId2A2A } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId2A2A,
    name: `grape${code}`,
    loggedInUserId: owner2Id,
  });
  const { contentId: contentId1A2B } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A2B,
    name: `banana${code}`,
    loggedInUserId: owner1Id,
  });

  await setContentIsPublic({
    contentId: contentId1A1A,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId1A1B,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId2A1B,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: contentId2A2A,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: contentId1A2B,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId1A1A,
    classificationId: classificationId1A1A,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId1A1B,
    classificationId: classificationId1B2B,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId2A1B,
    classificationId: classificationId1B2B,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId2A2A,
    classificationId: classificationId2A1A,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId1A2B,
    classificationId: classificationId2B2B,
    loggedInUserId: owner1Id,
  });

  // get all activities with no filter
  let resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId1B);
  expect(resultsCat[1].numCommunity).eq(2);

  let resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(3);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(2);

  // filter by owner 1
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
    ownerId: owner1Id,
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId1B);
  expect(resultsCat[1].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
      ownerId: owner1Id,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(2);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);

  // filter by owner 2
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    loggedInUserId: userId,
    systemId: systemId1,
    ownerId: owner2Id,
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1B);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      loggedInUserId: userId,
      ownerId: owner2Id,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);

  // now combine with search

  // no filter besides search banana
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId1B);
  expect(resultsCat[1].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(2);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);

  // filter by owner 1, search banana
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
    ownerId: owner1Id,
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId,
      ownerId: owner1Id,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);

  // filter by owner 2, search banana
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
    ownerId: owner2Id,
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1B);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code}`,
      loggedInUserId: userId,
      ownerId: owner2Id,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(1);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
});

test("browse categories and systems with shared content, search includes owner name if not filtering by owner", async () => {
  const code = Date.now().toString();

  const { userId } = await createTestUser();
  const { userId: owner1Id } = await createTestUser();
  await updateUser({
    loggedInUserId: owner1Id,
    firstNames: `Fred${code}`,
    lastNames: `Flintstone${code}`,
  });
  const { userId: owner2Id } = await createTestUser();
  await updateUser({
    loggedInUserId: owner2Id,
    firstNames: `Wilma${code}`,
    lastNames: `Flintstone${code}`,
  });

  // create a made up classification tree
  const word = "b";

  const {
    systemId: systemId1,
    categoryIdA: categoryId1A,
    classificationIdA1A: classificationId1A1A,
    categoryIdB: categoryId1B,
    classificationIdB2B: classificationId1B2B,
  } = await createTestClassifications({
    word,
    code,
  });

  const {
    systemId: systemId2,
    classificationIdA1A: classificationId2A1A,
    classificationIdB2B: classificationId2B2B,
  } = await createTestClassifications({
    word: "b2",
    code,
  });

  // add owner1 activity to 1A1A
  // add owner1 activity with different text to 1B2B
  // add owner2 activity to 1B2B
  // add owner2 activity with different text to 2A1A
  // add owner1 activity to 2B2B

  const { contentId: contentId1A1A } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A1A,
    name: `banana${code}`,
    loggedInUserId: owner1Id,
  });
  const { contentId: contentId1A1B } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A1B,
    name: `grape${code}`,
    loggedInUserId: owner1Id,
  });
  const { contentId: contentId2A1B } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId2A1B,
    name: `banana${code}`,
    loggedInUserId: owner2Id,
  });

  const { contentId: contentId2A2A } = await createContent({
    loggedInUserId: owner2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId2A2A,
    name: `grape${code}`,
    loggedInUserId: owner2Id,
  });
  const { contentId: contentId1A2B } = await createContent({
    loggedInUserId: owner1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1A2B,
    name: `banana${code}`,
    loggedInUserId: owner1Id,
  });

  await setContentIsPublic({
    contentId: contentId1A1A,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId1A1B,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await setContentIsPublic({
    contentId: contentId2A1B,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: contentId2A2A,
    isPublic: true,
    loggedInUserId: owner2Id,
  });
  await setContentIsPublic({
    contentId: contentId1A2B,
    isPublic: true,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId1A1A,
    classificationId: classificationId1A1A,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId1A1B,
    classificationId: classificationId1B2B,
    loggedInUserId: owner1Id,
  });
  await addClassification({
    contentId: contentId2A1B,
    classificationId: classificationId1B2B,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId2A2A,
    classificationId: classificationId2A1A,
    loggedInUserId: owner2Id,
  });
  await addClassification({
    contentId: contentId1A2B,
    classificationId: classificationId2B2B,
    loggedInUserId: owner1Id,
  });

  // search owner 1
  let resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `Fred${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId1B);
  expect(resultsCat[1].numCommunity).eq(1);

  let resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `Fred${code}`,
      loggedInUserId: userId,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(2);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);

  // search owner 2
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `Wilma${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1B);
  expect(resultsCat[0].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `Wilma${code}`,
      loggedInUserId: userId,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);

  // search banana and owner 1
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code} Fred${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId1B);
  expect(resultsCat[1].numCommunity).eq(2);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code} Fred${code}`,
      loggedInUserId: userId,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(3);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);

  // search for banana and owner 2
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `banana${code} Wilma${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(2);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(1);
  expect(resultsCat[1].category!.id).eq(categoryId1B);
  expect(resultsCat[1].numCommunity).eq(1);

  resultsSystem = (
    await browseClassificationSystemsWithSharedContent({
      query: `banana${code} Wilma${code}`,
      loggedInUserId: userId,
    })
  ).filter(
    (res) => res.system && [systemId1, systemId2].includes(res.system.id),
  );
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(2);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(2);
});

test("browse categories and systems with shared content, search hits classifications", async () => {
  const { userId } = await createTestUser();
  const { userId: ownerId } = await createTestUser();

  // create a made up classification tree
  const code = Date.now().toString();
  const word = "orange";

  const {
    systemId: systemId1,
    categoryIdA: categoryId1A,
    classificationIdA1A: classificationId1A1A,
    categoryIdB: categoryId1B,
    classificationIdB2B: classificationId1B2B,
  } = await createTestClassifications({
    word,
    code,
  });

  const {
    systemId: systemId2,
    classificationIdA1A: classificationId2A1A,
    classificationIdB2A: classificationId2B2A,
    classificationIdB2B: classificationId2B2B,
  } = await createTestClassifications({
    word,
    code: code + "B",
  });

  const { contentId: contentId1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId3 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId4 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId5 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId6 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const { contentId: contentId7 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  await setContentIsPublic({
    contentId: contentId1,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentId2,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentId3,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentId4,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentId5,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentId6,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await setContentIsPublic({
    contentId: contentId7,
    isPublic: true,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentId1,
    classificationId: classificationId1A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentId2,
    classificationId: classificationId1A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentId3,
    classificationId: classificationId1B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentId4,
    classificationId: classificationId2A1A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentId5,
    classificationId: classificationId2B2A,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentId6,
    classificationId: classificationId2B2B,
    loggedInUserId: ownerId,
  });
  await addClassification({
    contentId: contentId7,
    classificationId: classificationId2B2B,
    loggedInUserId: ownerId,
  });

  // when browsing for categories, get hits on classifications
  let resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `${word}A1A${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1A);
  expect(resultsCat[0].numCommunity).eq(2);

  // when browsing for categories, get hits on subcategory
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `${word}B2${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(1);
  expect(resultsCat[0].category!.id).eq(categoryId1B);
  expect(resultsCat[0].numCommunity).eq(1);

  // when browsing for categories, don't get hits on category itself
  resultsCat = await browseClassificationCategoriesWithSharedContent({
    query: `${word}B${code}`,
    loggedInUserId: userId,
    systemId: systemId1,
  });
  expect(resultsCat.length).eq(0);

  // when browsing for systems, get hits on classifications
  let resultsSystem = await browseClassificationSystemsWithSharedContent({
    query: `${word}B2B${code}`,
    loggedInUserId: userId,
  });
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(2);

  // when browsing for systems, get hits on subcategories
  resultsSystem = await browseClassificationSystemsWithSharedContent({
    query: `${word}B2${code}`,
    loggedInUserId: userId,
  });
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(1);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(3);

  // when browsing for systems, get hits on categories
  resultsSystem = await browseClassificationSystemsWithSharedContent({
    query: `${word}A${code}`,
    loggedInUserId: userId,
  });
  expect(resultsSystem.length).eq(2);
  expect(resultsSystem[0].system!.id).eq(systemId1);
  expect(resultsSystem[0].numCommunity).eq(2);
  expect(resultsSystem[1].system!.id).eq(systemId2);
  expect(resultsSystem[1].numCommunity).eq(1);
});

test("Explore APIs do not provide email", async () => {
  const code = Date.now().toString();
  const { userId: loggedInUserId, lastNames: authorLastName } =
    await createTestUser();
  const { contentId } = await createContent({
    loggedInUserId,
    contentType: "singleDoc",
    name: code,
    parentId: null,
  });
  await setContentIsPublic({
    loggedInUserId,
    contentId,
    isPublic: true,
  });

  let results = await browseSharedContent({
    isCurated: false,
    loggedInUserId,
  });
  expect(results[0].owner).not.toHaveProperty("email");

  results = await browseTrendingContent({
    loggedInUserId,
  });
  expect(results[0].owner).not.toHaveProperty("email");

  results = await searchSharedContent({
    isCurated: false,
    loggedInUserId,
    query: code,
  });
  expect(results[0].owner).not.toHaveProperty("email");

  let userResults = await browseUsersWithSharedContent({
    loggedInUserId,
  });
  expect(userResults[0]).not.toHaveProperty("email");

  userResults = await searchUsersWithSharedContent({
    loggedInUserId,
    query: authorLastName,
  });
  expect(userResults[0]).not.toHaveProperty("email");
});

describe("countMatchingContentByCategory", () => {
  test("counts per category for a single owner without query", async () => {
    const { userId: viewerId } = await createTestUser();
    const { userId: ownerId } = await createTestUser();
    const code = Date.now().toString();

    const [content1Id, content2Id, content3Id] = await setupTestContent(
      ownerId,
      {
        [`alpha${code}1`]: doc(""),
        [`alpha${code}2`]: doc(""),
        [`alpha${code}3`]: doc(""),
      },
    );

    await setContentIsPublic({
      contentId: content1Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await setContentIsPublic({
      contentId: content2Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await setContentIsPublic({
      contentId: content3Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    await updateCategories({
      contentId: content1Id,
      loggedInUserId: ownerId,
      categories: { isInteractive: true },
    });
    await updateCategories({
      contentId: content2Id,
      loggedInUserId: ownerId,
      categories: { containsVideo: true },
    });
    await updateCategories({
      contentId: content3Id,
      loggedInUserId: ownerId,
      categories: { isInteractive: true, containsVideo: true },
    });

    const counts = await countMatchingContentByCategory({
      loggedInUserId: viewerId,
      ownerId,
    });

    expect(counts.isInteractive?.numCommunity).eq(2);
    expect(counts.containsVideo?.numCommunity).eq(2);
    expect(counts.isAnimation?.numCommunity).eq(0);
    expect(counts.isInteractive?.numCurated).eq(0);
  });

  test("respects query filtering when counting per category", async () => {
    const { userId: viewerId } = await createTestUser();
    const { userId: ownerId } = await createTestUser();
    const code = Date.now().toString();

    const [content1Id, content2Id] = await setupTestContent(ownerId, {
      [`alpha${code}`]: doc(""),
      [`beta${code}`]: doc(""),
    });

    await setContentIsPublic({
      contentId: content1Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await setContentIsPublic({
      contentId: content2Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    await updateCategories({
      contentId: content1Id,
      loggedInUserId: ownerId,
      categories: { isInteractive: true },
    });
    await updateCategories({
      contentId: content2Id,
      loggedInUserId: ownerId,
      categories: { containsVideo: true },
    });

    const counts = await countMatchingContentByCategory({
      query: `alpha${code}`,
      loggedInUserId: viewerId,
      ownerId,
    });

    expect(counts.isInteractive?.numCommunity).eq(1);
    expect(counts.containsVideo?.numCommunity).eq(0);
    expect(counts.isInteractive?.numCurated).eq(0);
  });

  test("counts per category when categories filter is provided", async () => {
    const { userId: viewerId } = await createTestUser();
    const { userId: ownerId } = await createTestUser();
    const code = Date.now().toString();

    const [content1Id, content2Id, content3Id, content4Id] =
      await setupTestContent(ownerId, {
        [`alpha${code}1`]: doc(""),
        [`alpha${code}2`]: doc(""),
        [`alpha${code}3`]: doc(""),
        [`alpha${code}4`]: doc(""),
      });

    await setContentIsPublic({
      contentId: content1Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await setContentIsPublic({
      contentId: content2Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await setContentIsPublic({
      contentId: content3Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await setContentIsPublic({
      contentId: content4Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    await updateCategories({
      contentId: content1Id,
      loggedInUserId: ownerId,
      categories: { isInteractive: true },
    });
    await updateCategories({
      contentId: content2Id,
      loggedInUserId: ownerId,
      categories: { isInteractive: true, containsVideo: true },
    });
    await updateCategories({
      contentId: content3Id,
      loggedInUserId: ownerId,
      categories: { isInteractive: true, isAnimation: true },
    });
    await updateCategories({
      contentId: content4Id,
      loggedInUserId: ownerId,
      categories: { containsVideo: true },
    });

    const counts = await countMatchingContentByCategory({
      loggedInUserId: viewerId,
      ownerId,
      categories: new Set(["isInteractive"]),
    });

    expect(counts.isInteractive?.numCommunity).eq(3);
    expect(counts.containsVideo?.numCommunity).eq(1);
    expect(counts.isAnimation?.numCommunity).eq(1);
    expect(counts.isInteractive?.numCurated).eq(0);
  });

  test("handles categories filter with three items", async () => {
    const { userId: viewerId } = await createTestUser();
    const { userId: ownerId } = await createTestUser();
    const code = Date.now().toString();

    const [content1Id, content2Id, content3Id] = await setupTestContent(
      ownerId,
      {
        [`alpha${code}1`]: doc(""),
        [`alpha${code}2`]: doc(""),
        [`alpha${code}3`]: doc(""),
      },
    );

    await setContentIsPublic({
      contentId: content1Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await setContentIsPublic({
      contentId: content2Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await setContentIsPublic({
      contentId: content3Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    await updateCategories({
      contentId: content1Id,
      loggedInUserId: ownerId,
      categories: {
        isInteractive: true,
        containsVideo: true,
        isAnimation: true,
      },
    });
    await updateCategories({
      contentId: content2Id,
      loggedInUserId: ownerId,
      categories: {
        isInteractive: true,
        containsVideo: true,
        isAnimation: true,
        isPreview: true,
      },
    });
    await updateCategories({
      contentId: content3Id,
      loggedInUserId: ownerId,
      categories: {
        isInteractive: true,
        containsVideo: true,
      },
    });

    const counts = await countMatchingContentByCategory({
      loggedInUserId: viewerId,
      ownerId,
      categories: new Set(["isInteractive", "containsVideo", "isAnimation"]),
    });

    expect(counts.isInteractive?.numCommunity).eq(2);
    expect(counts.isPreview?.numCommunity).eq(1);
    expect(counts.isAnimation?.numCommunity).eq(2);
    expect(counts.isInteractive?.numCurated).eq(0);
  });
});
