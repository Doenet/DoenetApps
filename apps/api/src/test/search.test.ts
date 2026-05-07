import { expect, test, describe } from "vitest";
import {
  createTestClassifications,
  createTestUser,
  doc,
  fold,
  pset,
  setupTestContent,
} from "./utils";
import { compareUUID, fromUUID, isEqualUUID } from "../utils/uuid";
import {
  createContent,
  deleteContent,
  updateContent,
  updateCategories,
} from "../query/activity";
import {
  modifyContentSharedWith,
  setContentIsPublic,
  shareContentWithEmail,
} from "../query/share";
import {
  addClassification,
  searchPossibleClassifications,
} from "../query/classification";
import {
  searchClassificationCategoriesWithSharedContent,
  searchClassificationSubCategoriesWithSharedContent,
  searchClassificationsWithSharedContent,
  searchSharedContent,
  searchUsersWithSharedContent,
} from "../query/explore";
import { searchMyContent } from "../query/content_list";
import { updateUser } from "../query/user";
import { Content } from "../types";

describe("searchSharedContent Tests", function () {
  test("searchSharedContent returns public/shared activities and folders matching the query", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const user = await createTestUser();
    const userId = user.userId;

    if (user.email === null) {
      throw new Error("User should have email");
    }

    // Create unique session number for names in this test
    const sessionNumber = Date.now().toString();

    const publicActivityName = `public activity ${sessionNumber}`;
    const privateActivityName = `private activity ${sessionNumber}`;
    const sharedActivityName = `shared activity ${sessionNumber}`;
    const publicFolderName = `public folder ${sessionNumber}`;
    const privateFolderName = `private folder ${sessionNumber}`;
    const sharedFolderName = `shared folder ${sessionNumber}`;

    const { contentId: publicContentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: publicContentId,
      name: publicActivityName,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: publicContentId,
      isPublic: true,
      loggedInUserId: ownerId,
    });

    const { contentId: privateContentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: privateContentId,
      name: privateActivityName,
      loggedInUserId: ownerId,
    });

    const { contentId: sharedContentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: sharedContentId,
      name: sharedActivityName,
      loggedInUserId: ownerId,
    });
    await shareContentWithEmail({
      contentId: sharedContentId,
      loggedInUserId: ownerId,
      email: user.email,
    });

    const { contentId: publicFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    await updateContent({
      contentId: publicFolderId,
      name: publicFolderName,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: publicFolderId,
      isPublic: true,
      loggedInUserId: ownerId,
    });

    const { contentId: privateFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    await updateContent({
      contentId: privateFolderId,
      name: privateFolderName,
      loggedInUserId: ownerId,
    });

    const { contentId: sharedFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    await updateContent({
      contentId: sharedFolderId,
      name: sharedFolderName,
      loggedInUserId: ownerId,
    });
    await modifyContentSharedWith({
      action: "share",
      contentId: sharedFolderId,
      loggedInUserId: ownerId,
      users: [userId],
    });

    const searchResults = await searchSharedContent({
      query: sessionNumber,
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(searchResults.length).eq(4);

    const namesInOrder = searchResults
      .sort((a, b) => compareUUID(a.contentId, b.contentId))
      .map((c) => c.name);

    expect(namesInOrder).eqls([
      publicActivityName,
      sharedActivityName,
      publicFolderName,
      sharedFolderName,
    ]);
  });

  test("searchSharedContent returns public/shared activities and folders even in a private folder", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const user = await createTestUser();
    const userId = user.userId;

    // Create unique session number for names in this test
    const sessionNumber = Date.now().toString();

    const { contentId: parentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });

    const publicActivityName = `public activity ${sessionNumber}`;
    const privateActivityName = `private activity ${sessionNumber}`;
    const sharedActivityName = `shared activity ${sessionNumber}`;
    const publicFolderName = `public folder ${sessionNumber}`;
    const privateFolderName = `private folder ${sessionNumber}`;
    const sharedFolderName = `shared folder ${sessionNumber}`;

    const { contentId: publicContentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: parentId,
    });
    await updateContent({
      contentId: publicContentId,
      name: publicActivityName,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: publicContentId,
      isPublic: true,
      loggedInUserId: ownerId,
    });

    const { contentId: privateContentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: parentId,
    });
    await updateContent({
      contentId: privateContentId,
      name: privateActivityName,
      loggedInUserId: ownerId,
    });

    const { contentId: sharedContentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: parentId,
    });
    await updateContent({
      contentId: sharedContentId,
      name: sharedActivityName,
      loggedInUserId: ownerId,
    });
    await modifyContentSharedWith({
      action: "share",
      contentId: sharedContentId,
      loggedInUserId: ownerId,
      users: [userId],
    });

    const { contentId: publicFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: parentId,
    });
    await updateContent({
      contentId: publicFolderId,
      name: publicFolderName,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: publicFolderId,
      isPublic: true,
      loggedInUserId: ownerId,
    });

    const { contentId: privateFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: parentId,
    });
    await updateContent({
      contentId: privateFolderId,
      name: privateFolderName,
      loggedInUserId: ownerId,
    });

    const { contentId: sharedFolderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: parentId,
    });
    await updateContent({
      contentId: sharedFolderId,
      name: sharedFolderName,
      loggedInUserId: ownerId,
    });
    await modifyContentSharedWith({
      action: "share",
      contentId: sharedFolderId,
      loggedInUserId: ownerId,
      users: [userId],
    });

    const searchResults = await searchSharedContent({
      query: sessionNumber,
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(searchResults.length).eq(4);

    const namesInOrder = searchResults
      .sort((a, b) => compareUUID(a.contentId, b.contentId))
      .map((c) => c.name);

    expect(namesInOrder).eqls([
      publicActivityName,
      sharedActivityName,
      publicFolderName,
      sharedFolderName,
    ]);
  });

  test("searchSharedContent, document source matches", async () => {
    const user = await createTestUser();
    const userId = user.userId;

    const owner = await createTestUser();
    const ownerId = owner.userId;
    const code = Date.now().toString();
    const { contentId: contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: contentId,
      source: `b${code}ananas`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    // apple doesn't hit
    let results = await searchSharedContent({
      query: "apple",
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(
      results.filter((r) => isEqualUUID(r.contentId, contentId)),
    ).toHaveLength(0);

    // first part of a word hits
    results = await searchSharedContent({
      query: `b${code}ana`,
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(
      results.filter((r) => isEqualUUID(r.contentId, contentId)),
    ).toHaveLength(1);

    // full word hits
    results = await searchSharedContent({
      query: `b${code}ananas`,
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(
      results.filter((r) => isEqualUUID(r.contentId, contentId)),
    ).toHaveLength(1);
  });

  test("searchSharedContent, owner name matches", async () => {
    const user = await createTestUser();
    const userId = user.userId;

    // unique code to distinguish content added in this test
    const code = `${Date.now()}`;

    const owner = await createTestUser();
    const ownerId = owner.userId;
    await updateUser({
      loggedInUserId: ownerId,
      firstNames: `Arya${code}`,
      lastNames: "Abbas",
    });
    const { contentId: contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    let results = await searchSharedContent({
      query: `Arya${code}`,
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(
      results.filter((r) => isEqualUUID(r.contentId, contentId)),
    ).toHaveLength(1);

    results = await searchSharedContent({
      query: `Arya${code} Abbas`,
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(
      results.filter((r) => isEqualUUID(r.contentId, contentId)),
    ).toHaveLength(1);
  });

  test("searchSharedContent, document source is more relevant than classification", async () => {
    const user = await createTestUser();
    const userId = user.userId;

    const owner = await createTestUser();
    const ownerId = owner.userId;

    // unique code to distinguish content added in this test
    const code = `${Date.now()}`;
    const { contentId: activity1Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity1Id,
      source: `banana${code} muffin${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity1Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    const { contentId: activity2Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity2Id,
      source: `apple${code} muffin${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity2Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    // create a bunch more activities, in case this is the first test run on a reset database,
    // to make sure `banana${code}` is a sufficiently relevant search term
    await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });

    const {
      classificationIdA1A,
      classificationIdA1B,
      classificationIdA2A,
      classificationIdA2B,
      classificationIdB1A,
      classificationIdB1B,
      classificationIdB2A,
      classificationIdB2B,
    } = await createTestClassifications({
      word: "grape",
      code,
    });

    await addClassification({
      contentId: activity2Id,
      classificationId: classificationIdA1A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: activity2Id,
      classificationId: classificationIdA1B,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: activity2Id,
      classificationId: classificationIdA2A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: activity2Id,
      classificationId: classificationIdA2B,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: activity2Id,
      classificationId: classificationIdB1A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: activity2Id,
      classificationId: classificationIdB1B,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: activity2Id,
      classificationId: classificationIdB2A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: activity2Id,
      classificationId: classificationIdB2B,
      loggedInUserId: ownerId,
    });

    let results = await searchSharedContent({
      query: `banana${code} muffin${code}`,
      isCurated: false,
      loggedInUserId: userId,
    });

    expect(results[0].contentId).eqls(activity1Id);
    expect(results[1].contentId).eqls(activity2Id);

    // Even adding in three matching classifications doesn't put the match in first
    results = await searchSharedContent({
      query: `grapeA1A${code} banana${code} muffin${code}`,
      loggedInUserId: userId,
      isCurated: false,
    });

    expect(results[0].contentId).eqls(activity1Id);
    expect(results[1].contentId).eqls(activity2Id);

    // the classifications do put second activity in first place if don't include
    // document content from the first document
    results = await searchSharedContent({
      query: `grapeA1A${code} muffin${code}`,
      loggedInUserId: userId,
      isCurated: false,
    });

    expect(results[0].contentId).eqls(activity2Id);
    expect(results[1].contentId).eqls(activity1Id);
  });

  test("searchSharedContent, classification increases relevance", async () => {
    const user = await createTestUser();
    const userId = user.userId;

    const owner = await createTestUser();
    const ownerId = owner.userId;

    // unique code to distinguish content added in this test
    const code = `${Date.now()}`;

    const { classificationIdA1A } = await createTestClassifications({
      word: "grape",
      code,
    });

    const { contentId: activity1Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity1Id,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity1Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    const { contentId: activity2Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity2Id,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity2Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await addClassification({
      contentId: activity2Id,
      classificationId: classificationIdA1A,
      loggedInUserId: ownerId,
    });

    let results = await searchSharedContent({
      query: `grapeA1A${code} banana${code}`,
      loggedInUserId: userId,
      isCurated: false,
    });

    expect(results[0].contentId).eqls(activity2Id);
    expect(results[1].contentId).eqls(activity1Id);

    results = await searchSharedContent({
      query: `grape${code} banana${code}`,
      loggedInUserId: userId,
      isCurated: false,
    });
    expect(results[0].contentId).eqls(activity2Id);
    expect(results[1].contentId).eqls(activity1Id);

    results = await searchSharedContent({
      query: `GrapeA1${code} banana${code}`,
      loggedInUserId: userId,
      isCurated: false,
    });
    expect(results[0].contentId).eqls(activity2Id);
    expect(results[1].contentId).eqls(activity1Id);

    results = await searchSharedContent({
      query: `GrapeA${code} banana${code}`,
      loggedInUserId: userId,
      isCurated: false,
    });
    expect(results[0].contentId).eqls(activity2Id);
    expect(results[1].contentId).eqls(activity1Id);
  });

  test("searchSharedContent, handle tags in search", async () => {
    const user = await createTestUser();
    const userId = user.userId;

    const owner = await createTestUser();
    const ownerId = owner.userId;

    const { contentId: contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: contentId,
      source: "point",
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    const results = await searchSharedContent({
      query: `<point>`,
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(results.length).gte(1);
  });

  test("searchSharedContent, filter by classification", async () => {
    const user = await createTestUser();
    const userId = user.userId;

    const owner = await createTestUser();
    const ownerId = owner.userId;

    const classification1 = (
      await searchPossibleClassifications({ query: "Trig.TT.3" })
    )[0];
    const classifyId1 = classification1.id;
    const subCategoryId1 = classification1.descriptions[0].subCategory.id;
    const categoryId1 = classification1.descriptions[0].subCategory.category.id;
    const systemId1 =
      classification1.descriptions[0].subCategory.category.system.id;

    const classifyId2 = (
      await searchPossibleClassifications({ query: "Trig.TT.5" })
    )[0].id;
    const classifyId3 = (
      await searchPossibleClassifications({ query: "Trig.PC.2" })
    )[0].id;
    const classifyId4 = (
      await searchPossibleClassifications({ query: "AbsAlg.R.3" })
    )[0].id;
    const classifyId5 = (
      await searchPossibleClassifications({ query: "7.SP.3" })
    )[0].id;

    // unique code to distinguish content added in this test
    const code = `${Date.now()}`;

    // Create identical activities, with only difference being which classification is used
    // classifyId1
    const { contentId: activity1Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity1Id,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity1Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await addClassification({
      contentId: activity1Id,
      classificationId: classifyId1,
      loggedInUserId: ownerId,
    });

    // classifyId2
    const { contentId: activity2Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity2Id,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity2Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await addClassification({
      contentId: activity2Id,
      classificationId: classifyId2,
      loggedInUserId: ownerId,
    });

    // classifyId3
    const { contentId: activity3Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity3Id,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity3Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await addClassification({
      contentId: activity3Id,
      classificationId: classifyId3,
      loggedInUserId: ownerId,
    });

    // classifyId4
    const { contentId: activity4Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity4Id,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity4Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await addClassification({
      contentId: activity4Id,
      classificationId: classifyId4,
      loggedInUserId: ownerId,
    });

    // classifyId5
    const { contentId: activity5Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity5Id,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity5Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await addClassification({
      contentId: activity5Id,
      classificationId: classifyId5,
      loggedInUserId: ownerId,
    });

    // unclassified
    const { contentId: activity6Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity6Id,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity6Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    // Create one more distractor activity with classification 1 but different text
    const { contentId: activity7Id } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity7Id,
      source: `grape${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activity7Id,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await addClassification({
      contentId: activity7Id,
      classificationId: classifyId1,
      loggedInUserId: ownerId,
    });

    // get all six activities with no filtering
    let results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(results.length).eq(6);

    // filtering by unclassified reduces it to one activity
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      isUnclassified: true,
    });
    expect(results.length).eq(1);

    // filtering by system reduces it to four activities
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      systemId: systemId1,
    });
    expect(results.length).eq(4);

    // filtering by category reduces it to three activities
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      categoryId: categoryId1,
    });
    expect(results.length).eq(3);

    // filtering by subCategory reduces it to two activities
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      subCategoryId: subCategoryId1,
    });
    expect(results.length).eq(2);

    // filtering by classification reduces it to one activity
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      classificationId: classifyId1,
    });
    expect(results.length).eq(1);
  });

  test("searchSharedContent, filter by activity category", async () => {
    const user = await createTestUser();
    const userId = user.userId;

    const owner = await createTestUser();
    const ownerId = owner.userId;

    // unique code to distinguish content added in this test
    const code = `${Date.now()}`;

    // Create identical activities, with only difference being the activity categories
    // no categories
    const { contentId: activityNId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activityNId,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activityNId,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    // is question
    const { contentId: activityQId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activityQId,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activityQId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await updateCategories({
      contentId: activityQId,
      loggedInUserId: ownerId,
      categories: { isQuestion: true },
    });

    // is interactive
    const { contentId: activityIId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activityIId,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activityIId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await updateCategories({
      contentId: activityIId,
      loggedInUserId: ownerId,
      categories: { isInteractive: true },
    });

    // contains video
    const { contentId: activityVId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activityVId,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activityVId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await updateCategories({
      contentId: activityVId,
      loggedInUserId: ownerId,
      categories: { containsVideo: true },
    });

    // is question and interactive
    const { contentId: activityQIId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activityQIId,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activityQIId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await updateCategories({
      contentId: activityQIId,
      loggedInUserId: ownerId,
      categories: { isQuestion: true, isInteractive: true },
    });

    // is question and contains video
    const { contentId: activityQVId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activityQVId,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activityQVId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await updateCategories({
      contentId: activityQVId,
      loggedInUserId: ownerId,
      categories: { isQuestion: true, containsVideo: true },
    });

    // is interactive and contains video
    const { contentId: activityIVId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activityIVId,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activityIVId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await updateCategories({
      contentId: activityIVId,
      loggedInUserId: ownerId,
      categories: { isInteractive: true, containsVideo: true },
    });

    // is question, is interactive, and contains video
    const { contentId: activityQIVId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activityQIVId,
      source: `banana${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activityQIVId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await updateCategories({
      contentId: activityQIVId,
      loggedInUserId: ownerId,
      categories: {
        isQuestion: true,
        isInteractive: true,
        containsVideo: true,
      },
    });

    // Create one more distractor activity with all categories but different text
    const { contentId: activityDId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activityDId,
      source: `grape${code}`,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: activityDId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    await updateCategories({
      contentId: activityDId,
      loggedInUserId: ownerId,
      categories: {
        isQuestion: true,
        isInteractive: true,
        containsVideo: true,
      },
    });

    // get all eight activities with no filtering
    let results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(results.map((c) => c.contentId)).eqls([
      activityNId,
      activityQId,
      activityIId,
      activityVId,
      activityQIId,
      activityQVId,
      activityIVId,
      activityQIVId,
    ]);

    // filter to the four that are questions
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      categories: new Set(["isQuestion"]),
    });
    expect(results.map((c) => c.contentId)).eqls([
      activityQId,
      activityQIId,
      activityQVId,
      activityQIVId,
    ]);

    // filter to the four that are interactive
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      categories: new Set(["isInteractive"]),
    });
    expect(results.map((c) => c.contentId)).eqls([
      activityIId,
      activityQIId,
      activityIVId,
      activityQIVId,
    ]);

    // filter to the four that are contain videos
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      categories: new Set(["containsVideo"]),
    });
    expect(results.map((c) => c.contentId)).eqls([
      activityVId,
      activityQVId,
      activityIVId,
      activityQIVId,
    ]);

    // filter to the two have are a question and interactive
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive"]),
    });
    expect(results.map((c) => c.contentId)).eqls([activityQIId, activityQIVId]);

    // filter to the two have are a question and contain a video
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "containsVideo"]),
    });
    expect(results.map((c) => c.contentId)).eqls([activityQVId, activityQIVId]);

    // filter to the two have are interactive and contain a video
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      categories: new Set(["isInteractive", "containsVideo"]),
    });
    expect(results.map((c) => c.contentId)).eqls([activityIVId, activityQIVId]);

    // filter to the one that has all three categories
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
    });
    expect(results.map((c) => c.contentId)).eqls([activityQIVId]);
  });

  test("searchSharedContent, filter by owner", async () => {
    const { userId } = await createTestUser();

    const { userId: owner1Id } = await createTestUser();
    const { userId: owner2Id } = await createTestUser();

    // unique code to distinguish content added in this test
    const code = `${Date.now()}`;

    // Create identical activities, with only difference being the owner
    const { contentId: activity1Id } = await createContent({
      loggedInUserId: owner1Id,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity1Id,
      source: `banana${code}`,
      loggedInUserId: owner1Id,
    });
    await setContentIsPublic({
      contentId: activity1Id,
      loggedInUserId: owner1Id,
      isPublic: true,
    });

    const { contentId: activity2Id } = await createContent({
      loggedInUserId: owner2Id,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: activity2Id,
      source: `banana${code}`,
      loggedInUserId: owner2Id,
    });
    await setContentIsPublic({
      contentId: activity2Id,
      loggedInUserId: owner2Id,
      isPublic: true,
    });

    const testIds = function (results: Content[]) {
      return results
        .map((c) => c.contentId)
        .filter(
          (id) => isEqualUUID(id, activity1Id) || isEqualUUID(id, activity2Id),
        );
    };

    // get both activities with no filtering
    let results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
    });
    expect(testIds(results)).eqls([activity1Id, activity2Id]);

    // filter for owner 1
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      ownerId: owner1Id,
    });
    expect(testIds(results)).eqls([activity1Id]);

    // filter for owner 2
    results = await searchSharedContent({
      query: `banana${code}`,
      isCurated: false,
      loggedInUserId: userId,
      ownerId: owner2Id,
    });
    expect(testIds(results)).eqls([activity2Id]);
  });
});

describe("searchUsersWithSharedContent Tests", () => {
  test("searchUsersWithSharedContent returns only users with public/shared/non-deleted content", async () => {
    const user1 = await createTestUser();
    const user1Id = user1.userId;
    const user2 = await createTestUser();
    const user2Id = user2.userId;

    // owner 1 has only private and deleted content
    const owner1 = await createTestUser();
    const owner1Id = owner1.userId;

    await createContent({
      loggedInUserId: owner1Id,
      contentType: "singleDoc",
      parentId: null,
    });
    await createContent({
      loggedInUserId: owner1Id,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: folder1aId } = await createContent({
      loggedInUserId: owner1Id,
      contentType: "folder",
      parentId: null,
    });
    await createContent({
      loggedInUserId: owner1Id,
      contentType: "singleDoc",
      parentId: folder1aId,
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
    await deleteContent({ contentId: activity1dId, loggedInUserId: owner1Id });

    // owner 2 has a public activity
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

    // owner 3 has a public folder
    const owner3 = await createTestUser();
    const owner3Id = owner3.userId;

    const { contentId: folder3aId } = await createContent({
      loggedInUserId: owner3Id,
      contentType: "folder",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: folder3aId,
      loggedInUserId: owner3Id,
      isPublic: true,
    });

    // owner 4 has a activity shared with user1
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
      users: [user1Id],
    });

    // owner 5 has a folder shared with user 1
    const owner5 = await createTestUser();
    const owner5Id = owner5.userId;

    const { contentId: folder5aId } = await createContent({
      loggedInUserId: owner5Id,
      contentType: "folder",
      parentId: null,
    });
    await modifyContentSharedWith({
      contentId: folder5aId,
      loggedInUserId: owner5Id,
      action: "share",
      users: [user1Id],
    });

    // owner 6 has a activity shared with user2
    const owner6 = await createTestUser();
    const owner6Id = owner6.userId;

    const { contentId: folder6aId } = await createContent({
      loggedInUserId: owner6Id,
      contentType: "folder",
      parentId: null,
    });
    const { contentId: activity6aId } = await createContent({
      loggedInUserId: owner6Id,
      contentType: "singleDoc",
      parentId: folder6aId,
    });
    await modifyContentSharedWith({
      contentId: activity6aId,
      loggedInUserId: owner6Id,
      action: "share",
      users: [user2Id],
    });

    // owner 7 has a folder shared with user 2
    const owner7 = await createTestUser();
    const owner7Id = owner7.userId;

    const { contentId: folder7aId } = await createContent({
      loggedInUserId: owner7Id,
      contentType: "folder",
      parentId: null,
    });
    await modifyContentSharedWith({
      contentId: folder7aId,
      loggedInUserId: owner7Id,
      action: "share",
      users: [user2Id],
    });

    // user1 cannot find owner1
    let searchResults = await searchUsersWithSharedContent({
      query: owner1.lastNames,
      loggedInUserId: user1Id,
    });
    expect(searchResults.length).eq(0);

    // user1 can find owner2
    searchResults = await searchUsersWithSharedContent({
      query: owner2.lastNames,
      loggedInUserId: user1Id,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq(owner2.firstNames);
    expect(searchResults[0].lastNames).eq(owner2.lastNames);

    // user1 can find owner3
    searchResults = await searchUsersWithSharedContent({
      query: owner3.lastNames,
      loggedInUserId: user1Id,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq(owner3.firstNames);
    expect(searchResults[0].lastNames).eq(owner3.lastNames);

    // user1 can find owner4
    searchResults = await searchUsersWithSharedContent({
      query: owner4.lastNames,
      loggedInUserId: user1Id,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq(owner4.firstNames);
    expect(searchResults[0].lastNames).eq(owner4.lastNames);

    // user1 can find owner5
    searchResults = await searchUsersWithSharedContent({
      query: owner5.lastNames,
      loggedInUserId: user1Id,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq(owner5.firstNames);
    expect(searchResults[0].lastNames).eq(owner5.lastNames);

    // user1 cannot find owner6
    searchResults = await searchUsersWithSharedContent({
      query: owner6.lastNames,
      loggedInUserId: user1Id,
    });
    expect(searchResults.length).eq(0);

    // user1 cannot find owner7
    searchResults = await searchUsersWithSharedContent({
      query: owner7.lastNames,
      loggedInUserId: user1Id,
    });
    expect(searchResults.length).eq(0);

    // user2 can find owner6
    searchResults = await searchUsersWithSharedContent({
      query: owner6.lastNames,
      loggedInUserId: user2Id,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq(owner6.firstNames);
    expect(searchResults[0].lastNames).eq(owner6.lastNames);

    // user2 can find owner7
    searchResults = await searchUsersWithSharedContent({
      query: owner7.lastNames,
      loggedInUserId: user2Id,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq(owner7.firstNames);
    expect(searchResults[0].lastNames).eq(owner7.lastNames);

    // user2 cannot find owner4
    searchResults = await searchUsersWithSharedContent({
      query: owner4.lastNames,
      loggedInUserId: user2Id,
    });
    expect(searchResults.length).eq(0);

    // user2 cannot find owner5
    searchResults = await searchUsersWithSharedContent({
      query: owner5.lastNames,
      loggedInUserId: user2Id,
    });
    expect(searchResults.length).eq(0);
  });

  test("searchUsersWithSharedContent, filter by system, category, sub category, classification", async () => {
    const classificationFA1 = (
      await searchPossibleClassifications({ query: "FinM.A.1" })
    )[0];
    const classificationIdFA1 = classificationFA1.id;
    const subCategoryIdFA = classificationFA1.descriptions[0].subCategory.id;
    const categoryIdF =
      classificationFA1.descriptions[0].subCategory.category.id;
    const systemId =
      classificationFA1.descriptions[0].subCategory.category.system.id;

    const classificationSD2 = (
      await searchPossibleClassifications({ query: "Stats.DA.2" })
    )[0];
    const classificationIdSD2 = classificationSD2.id;
    const subCategoryIdSD = classificationSD2.descriptions[0].subCategory.id;
    const categoryIdS =
      classificationSD2.descriptions[0].subCategory.category.id;

    const { userId } = await createTestUser();

    const code = Date.now().toString();
    const ownerLastNames = `Flintstone${code}`;

    // owner 1 has only unclassified content
    const { userId: owner1Id } = await createTestUser();
    await updateUser({
      loggedInUserId: owner1Id,
      firstNames: "Fred",
      lastNames: ownerLastNames,
    });
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

    // owner 2 has content in classification FA1
    const { userId: owner2Id } = await createTestUser();
    await updateUser({
      loggedInUserId: owner2Id,
      firstNames: "Wilma",
      lastNames: ownerLastNames,
    });
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
      classificationId: classificationIdFA1,
      loggedInUserId: owner2Id,
    });
    await addClassification({
      contentId: activity2bId,
      classificationId: classificationIdFA1,
      loggedInUserId: owner2Id,
    });

    // owner 3 has a content in classification SD2 and unclassified content
    const { userId: owner3Id } = await createTestUser();
    await updateUser({
      loggedInUserId: owner3Id,
      firstNames: "Pebbles",
      lastNames: ownerLastNames,
    });

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
      classificationId: classificationIdSD2,
      loggedInUserId: owner3Id,
    });

    // all three owners found with no filters
    let searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
    });
    expect(searchResults.length).eq(3);
    expect(searchResults.map((u) => u.firstNames).sort()).eqls([
      "Fred",
      "Pebbles",
      "Wilma",
    ]);

    // owners 1 and 3 have unclassified content
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      isUnclassified: true,
    });
    expect(searchResults.length).eq(2);
    expect(searchResults.map((u) => u.firstNames).sort()).eqls([
      "Fred",
      "Pebbles",
    ]);

    // owners 2 and 3 have content classified in systemId
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      systemId,
    });
    expect(searchResults.length).eq(2);
    expect(searchResults.map((u) => u.firstNames).sort()).eqls([
      "Pebbles",
      "Wilma",
    ]);

    // owners 2 has content in classification FA1
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      classificationId: classificationIdFA1,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq("Wilma");
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      subCategoryId: subCategoryIdFA,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq("Wilma");
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      categoryId: categoryIdF,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq("Wilma");

    // owners 3 has content in classification SD2
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      classificationId: classificationIdSD2,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq("Pebbles");
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      subCategoryId: subCategoryIdSD,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq("Pebbles");
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      categoryId: categoryIdS,
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq("Pebbles");
  });

  test("searchUsersWithSharedContent, filter by activity category", async () => {
    const { userId } = await createTestUser();

    const code = Date.now().toString();
    const ownerLastNames = `Flintstone${code}`;

    // owner 1 has only content without categories and isQuestion
    const { userId: owner1Id } = await createTestUser();
    await updateUser({
      loggedInUserId: owner1Id,
      firstNames: "Fred",
      lastNames: ownerLastNames,
    });
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
      categories: { isQuestion: true },
    });

    // owner 2 has content combinations of two categories
    const { userId: owner2Id } = await createTestUser();
    await updateUser({
      loggedInUserId: owner2Id,
      firstNames: "Wilma",
      lastNames: ownerLastNames,
    });
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
      categories: { isQuestion: true, isInteractive: true },
    });
    await updateCategories({
      contentId: activity2bId,
      loggedInUserId: owner2Id,
      categories: { isQuestion: true, containsVideo: true },
    });
    await updateCategories({
      contentId: activity2cId,
      loggedInUserId: owner2Id,
      categories: { containsVideo: true, isInteractive: true },
    });

    // owner 3 has a content with isInteractive and containsVideo
    const { userId: owner3Id } = await createTestUser();
    await updateUser({
      loggedInUserId: owner3Id,
      firstNames: "Pebbles",
      lastNames: ownerLastNames,
    });

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
    await updateCategories({
      contentId: activity3aId,
      loggedInUserId: owner3Id,
      categories: { isInteractive: true },
    });
    await updateCategories({
      contentId: activity3bId,
      loggedInUserId: owner3Id,
      categories: { containsVideo: true },
    });

    // all three owners found with no filters
    let searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
    });
    expect(searchResults.length).eq(3);
    expect(searchResults.map((u) => u.firstNames).sort()).eqls([
      "Fred",
      "Pebbles",
      "Wilma",
    ]);

    // owners 1 and 2 have isQuestion
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      categories: new Set(["isQuestion"]),
    });
    expect(searchResults.length).eq(2);
    expect(searchResults.map((u) => u.firstNames).sort()).eqls([
      "Fred",
      "Wilma",
    ]);

    // owners 2 and 3 have isInteractive
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      categories: new Set(["isInteractive"]),
    });
    expect(searchResults.length).eq(2);
    expect(searchResults.map((u) => u.firstNames).sort()).eqls([
      "Pebbles",
      "Wilma",
    ]);

    // owners 2 and 3 have containsVideo
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      categories: new Set(["containsVideo"]),
    });
    expect(searchResults.length).eq(2);
    expect(searchResults.map((u) => u.firstNames).sort()).eqls([
      "Pebbles",
      "Wilma",
    ]);

    // owners 2 has combinations of two categories
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive"]),
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq("Wilma");
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "containsVideo"]),
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq("Wilma");
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      categories: new Set(["containsVideo", "isInteractive"]),
    });
    expect(searchResults.length).eq(1);
    expect(searchResults[0].firstNames).eq("Wilma");

    // no one has all three categories
    searchResults = await searchUsersWithSharedContent({
      query: ownerLastNames,
      loggedInUserId: userId,
      categories: new Set(["containsVideo", "isInteractive", "isQuestion"]),
    });
    expect(searchResults.length).eq(0);
  });
});

describe("searchClassificationsWithSharedContent Tests", () => {
  test("searchClassificationsWithSharedContent, returns only classifications with public/shared/non-deleted content", async () => {
    const user1 = await createTestUser();
    const user1Id = user1.userId;
    const user2 = await createTestUser();
    const user2Id = user2.userId;
    const owner = await createTestUser();
    const ownerId = owner.userId;

    // create a made up classification tree
    const code = Date.now().toString();
    const word = "banana";

    const systemId = (
      await searchPossibleClassifications({ query: "FinM.A.3" })
    )[0].descriptions[0].subCategory.category.system.id;

    const {
      categoryIdA,
      subCategoryIdA1,
      classificationIdA1A,
      categoryIdB,
      subCategoryIdB2,
      classificationIdB2B,
    } = await createTestClassifications({ systemId, word, code });

    const { contentId: contentIdPrivate } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: contentIdPublic } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: contentIdShared } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: contentIdDeleted } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });

    await setContentIsPublic({
      contentId: contentIdPublic,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await modifyContentSharedWith({
      contentId: contentIdShared,
      loggedInUserId: ownerId,
      action: "share",
      users: [user1Id],
    });
    await setContentIsPublic({
      contentId: contentIdDeleted,
      isPublic: true,
      loggedInUserId: ownerId,
    });

    // add private, shared, deleted content to classificationIdA1A
    await addClassification({
      contentId: contentIdPrivate,
      classificationId: classificationIdA1A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdShared,
      classificationId: classificationIdA1A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdDeleted,
      classificationId: classificationIdA1A,
      loggedInUserId: ownerId,
    });

    // add public, private, shared, deleted content to classificationIdB2B
    await addClassification({
      contentId: contentIdPublic,
      classificationId: classificationIdB2B,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdPrivate,
      classificationId: classificationIdB2B,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdShared,
      classificationId: classificationIdB2B,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdDeleted,
      classificationId: classificationIdB2B,
      loggedInUserId: ownerId,
    });

    // actually delete the deleted activity
    await deleteContent({
      contentId: contentIdDeleted,
      loggedInUserId: ownerId,
    });

    // user1 gets classifications with shared and public content
    let resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}B2B${code}`,
      loggedInUserId: user1Id,
    });
    expect(resultsClass.length).eq(2); // order determined by second query word
    expect(resultsClass[0].classification!.id).eq(classificationIdB2B);
    expect(resultsClass[1].classification!.id).eq(classificationIdA1A);
    let resultsSubCat =
      await searchClassificationSubCategoriesWithSharedContent({
        query: `${word}${code} ${word}A1${code}`,
        loggedInUserId: user1Id,
      });
    expect(resultsSubCat.length).eq(2); // ordered determined by second query word
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdA1);
    expect(resultsSubCat[1].subCategory!.id).eq(subCategoryIdB2);
    let resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code} ${word}B${code}`,
      loggedInUserId: user1Id,
    });
    expect(resultsCat.length).eq(2); // ordered determined by second query word
    expect(resultsCat[0].category!.id).eq(categoryIdB);
    expect(resultsCat[1].category!.id).eq(categoryIdA);

    // user2 just gets classifications with public
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: user2Id,
    });
    expect(resultsClass.length).eq(1);
    expect(resultsClass[0].classification!.id).eq(classificationIdB2B);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: user2Id,
    });
    expect(resultsSubCat.length).eq(1);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdB2);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: user2Id,
    });
    expect(resultsCat.length).eq(1);
    expect(resultsCat[0].category!.id).eq(categoryIdB);
  });

  test("searchClassificationsWithSharedContent, filter by system, category, sub category", async () => {
    const user = await createTestUser();
    const userId = user.userId;
    const owner = await createTestUser();
    const ownerId = owner.userId;

    // create a made up classification tree
    const code = Date.now().toString();
    const word = "banana";

    const systemId = (
      await searchPossibleClassifications({ query: "FinM.A.3" })
    )[0].descriptions[0].subCategory.category.system.id;

    const systemIdOther = (
      await searchPossibleClassifications({ query: "K.CC.1" })
    )[0].descriptions[0].subCategory.category.system.id;

    const {
      categoryIdA,
      subCategoryIdA1,
      classificationIdA1A,
      classificationIdA1B,
      subCategoryIdA2,
      classificationIdA2A,
      classificationIdA2B,
      categoryIdB,
      subCategoryIdB1,
      classificationIdB1A,
      classificationIdB1B,
      subCategoryIdB2,
      classificationIdB2A,
      classificationIdB2B,
    } = await createTestClassifications({ systemId, word, code });

    // add activity 1A to classificationIdA1A, classificationIdB1A
    const { contentId: contentId1A } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentId1A,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentId1A,
      classificationId: classificationIdA1A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentId1A,
      classificationId: classificationIdB1A,
      loggedInUserId: ownerId,
    });

    // add activity 2A to classificationIdA2A, classificationIdB2A
    const { contentId: contentId2A } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentId2A,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentId2A,
      classificationId: classificationIdA2A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentId2A,
      classificationId: classificationIdB2A,
      loggedInUserId: ownerId,
    });

    // add activity 1B to classificationIdA1B, classificationIdB1B
    const { contentId: contentId1B } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentId1B,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentId1B,
      classificationId: classificationIdA1B,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentId1B,
      classificationId: classificationIdB1B,
      loggedInUserId: ownerId,
    });

    // add activity 2B to classificationIdA2B, classificationIdB2B
    const { contentId: contentId2B } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentId2B,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentId2B,
      classificationId: classificationIdA2B,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentId2B,
      classificationId: classificationIdB2B,
      loggedInUserId: ownerId,
    });

    // add activity A1 to classificationIdA1A, classificationIdA1A
    const { contentId: contentId1 } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentId1,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentId1,
      classificationId: classificationIdA1A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentId1,
      classificationId: classificationIdA1B,
      loggedInUserId: ownerId,
    });

    // add activity A2 to classificationIdA2A, classificationIdA2A
    const { contentId: contentIdA2 } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentIdA2,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdA2,
      classificationId: classificationIdA2A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdA2,
      classificationId: classificationIdA2B,
      loggedInUserId: ownerId,
    });

    // add activity B1 to classificationIdB1A, classificationIdB1A
    const { contentId: contentIdB1 } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentIdB1,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdB1,
      classificationId: classificationIdB1A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdB1,
      classificationId: classificationIdB1B,
      loggedInUserId: ownerId,
    });

    // add activity B2 to classificationIdB2A, classificationIdB2A
    const { contentId: contentIdB2 } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentIdB2,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdB2,
      classificationId: classificationIdB2A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdB2,
      classificationId: classificationIdB2B,
      loggedInUserId: ownerId,
    });

    // without filter get all eight classifications, with first determined by second query word
    let resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}A2B${code}`,
      loggedInUserId: userId,
    });
    expect(resultsClass.length).eq(8);
    expect(resultsClass[0].classification!.id).eq(classificationIdA2B);

    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}B1A${code}`,
      loggedInUserId: userId,
    });
    expect(resultsClass.length).eq(8);
    expect(resultsClass[0].classification!.id).eq(classificationIdB1A);

    // without filter get all four sub categories, with first determined by second query word
    let resultsSubCat =
      await searchClassificationSubCategoriesWithSharedContent({
        query: `${word}${code} ${word}B1${code}`,
        loggedInUserId: userId,
      });
    expect(resultsSubCat.length).eq(4);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdB1);

    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code} ${word}A2${code}`,
      loggedInUserId: userId,
    });
    expect(resultsSubCat.length).eq(4);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdA2);

    // without filter get all both categories, with order determined by second query word
    let resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code} ${word}B${code}`,
      loggedInUserId: userId,
    });
    expect(resultsCat.length).eq(2);
    expect(resultsCat[0].category!.id).eq(categoryIdB);
    expect(resultsCat[1].category!.id).eq(categoryIdA);

    // filtering by systemId doesn't change the results
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}A2A${code}`,
      loggedInUserId: userId,
      systemId,
    });
    expect(resultsClass.length).eq(8);
    expect(resultsClass[0].classification!.id).eq(classificationIdA2A);

    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code} ${word}A1${code}`,
      loggedInUserId: userId,
      systemId,
    });
    expect(resultsSubCat.length).eq(4);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdA1);

    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code} ${word}A${code}`,
      loggedInUserId: userId,
      systemId,
    });
    expect(resultsCat.length).eq(2);
    expect(resultsCat[0].category!.id).eq(categoryIdA);
    expect(resultsCat[1].category!.id).eq(categoryIdB);

    // filtering by systemIdOther filters out all results
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}A2A${code}`,
      loggedInUserId: userId,
      systemId: systemIdOther,
    });
    expect(resultsClass.length).eq(0);

    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code} ${word}A1${code}`,
      loggedInUserId: userId,
      systemId: systemIdOther,
    });
    expect(resultsSubCat.length).eq(0);

    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code} ${word}A${code}`,
      loggedInUserId: userId,
      systemId: systemIdOther,
    });
    expect(resultsCat.length).eq(0);

    // filter by category B
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}B2B${code}`,
      loggedInUserId: userId,
      categoryId: categoryIdB,
    });
    expect(resultsClass.length).eq(4);
    expect(resultsClass[0].classification!.id).eq(classificationIdB2B);
    expect(
      resultsClass
        .slice(1)
        .map((c) => c.classification!.id)
        .sort(),
    ).eqls(
      [classificationIdB1A, classificationIdB1B, classificationIdB2A].sort(),
    );

    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code} ${word}B2${code}`,
      loggedInUserId: userId,
      categoryId: categoryIdB,
    });
    expect(resultsSubCat.length).eq(2);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdB2);
    expect(resultsSubCat[1].subCategory!.id).eq(subCategoryIdB1);

    // filter by sub category A2
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}A2B${code}`,
      loggedInUserId: userId,
      subCategoryId: subCategoryIdA2,
    });
    expect(resultsClass.length).eq(2);
    expect(resultsClass[0].classification!.id).eq(classificationIdA2B);
    expect(resultsClass[1].classification!.id).eq(classificationIdA2A);
  });

  test("searchClassificationsWithSharedContent, filter by activity category", async () => {
    const user = await createTestUser();
    const userId = user.userId;
    const owner = await createTestUser();
    const ownerId = owner.userId;

    // create a made up classification tree
    const code = Date.now().toString();
    const word = "banana";

    const {
      categoryIdA,
      subCategoryIdA1,
      classificationIdA1A,
      categoryIdB,
      subCategoryIdB2,
      classificationIdB2B,
    } = await createTestClassifications({ word, code });

    // add two activities to A1A and B2B
    const { contentId: contentIdA1 } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: contentIdA2 } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: contentIdB1 } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: contentIdB2 } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentIdA1,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: contentIdA2,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: contentIdB1,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: contentIdB2,
      isPublic: true,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdA1,
      classificationId: classificationIdA1A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdA2,
      classificationId: classificationIdA1A,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdB1,
      classificationId: classificationIdB2B,
      loggedInUserId: ownerId,
    });
    await addClassification({
      contentId: contentIdB2,
      classificationId: classificationIdB2B,
      loggedInUserId: ownerId,
    });

    // add single activity category to three of the activities
    await updateCategories({
      contentId: contentIdA1,
      loggedInUserId: ownerId,
      categories: { isQuestion: true },
    });
    await updateCategories({
      contentId: contentIdA2,
      loggedInUserId: ownerId,
      categories: { isInteractive: true },
    });
    await updateCategories({
      contentId: contentIdB1,
      loggedInUserId: ownerId,
      categories: { containsVideo: true },
    });

    // without filter, get two classifications, sub categories, and categories
    let resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}B2B${code}`,
      loggedInUserId: userId,
    });
    expect(resultsClass.length).eq(2);
    expect(resultsClass[0].classification!.code).eq(`${word}B2B${code}`);
    let resultsSubCat =
      await searchClassificationSubCategoriesWithSharedContent({
        query: `${word}${code}`,
        loggedInUserId: userId,
      });
    expect(resultsSubCat.length).eq(2);
    let resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
    });
    expect(resultsCat.length).eq(2);

    // filter by isQuestion
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}B2B${code}`, // make sure filter out match hitting code
      loggedInUserId: userId,
      categories: new Set(["isQuestion"]),
    });
    expect(resultsClass.length).eq(1);
    expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion"]),
    });
    expect(resultsSubCat.length).eq(1);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdA1);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion"]),
    });
    expect(resultsCat.length).eq(1);
    expect(resultsCat[0].category!.id).eq(categoryIdA);

    // filter by isInteractive
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}B2B${code}`, // make sure filter out match hitting code
      loggedInUserId: userId,
      categories: new Set(["isInteractive"]),
    });
    expect(resultsClass.length).eq(1);
    expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isInteractive"]),
    });
    expect(resultsSubCat.length).eq(1);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdA1);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isInteractive"]),
    });
    expect(resultsCat.length).eq(1);
    expect(resultsCat[0].category!.id).eq(categoryIdA);

    // filter by containsVideo
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}A1A${code}`, // make sure filter out match hitting code
      loggedInUserId: userId,
      categories: new Set(["containsVideo"]),
    });
    expect(resultsClass.length).eq(1);
    expect(resultsClass[0].classification!.id).eq(classificationIdB2B);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["containsVideo"]),
    });
    expect(resultsSubCat.length).eq(1);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdB2);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["containsVideo"]),
    });
    expect(resultsCat.length).eq(1);
    expect(resultsCat[0].category!.id).eq(categoryIdB);

    // nothing if filter by pairs of categories
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}A1A${code}`, // make sure filter out match hitting code
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive"]),
    });
    expect(resultsClass.length).eq(0);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive"]),
    });
    expect(resultsSubCat.length).eq(0);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive"]),
    });
    expect(resultsCat.length).eq(0);

    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}A1A${code}`, // make sure filter out match hitting code
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "containsVideo"]),
    });
    expect(resultsClass.length).eq(0);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "containsVideo"]),
    });
    expect(resultsSubCat.length).eq(0);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "containsVideo"]),
    });
    expect(resultsCat.length).eq(0);

    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}A1A${code}`, // make sure filter out match hitting code
      loggedInUserId: userId,
      categories: new Set(["isInteractive", "containsVideo"]),
    });
    expect(resultsClass.length).eq(0);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isInteractive", "containsVideo"]),
    });
    expect(resultsSubCat.length).eq(0);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isInteractive", "containsVideo"]),
    });
    expect(resultsCat.length).eq(0);

    // add second category to the three activities
    await updateCategories({
      contentId: contentIdA1,
      loggedInUserId: ownerId,
      categories: { isInteractive: true },
    });
    await updateCategories({
      contentId: contentIdA2,
      loggedInUserId: ownerId,
      categories: { containsVideo: true },
    });
    await updateCategories({
      contentId: contentIdB1,
      loggedInUserId: ownerId,
      categories: { isQuestion: true },
    });

    // filter by pairs of categories again
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}B2B${code}`, // make sure filter out match hitting code
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive"]),
    });
    expect(resultsClass.length).eq(1);
    expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive"]),
    });
    expect(resultsSubCat.length).eq(1);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdA1);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive"]),
    });
    expect(resultsCat.length).eq(1);
    expect(resultsCat[0].category!.id).eq(categoryIdA);

    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}B2B${code}`, // make sure filter out match hitting code
      loggedInUserId: userId,
      categories: new Set(["isInteractive", "containsVideo"]),
    });
    expect(resultsClass.length).eq(1);
    expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isInteractive", "containsVideo"]),
    });
    expect(resultsSubCat.length).eq(1);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdA1);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isInteractive", "containsVideo"]),
    });
    expect(resultsCat.length).eq(1);
    expect(resultsCat[0].category!.id).eq(categoryIdA);

    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}A1A${code}`, // make sure filter out match hitting code
      loggedInUserId: userId,
      categories: new Set(["containsVideo", "isQuestion"]),
    });
    expect(resultsClass.length).eq(1);
    expect(resultsClass[0].classification!.id).eq(classificationIdB2B);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["containsVideo", "isQuestion"]),
    });
    expect(resultsSubCat.length).eq(1);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdB2);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["containsVideo", "isQuestion"]),
    });
    expect(resultsCat.length).eq(1);
    expect(resultsCat[0].category!.id).eq(categoryIdB);

    // filter by all three categories
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code} ${word}A1A${code}`, // make sure filter out match hitting code
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
    });
    expect(resultsClass.length).eq(0);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
    });
    expect(resultsSubCat.length).eq(0);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      categories: new Set(["isQuestion", "isInteractive", "containsVideo"]),
    });
    expect(resultsCat.length).eq(0);
  });

  test("searchClassificationsWithSharedContent, filter by owner", async () => {
    const user = await createTestUser();
    const userId = user.userId;
    const { userId: owner1Id } = await createTestUser();
    const { userId: owner2Id } = await createTestUser();
    const { userId: owner3Id } = await createTestUser();

    // create a made up classification tree
    const code = Date.now().toString();
    const word = "banana";

    const {
      categoryIdA,
      subCategoryIdA1,
      classificationIdA1A,
      categoryIdB,
      subCategoryIdB2,
      classificationIdB2B,
    } = await createTestClassifications({ word, code });

    // add two activities to A1A and B2B
    const { contentId: contentIdA1 } = await createContent({
      loggedInUserId: owner1Id,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: contentIdA2 } = await createContent({
      loggedInUserId: owner2Id,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: contentIdB1 } = await createContent({
      loggedInUserId: owner2Id,
      contentType: "singleDoc",
      parentId: null,
    });
    const { contentId: contentIdB2 } = await createContent({
      loggedInUserId: owner3Id,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentIdA1,
      isPublic: true,
      loggedInUserId: owner1Id,
    });
    await setContentIsPublic({
      contentId: contentIdA2,
      isPublic: true,
      loggedInUserId: owner2Id,
    });
    await setContentIsPublic({
      contentId: contentIdB1,
      isPublic: true,
      loggedInUserId: owner2Id,
    });
    await setContentIsPublic({
      contentId: contentIdB2,
      isPublic: true,
      loggedInUserId: owner3Id,
    });
    await addClassification({
      contentId: contentIdA1,
      classificationId: classificationIdA1A,
      loggedInUserId: owner1Id,
    });
    await addClassification({
      contentId: contentIdA2,
      classificationId: classificationIdA1A,
      loggedInUserId: owner2Id,
    });
    await addClassification({
      contentId: contentIdB1,
      classificationId: classificationIdB2B,
      loggedInUserId: owner2Id,
    });
    await addClassification({
      contentId: contentIdB2,
      classificationId: classificationIdB2B,
      loggedInUserId: owner3Id,
    });

    // without filter, get two classifications, sub categories, and categories
    let resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
    });
    expect(resultsClass.length).eq(2);
    let resultsSubCat =
      await searchClassificationSubCategoriesWithSharedContent({
        query: `${word}${code}`,
        loggedInUserId: userId,
      });
    expect(resultsSubCat.length).eq(2);
    let resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
    });
    expect(resultsCat.length).eq(2);

    // filter by owner 1
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      ownerId: owner1Id,
    });
    expect(resultsClass.length).eq(1);
    expect(resultsClass[0].classification!.id).eq(classificationIdA1A);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      ownerId: owner1Id,
    });
    expect(resultsSubCat.length).eq(1);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdA1);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      ownerId: owner1Id,
    });
    expect(resultsCat.length).eq(1);
    expect(resultsCat[0].category!.id).eq(categoryIdA);

    // filter by owner 2
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      ownerId: owner2Id,
    });
    expect(resultsClass.length).eq(2);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      ownerId: owner2Id,
    });
    expect(resultsSubCat.length).eq(2);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      ownerId: owner2Id,
    });
    expect(resultsCat.length).eq(2);

    // filter by owner 3
    resultsClass = await searchClassificationsWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      ownerId: owner3Id,
    });
    expect(resultsClass.length).eq(1);
    expect(resultsClass[0].classification!.id).eq(classificationIdB2B);
    resultsSubCat = await searchClassificationSubCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      ownerId: owner3Id,
    });
    expect(resultsSubCat.length).eq(1);
    expect(resultsSubCat[0].subCategory!.id).eq(subCategoryIdB2);
    resultsCat = await searchClassificationCategoriesWithSharedContent({
      query: `${word}${code}`,
      loggedInUserId: userId,
      ownerId: owner3Id,
    });
    expect(resultsCat.length).eq(1);
    expect(resultsCat[0].category!.id).eq(categoryIdB);
  });
});

describe("searchMyContent Tests", () => {
  test(
    "search my folder content searches all subfolders",
    { timeout: 30000 },
    async () => {
      const owner = await createTestUser();
      const ownerId = owner.userId;

      // Folder structure
      // The Base folder
      // - The first topic
      //   - First activity
      //   - Deleted activity (deleted)
      //   - Subtopic
      //     - First piece (deleted)
      //     - Second piece
      // - Activity 2
      // - Activity 3 (deleted)
      // Activity gone (deleted)
      // Activity root, first

      const [
        baseFolderId,
        folder1Id,
        activity1aId,
        activity1bId,
        folder1cId,
        activity1c1Id,
        _activity1c2Id,
        activity2Id,
        activity3Id,
        activityGoneId,
        activityRootId,
      ] = await setupTestContent(ownerId, {
        "The Base Folder": fold({
          "The first topic": fold({
            "First activity": doc(""),
            "Deleted activity": doc(""),
            Subtopic: fold({ "First piece": doc(""), "Second piece": doc("") }),
          }),
          "Activity 2": doc(""),
          "Activity 3": doc(""),
        }),
        "Activity gone": doc(""),
        "Activity root, first": doc(""),
      });

      await deleteContent({ contentId: activity1bId, loggedInUserId: ownerId });

      await deleteContent({
        contentId: activity1c1Id,
        loggedInUserId: ownerId,
      });

      await deleteContent({ contentId: activity3Id, loggedInUserId: ownerId });

      await deleteContent({
        contentId: activityGoneId,
        loggedInUserId: ownerId,
      });

      let searchResults = await searchMyContent({
        ownerId,
        parentId: null,
        loggedInUserId: ownerId,
        query: "first",
      });
      if (searchResults.notMe) {
        throw Error("shouldn't happen");
      }
      expect(searchResults.parent).eq(null);
      let content = searchResults.content;
      expect(content.length).eq(3);
      expect(
        content
          .sort((a, b) => compareUUID(a.contentId, b.contentId))
          .map((c) => ({
            id: fromUUID(c.contentId),
            parentId: c.parent ? fromUUID(c.parent.contentId) : null,
          })),
      ).eqls([
        { id: fromUUID(folder1Id), parentId: fromUUID(baseFolderId) },
        { id: fromUUID(activity1aId), parentId: fromUUID(folder1Id) },
        { id: fromUUID(activityRootId), parentId: null },
      ]);

      searchResults = await searchMyContent({
        ownerId,
        parentId: baseFolderId,
        loggedInUserId: ownerId,
        query: "first",
      });
      if (searchResults.notMe) {
        throw Error("shouldn't happen");
      }
      expect(fromUUID(searchResults.parent!.contentId)).eq(
        fromUUID(baseFolderId),
      );
      content = searchResults.content;
      expect(content.length).eq(2);
      expect(
        content
          .sort((a, b) => compareUUID(a.contentId, b.contentId))
          .map((c) => ({
            id: fromUUID(c.contentId),
            parentId: c.parent ? fromUUID(c.parent.contentId) : null,
          })),
      ).eqls([
        { id: fromUUID(folder1Id), parentId: fromUUID(baseFolderId) },
        { id: fromUUID(activity1aId), parentId: fromUUID(folder1Id) },
      ]);

      searchResults = await searchMyContent({
        ownerId,
        parentId: folder1Id,
        loggedInUserId: ownerId,
        query: "first",
      });
      if (searchResults.notMe) {
        throw Error("shouldn't happen");
      }
      expect(fromUUID(searchResults.parent!.contentId)).eq(fromUUID(folder1Id));
      content = searchResults.content;
      expect(content.length).eq(1);
      expect(
        content
          .sort((a, b) => compareUUID(a.contentId, b.contentId))
          .map((c) => ({
            id: fromUUID(c.contentId),
            parentId: c.parent ? fromUUID(c.parent.contentId) : null,
          })),
      ).eqls([{ id: fromUUID(activity1aId), parentId: fromUUID(folder1Id) }]);

      searchResults = await searchMyContent({
        ownerId,
        parentId: folder1cId,
        loggedInUserId: ownerId,
        query: "first",
      });
      if (searchResults.notMe) {
        throw Error("shouldn't happen");
      }
      expect(fromUUID(searchResults.parent!.contentId)).eq(
        fromUUID(folder1cId),
      );
      content = searchResults.content;
      expect(content.length).eq(0);

      searchResults = await searchMyContent({
        ownerId,
        parentId: null,
        loggedInUserId: ownerId,
        query: "activity",
      });
      if (searchResults.notMe) {
        throw Error("shouldn't happen");
      }
      expect(searchResults.parent).eq(null);
      content = searchResults.content;
      expect(content.length).eq(3);
      expect(
        content
          .sort((a, b) => compareUUID(a.contentId, b.contentId))
          .map((c) => ({
            id: fromUUID(c.contentId),
            parentId: c.parent ? fromUUID(c.parent.contentId) : null,
          })),
      ).eqls([
        { id: fromUUID(activity1aId), parentId: fromUUID(folder1Id) },
        { id: fromUUID(activity2Id), parentId: fromUUID(baseFolderId) },
        { id: fromUUID(activityRootId), parentId: null },
      ]);

      searchResults = await searchMyContent({
        ownerId,
        parentId: baseFolderId,
        loggedInUserId: ownerId,
        query: "activity",
      });
      if (searchResults.notMe) {
        throw Error("shouldn't happen");
      }
      expect(fromUUID(searchResults.parent!.contentId)).eq(
        fromUUID(baseFolderId),
      );
      content = searchResults.content;
      expect(content.length).eq(2);
      expect(
        content
          .sort((a, b) => compareUUID(a.contentId, b.contentId))
          .map((c) => ({
            id: fromUUID(c.contentId),
            parentId: c.parent ? fromUUID(c.parent.contentId) : null,
          })),
      ).eqls([
        { id: fromUUID(activity1aId), parentId: fromUUID(folder1Id) },
        { id: fromUUID(activity2Id), parentId: fromUUID(baseFolderId) },
      ]);

      searchResults = await searchMyContent({
        ownerId,
        parentId: folder1Id,
        loggedInUserId: ownerId,
        query: "activity",
      });
      if (searchResults.notMe) {
        throw Error("shouldn't happen");
      }
      expect(fromUUID(searchResults.parent!.contentId)).eq(fromUUID(folder1Id));
      content = searchResults.content;
      expect(content.length).eq(1);
      expect(
        content
          .sort((a, b) => compareUUID(a.contentId, b.contentId))
          .map((c) => ({
            id: fromUUID(c.contentId),
            parentId: c.parent ? fromUUID(c.parent.contentId) : null,
          })),
      ).eqls([{ id: fromUUID(activity1aId), parentId: fromUUID(folder1Id) }]);

      searchResults = await searchMyContent({
        ownerId,
        parentId: folder1cId,
        loggedInUserId: ownerId,
        query: "activity",
      });
      if (searchResults.notMe) {
        throw Error("shouldn't happen");
      }
      expect(fromUUID(searchResults.parent!.contentId)).eq(
        fromUUID(folder1cId),
      );
      content = searchResults.content;
      expect(content.length).eq(0);
    },
  );

  test("searchMyContent, document source matches", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;
    const { contentId: contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });
    await updateContent({
      contentId: contentId,
      source: "bananas",
      loggedInUserId: ownerId,
    });
    await setContentIsPublic({
      contentId: contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    // apple doesn't hit
    let searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "apple",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    let content = searchResults.content;
    expect(content.length).eq(0);

    // first part of a word hits
    searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "bana",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);

    // full word hits
    searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "bananas",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);
  });

  test("searchMyContent, classification matches", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;
    const { contentId: contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });

    let searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "K.CC.1 comMMon cOREe",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    let content = searchResults.content;
    expect(content.length).eq(0);

    const classifyId = (
      await searchPossibleClassifications({ query: "K.CC.1 common core" })
    )[0].id;

    await addClassification({
      contentId: contentId,
      classificationId: classifyId,
      loggedInUserId: ownerId,
    });
    // With code
    searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "K.C",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);

    // With both
    searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "common C.1",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);

    // With category
    searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "kinder",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);

    // With subcategory
    searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "cardinality",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);

    // With description
    searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "tens",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);
  });

  test("searchMyContent in folder, classification matches", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const { contentId: folderId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: null,
    });
    const { contentId: contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: folderId,
    });

    let searchResults = await searchMyContent({
      ownerId,
      parentId: folderId,
      loggedInUserId: ownerId,
      query: "K.CC.1 comMMon cOREe",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    let content = searchResults.content;
    expect(content.length).eq(0);

    const classifyId = (
      await searchPossibleClassifications({ query: "K.CC.1 common core" })
    )[0].id;

    await addClassification({
      contentId: contentId,
      classificationId: classifyId,
      loggedInUserId: ownerId,
    });
    // With code
    searchResults = await searchMyContent({
      ownerId,
      parentId: folderId,
      loggedInUserId: ownerId,
      query: "K.C",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);

    // With both
    searchResults = await searchMyContent({
      ownerId,
      parentId: folderId,
      loggedInUserId: ownerId,
      query: "common C.1",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);

    // With category
    searchResults = await searchMyContent({
      ownerId,
      parentId: folderId,
      loggedInUserId: ownerId,
      query: "kinder",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);

    // With subcategory
    searchResults = await searchMyContent({
      ownerId,
      parentId: folderId,
      loggedInUserId: ownerId,
      query: "cardinality",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);

    // With description
    searchResults = await searchMyContent({
      ownerId,
      parentId: folderId,
      loggedInUserId: ownerId,
      query: "tens",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    content = searchResults.content;
    expect(content.length).eq(1);
  });

  test("searchMyContent, handle tags in search", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;
    const { contentId: contentId } = await createContent({
      loggedInUserId: ownerId,
      contentType: "singleDoc",
      parentId: null,
    });

    await updateContent({
      contentId: contentId,
      source: "point",
      loggedInUserId: ownerId,
    });

    const searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "<point>",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    const content = searchResults.content;
    expect(content.length).eq(1);
  });

  test("hits for problems return the enclosing problem set", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const [psetId] = await setupTestContent(ownerId, {
      "Problem Set": pset({
        "Problem 1": doc("Some content about bananas"),
        "Problem 2": doc("Some content about apples"),
      }),
    });

    let searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "bananas",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    const content = searchResults.content;
    expect(content.length).eq(1);
    expect(content[0].contentId).eqls(psetId);

    searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "problem",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(searchResults.content.length).eq(1);
    expect(searchResults.content[0].contentId).eqls(psetId);
  });

  test("problem sets ordered by more relevant problem", async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const [psetAId, _prob1Id, _prob2Id, psetBId] = await setupTestContent(
      ownerId,
      {
        "Problem Set A": pset({
          "Problem 1": doc("Some content about bananas"),
          "Problem 2": doc("Some content about apples"),
        }),
        "Problem Set B": pset({
          "Problem 1": doc("Some content about cherries"),
          "Problem 2": doc("Some content about bananas and apples"),
        }),
      },
    );

    const searchResults = await searchMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
      query: "bananas apples",
    });
    if (searchResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(searchResults.content.length).to.eq(2);

    expect(searchResults.content[0].contentId).eqls(psetBId);
    expect(searchResults.content[1].contentId).eqls(psetAId);
  });
});
