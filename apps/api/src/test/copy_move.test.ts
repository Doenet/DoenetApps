import { describe, expect, test } from "vitest";
import {
  createTestAnonymousUser,
  createTestUser,
  doc,
  fold,
  pset,
  setupTestContent,
} from "./utils";
import {
  createContent,
  getContentDescription,
  updateContent,
} from "../query/activity";
import {
  copyContent,
  createContentCopyInChildren,
  getMoveCopyContentData,
  moveContent,
} from "../query/copy_move";
import { setContentIsPublic } from "../query/share";
import { getMyContent } from "../query/content_list";
import { getContent } from "../query/activity_edit_view";
import { isEqualUUID } from "../utils/uuid";
import { ContentType } from "@prisma/client";
import { createAssignment } from "../query/assign";
import { DateTime } from "luxon";
import { getAssignmentNonRootIds } from "./testQueries";
import { markFolderAsCourse } from "../query/course";
import { createStudentHandleAccounts } from "../query/user";
import { createNewAttempt } from "../query/scores";

test("copy folder", async () => {
  const { userId: ownerId } = await createTestUser();
  const { userId: otherUserId } = await createTestUser();

  const { contentId: folder0Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "folder",
    parentId: null,
  });
  await updateContent({
    contentId: folder0Id,
    loggedInUserId: ownerId,
    name: "Base folder",
  });

  const { contentId: activity1Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: activity1Id,
    loggedInUserId: ownerId,
    name: "Activity 1",
  });
  const { contentId: folder1Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "folder",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: folder1Id,
    loggedInUserId: ownerId,
    name: "Folder 1",
  });

  const { contentId: activity2Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder1Id,
  });
  await updateContent({
    contentId: activity2Id,
    loggedInUserId: ownerId,
    name: "Activity 2",
  });
  const { contentId: folder2Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "folder",
    parentId: folder1Id,
  });
  await updateContent({
    contentId: folder2Id,
    loggedInUserId: ownerId,
    name: "Folder 2",
  });

  const { contentId: activity3Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder2Id,
  });
  await updateContent({
    contentId: activity3Id,
    loggedInUserId: ownerId,
    name: "Activity 3",
  });
  const { contentId: folder3Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "folder",
    parentId: folder2Id,
  });
  await updateContent({
    contentId: folder3Id,
    loggedInUserId: ownerId,
    name: "Folder 3",
  });

  // other user cannot copy before it is shared
  const { contentId: folderOther } = await createContent({
    loggedInUserId: otherUserId,
    contentType: "folder",
    parentId: null,
  });
  await expect(
    copyContent({
      contentIds: [folder0Id],
      loggedInUserId: otherUserId,
      parentId: folderOther,
    }),
  ).rejects.toThrow("not found");

  await setContentIsPublic({
    contentId: folder0Id,
    loggedInUserId: ownerId,
    isPublic: true,
  });

  // owner and other user can copy
  for (const userId of [ownerId, otherUserId]) {
    const { contentId: folderNewId } = await createContent({
      loggedInUserId: userId,
      contentType: "folder",
      parentId: null,
    });

    const result = await copyContent({
      contentIds: [folder0Id],
      loggedInUserId: userId,
      parentId: folderNewId,
    });

    expect(result.newContentIds.length).eq(1);

    let folderResults = await getMyContent({
      parentId: folderNewId,
      ownerId: userId,
      loggedInUserId: userId,
    });
    if (folderResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(folderResults.content.length).eq(1);
    expect(folderResults.content[0].name).eq("Base folder");

    const folderNew0Id = folderResults.content[0].contentId;

    folderResults = await getMyContent({
      parentId: folderNew0Id,
      ownerId: userId,
      loggedInUserId: userId,
    });
    if (folderResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(folderResults.content.length).eq(2);
    expect(folderResults.content[0].name).eq("Activity 1");
    expect(folderResults.content[1].name).eq("Folder 1");

    const folderNew1Id = folderResults.content[1].contentId;
    folderResults = await getMyContent({
      parentId: folderNew1Id,
      ownerId: userId,
      loggedInUserId: userId,
    });
    if (folderResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(folderResults.content.length).eq(2);
    expect(folderResults.content[0].name).eq("Activity 2");
    expect(folderResults.content[1].name).eq("Folder 2");

    const folderNew2Id = folderResults.content[1].contentId;
    folderResults = await getMyContent({
      parentId: folderNew2Id,
      ownerId: userId,
      loggedInUserId: userId,
    });
    if (folderResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(folderResults.content.length).eq(2);
    expect(folderResults.content[0].name).eq("Activity 3");
    expect(folderResults.content[1].name).eq("Folder 3");
  }
});

test("copy folder 2", async () => {
  const { userId: ownerId } = await createTestUser();
  const { userId: otherUserId } = await createTestUser();

  const { contentId: folder0Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "folder",
    parentId: null,
  });
  await updateContent({
    contentId: folder0Id,
    loggedInUserId: ownerId,
    name: "Base folder",
  });

  const { contentId: activity1Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: activity1Id,
    loggedInUserId: ownerId,
    name: "Activity 1",
  });
  const { contentId: sequence1Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: sequence1Id,
    loggedInUserId: ownerId,
    name: "Problem Set 1",
  });

  const { contentId: activity2Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: sequence1Id,
  });
  await updateContent({
    contentId: activity2Id,
    loggedInUserId: ownerId,
    name: "Activity 2",
  });
  const { contentId: select1Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "select",
    parentId: sequence1Id,
  });
  await updateContent({
    contentId: select1Id,
    loggedInUserId: ownerId,
    name: "Question Bank 1",
  });

  const { contentId: activity3Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: select1Id,
  });
  await updateContent({
    contentId: activity3Id,
    loggedInUserId: ownerId,
    name: "Activity 3",
  });
  const { contentId: activity4Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: activity4Id,
    loggedInUserId: ownerId,
    name: "Activity 4",
  });
  const { contentId: select2Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "select",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: select2Id,
    loggedInUserId: ownerId,
    name: "Question Bank 2",
  });
  const { contentId: activity5Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: select2Id,
  });
  await updateContent({
    contentId: activity5Id,
    loggedInUserId: ownerId,
    name: "Activity 5",
  });

  // other user cannot copy before it is shared
  const { contentId: folderOther } = await createContent({
    loggedInUserId: otherUserId,
    contentType: "folder",
    parentId: null,
  });
  await updateContent({
    contentId: folderOther,
    loggedInUserId: otherUserId,
    name: "Placeholder folder",
  });
  await expect(
    copyContent({
      contentIds: [folder0Id],
      loggedInUserId: otherUserId,
      parentId: null,
      prependCopy: true,
    }),
  ).rejects.toThrow("not found");

  await setContentIsPublic({
    contentId: folder0Id,
    loggedInUserId: ownerId,
    isPublic: true,
  });

  // owner and other user can copy
  for (const userId of [ownerId, otherUserId]) {
    const result = await copyContent({
      contentIds: [folder0Id],
      loggedInUserId: userId,
      parentId: null,
      prependCopy: true,
    });

    expect(result.newContentIds.length).eq(1);

    let folderResults = await getMyContent({
      parentId: null,
      ownerId: userId,
      loggedInUserId: userId,
    });
    if (folderResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(folderResults.content.length).eq(2);

    expect(folderResults.content[0].name).eq(
      isEqualUUID(userId, ownerId) ? "Base folder" : "Placeholder folder",
    );
    expect(folderResults.content[1].name).eq("Copy of Base folder");

    const folderNew0Id = folderResults.content[1].contentId;

    folderResults = await getMyContent({
      parentId: folderNew0Id,
      ownerId: userId,
      loggedInUserId: userId,
    });
    if (folderResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(folderResults.content.length).eq(4);
    expect(folderResults.content[0].name).eq("Activity 1");
    expect(folderResults.content[1].name).eq("Problem Set 1");
    expect(folderResults.content[2].name).eq("Activity 4");
    expect(folderResults.content[3].name).eq("Question Bank 2");

    const sequenceNewId = folderResults.content[1].contentId;
    const selectNew2Id = folderResults.content[3].contentId;

    folderResults = await getMyContent({
      parentId: sequenceNewId,
      ownerId: userId,
      loggedInUserId: userId,
    });
    if (folderResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(folderResults.content.length).eq(2);
    expect(folderResults.content[0].name).eq("Activity 2");
    expect(folderResults.content[1].name).eq("Question Bank 1");

    const selectNew1Id = folderResults.content[1].contentId;
    folderResults = await getMyContent({
      parentId: selectNew1Id,
      ownerId: userId,
      loggedInUserId: userId,
    });
    if (folderResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(folderResults.content.length).eq(1);
    expect(folderResults.content[0].name).eq("Activity 3");

    folderResults = await getMyContent({
      parentId: selectNew2Id,
      ownerId: userId,
      loggedInUserId: userId,
    });
    if (folderResults.notMe) {
      throw Error("shouldn't happen");
    }
    expect(folderResults.content.length).eq(1);
    expect(folderResults.content[0].name).eq("Activity 5");
  }
});

test("copy problem set", async () => {
  const { userId: ownerId } = await createTestUser();

  const { contentId: folder0Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });
  await updateContent({
    contentId: folder0Id,
    loggedInUserId: ownerId,
    name: "Problem set",
  });

  const { contentId: activity1Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: activity1Id,
    loggedInUserId: ownerId,
    name: "Question 1",
  });

  const { contentId: folder1Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "select",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: folder1Id,
    loggedInUserId: ownerId,
    name: "Question bank 2",
  });

  const { contentId: activity2AId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder1Id,
  });
  await updateContent({
    contentId: activity2AId,
    loggedInUserId: ownerId,
    name: "Question 2A",
  });
  const { contentId: activity2BId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder1Id,
  });
  await updateContent({
    contentId: activity2BId,
    loggedInUserId: ownerId,
    name: "Question 2B",
  });

  const { contentId: folder2Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "select",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: folder2Id,
    loggedInUserId: ownerId,
    name: "Question bank 3",
  });

  const { contentId: activity3AId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder2Id,
  });
  await updateContent({
    contentId: activity3AId,
    loggedInUserId: ownerId,
    name: "Question 3A",
  });
  const { contentId: activity3BId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder2Id,
  });
  await updateContent({
    contentId: activity3BId,
    loggedInUserId: ownerId,
    name: "Question 3B",
  });

  // copy problem set into a new folder
  const { contentId: folderNewBaseId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "folder",
    parentId: null,
  });

  const result = await copyContent({
    contentIds: [folder0Id],
    loggedInUserId: ownerId,
    parentId: folderNewBaseId,
  });

  expect(result.newContentIds.length).eq(1);

  let folderResults = await getMyContent({
    ownerId,
    parentId: folderNewBaseId,
    loggedInUserId: ownerId,
  });
  if (folderResults.notMe) {
    throw Error("shouldn't happen");
  }
  expect(folderResults.content.length).eq(1);
  expect(folderResults.content[0].name).eq("Problem set");

  const folderNew0Id = folderResults.content[0].contentId;

  folderResults = await getMyContent({
    ownerId,
    parentId: folderNew0Id,
    loggedInUserId: ownerId,
  });
  if (folderResults.notMe) {
    throw Error("shouldn't happen");
  }
  expect(folderResults.content.length).eq(3);
  expect(folderResults.content[0].name).eq("Question 1");
  expect(folderResults.content[1].name).eq("Question bank 2");
  expect(folderResults.content[2].name).eq("Question bank 3");

  let folderNewQB2Id = folderResults.content[1].contentId;
  let folderNewQB3Id = folderResults.content[2].contentId;

  folderResults = await getMyContent({
    ownerId,
    parentId: folderNewQB2Id,
    loggedInUserId: ownerId,
  });
  if (folderResults.notMe) {
    throw Error("shouldn't happen");
  }
  expect(folderResults.content.length).eq(2);
  expect(folderResults.content[0].name).eq("Question 2A");
  expect(folderResults.content[1].name).eq("Question 2B");

  folderResults = await getMyContent({
    ownerId,
    parentId: folderNewQB3Id,
    loggedInUserId: ownerId,
  });
  if (folderResults.notMe) {
    throw Error("shouldn't happen");
  }
  expect(folderResults.content.length).eq(2);
  expect(folderResults.content[0].name).eq("Question 3A");
  expect(folderResults.content[1].name).eq("Question 3B");

  // Copy problem set into a new problem set
  // Don't get problem set copied, just its children Question 1 and the two Question banks
  const { contentId: folderNewProblemSetId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });

  const result2 = await copyContent({
    contentIds: [folder0Id],
    loggedInUserId: ownerId,
    parentId: folderNewProblemSetId,
  });
  expect(result2.newContentIds.length).eq(3);

  folderResults = await getMyContent({
    ownerId,
    parentId: folderNewProblemSetId,
    loggedInUserId: ownerId,
  });
  if (folderResults.notMe) {
    throw Error("shouldn't happen");
  }
  expect(folderResults.content.length).eq(3);
  expect(folderResults.content[0].name).eq("Question 1");
  expect(folderResults.content[1].name).eq("Question bank 2");
  expect(folderResults.content[2].name).eq("Question bank 3");

  folderNewQB2Id = folderResults.content[1].contentId;
  folderNewQB3Id = folderResults.content[2].contentId;

  folderResults = await getMyContent({
    ownerId,
    parentId: folderNewQB2Id,
    loggedInUserId: ownerId,
  });
  if (folderResults.notMe) {
    throw Error("shouldn't happen");
  }
  expect(folderResults.content.length).eq(2);
  expect(folderResults.content[0].name).eq("Question 2A");
  expect(folderResults.content[1].name).eq("Question 2B");

  folderResults = await getMyContent({
    ownerId,
    parentId: folderNewQB3Id,
    loggedInUserId: ownerId,
  });
  if (folderResults.notMe) {
    throw Error("shouldn't happen");
  }
  expect(folderResults.content.length).eq(2);
  expect(folderResults.content[0].name).eq("Question 3A");
  expect(folderResults.content[1].name).eq("Question 3B");

  // Copy problem set into a new question bank
  // Don't get problem set or question bank copied, just its descendants, the questions
  const { contentId: folderNewQuestionBankId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "select",
    parentId: null,
  });

  const result3 = await copyContent({
    contentIds: [folder0Id],
    loggedInUserId: ownerId,
    parentId: folderNewQuestionBankId,
  });
  expect(result3.newContentIds.length).eq(5);

  folderResults = await getMyContent({
    ownerId,
    parentId: folderNewQuestionBankId,
    loggedInUserId: ownerId,
  });
  if (folderResults.notMe) {
    throw Error("shouldn't happen");
  }
  expect(folderResults.content.length).eq(5);
  expect(folderResults.content[0].name).eq("Question 1");
  expect(folderResults.content[1].name).eq("Question 2A");
  expect(folderResults.content[2].name).eq("Question 2B");
  expect(folderResults.content[3].name).eq("Question 3A");
  expect(folderResults.content[4].name).eq("Question 3B");
});

test("create content copy in children", async () => {
  const { userId: ownerId } = await createTestUser();

  const { contentId: folder0Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });
  await updateContent({
    contentId: folder0Id,
    loggedInUserId: ownerId,
    name: "Problem set",
  });

  const { contentId: activity1Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: activity1Id,
    loggedInUserId: ownerId,
    name: "Question 1",
  });

  const { contentId: folder1Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "select",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: folder1Id,
    loggedInUserId: ownerId,
    name: "Question bank 2",
  });

  const { contentId: activity2AId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder1Id,
  });
  await updateContent({
    contentId: activity2AId,
    loggedInUserId: ownerId,
    name: "Question 2A",
  });
  const { contentId: activity2BId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder1Id,
  });
  await updateContent({
    contentId: activity2BId,
    loggedInUserId: ownerId,
    name: "Question 2B",
  });

  const { contentId: folder2Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "select",
    parentId: folder0Id,
  });
  await updateContent({
    contentId: folder2Id,
    loggedInUserId: ownerId,
    name: "Question bank 3",
  });

  const { contentId: activity3AId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder2Id,
  });
  await updateContent({
    contentId: activity3AId,
    loggedInUserId: ownerId,
    name: "Question 3A",
  });
  const { contentId: activity3BId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folder2Id,
  });
  await updateContent({
    contentId: activity3BId,
    loggedInUserId: ownerId,
    name: "Question 3B",
  });

  // copy children of problem set into a new problem set
  let results = await createContentCopyInChildren({
    loggedInUserId: ownerId,
    childSourceContentIds: [activity1Id, folder1Id, folder2Id],
    contentType: "sequence",
    parentId: null,
  });

  let newActivity = await getContent({
    contentId: results.newContentId,
    loggedInUserId: ownerId,
  });
  expect(newActivity.parent).eqls(null);
  expect(results.newContentName).eq("Untitled Problem Set");
  expect(results.newChildContentIds.length).eq(3);

  if (newActivity.type !== "sequence") {
    throw Error("shouldn't happen");
  }

  expect(newActivity.children.length).eq(3);
  expect(newActivity.children[0].name).eq("Question 1");
  expect(newActivity.children[1].name).eq("Question bank 2");
  expect(newActivity.children[2].name).eq("Question bank 3");

  // copy children of problem set into a new question bank
  // only the documents are copied
  results = await createContentCopyInChildren({
    loggedInUserId: ownerId,
    childSourceContentIds: [activity1Id, folder1Id, folder2Id],
    contentType: "select",
    parentId: null,
  });

  newActivity = await getContent({
    contentId: results.newContentId,
    loggedInUserId: ownerId,
  });
  expect(newActivity.parent).eqls(null);
  expect(results.newContentName).eq("Untitled Question Bank");
  expect(results.newChildContentIds.length).eq(5);

  if (newActivity.type !== "select") {
    throw Error("shouldn't happen");
  }

  expect(newActivity.children.length).eq(5);
  expect(newActivity.children[0].name).eq("Question 1");
  expect(newActivity.children[1].name).eq("Question 2A");
  expect(newActivity.children[2].name).eq("Question 2B");
  expect(newActivity.children[3].name).eq("Question 3A");
  expect(newActivity.children[4].name).eq("Question 3B");
});

test("cannot move out of assigned problem set", async () => {
  const { userId: ownerId } = await createTestUser();
  const [problemSetId, _doc1Id] = await setupTestContent(ownerId, {
    "problem set 1": pset({
      "doc 1": doc(""),
    }),
  });
  const { assignmentId } = await createAssignment({
    contentId: problemSetId,
    loggedInUserId: ownerId,
    destinationParentId: null,
    closedOn: DateTime.now(),
  });
  // cannot move doc 1 out of assignment
  const docAssignmentId = (await getAssignmentNonRootIds(assignmentId))[0];

  await expect(
    moveContent({
      contentId: docAssignmentId,
      loggedInUserId: ownerId,
      changeParentIdTo: null,
      desiredPosition: 0,
    }),
  ).rejects.toThrow("Cannot move content");
});

test("can copy out of assigned problem set", async () => {
  const { userId: ownerId } = await createTestUser();
  const [problemSetId, _doc1Id] = await setupTestContent(ownerId, {
    "problem set 1": pset({
      "doc 1": doc(""),
    }),
  });
  const { assignmentId } = await createAssignment({
    contentId: problemSetId,
    loggedInUserId: ownerId,
    destinationParentId: null,
    closedOn: DateTime.now(),
  });

  // can copy doc 1 out of assignment
  const docAssignmentId = (await getAssignmentNonRootIds(assignmentId))[0];
  const { newContentIds } = await copyContent({
    contentIds: [docAssignmentId],
    loggedInUserId: ownerId,
    parentId: null,
  });
  expect(newContentIds.length).toBe(1);

  const allContent = await getMyContent({
    loggedInUserId: ownerId,
    ownerId: ownerId,
    parentId: null,
  });

  if (allContent.notMe) {
    throw Error("shouldn't happen");
  }

  expect(allContent.content.length).toBe(3);
  expect(allContent.content[2].contentId).toEqual(newContentIds[0]);
});

test("cannot move into assigned problem set", async () => {
  const { userId: ownerId } = await createTestUser();
  const [problemSetId, doc1Id] = await setupTestContent(ownerId, {
    "problem set 1": pset({}),
    "doc 1": doc(" "),
  });
  const { assignmentId } = await createAssignment({
    contentId: problemSetId,
    loggedInUserId: ownerId,
    destinationParentId: null,
    closedOn: DateTime.now(),
  });

  // cannot move doc 1 into assignment
  await expect(
    moveContent({
      contentId: doc1Id,
      loggedInUserId: ownerId,
      changeParentIdTo: assignmentId,
      desiredPosition: 0,
    }),
  ).rejects.toThrow("Cannot move content into an assigned activity");
});

test("cannot copy into assigned problem set", async () => {
  const { userId: ownerId } = await createTestUser();
  const [problemSetId, doc1Id] = await setupTestContent(ownerId, {
    "problem set 1": pset({}),
    "doc 1": doc(" "),
  });
  const { assignmentId } = await createAssignment({
    contentId: problemSetId,
    loggedInUserId: ownerId,
    destinationParentId: null,
    closedOn: DateTime.now(),
  });

  // cannot copy doc 1 into assignment
  await expect(
    copyContent({
      contentIds: [doc1Id],
      loggedInUserId: ownerId,
      parentId: assignmentId,
    }),
  ).rejects.toThrow("Cannot copy content into an assigned activity");
});

test("MoveCopyContent does not allow singleDoc` as parent type", async () => {
  const { userId: loggedInUserId } = await createTestUser();

  await expect(
    getMoveCopyContentData({
      parentId: null,
      allowedParentTypes: ["folder", "singleDoc"],
      loggedInUserId,
    }),
  ).rejects.toThrowError("parent type");
});

test("MoveCopyContent has correct canOpen flags", async () => {
  const { userId: loggedInUserId } = await createTestUser();

  async function create(
    name: string,
    type: ContentType,
    parentId: Uint8Array | null = null,
    makePublic: boolean = false,
  ) {
    const { contentId } = await createContent({
      loggedInUserId: loggedInUserId,
      contentType: type,
      name,
      parentId,
    });
    if (makePublic) {
      await setContentIsPublic({
        contentId,
        isPublic: true,
        loggedInUserId: loggedInUserId,
      });
    }
    return contentId;
  }

  function expectContentsMatch(
    contents: { name: string; canOpen: boolean }[],
    expectedNames: string[],
    expectedOpen: boolean[],
  ) {
    expect(contents.length).eqls(expectedNames.length);
    for (let i = 0; i < expectedNames.length; i++) {
      const name = expectedNames[i];
      const open = expectedOpen[i];
      expect(contents[i].name).eqls(name, `contents ${i} name`);
      expect(contents[i].canOpen).eqls(open, `contents ${i} canOpen`);
    }
  }

  // Setup
  await create("doc1", "singleDoc", null, true);
  const ps1 = await create("ps1", "sequence", null, true);
  await create("psq_qb1", "select", ps1);
  await create("ps2", "sequence");
  const qb1 = await create("qb1", "select", null, true);
  await create("qb1_doc1", "singleDoc", qb1);
  const f1 = await create("f1", "folder", null, true);
  await create("f1_doc1", "singleDoc", f1);
  const f1_ps1 = await create("f1_ps1", "sequence", f1);
  await create("f1_ps1_doc1", "singleDoc", f1_ps1);
  const f1_ps1_qb1 = await create("f1_ps1_qb1", "select", f1_ps1);
  await create("f1_ps1_qb1_doc1", "singleDoc", f1_ps1_qb1);
  await create("f1_doc2", "singleDoc", f1);
  const f2 = await create("f2", "folder");

  // Root folder: add anywhere
  let results = await getMoveCopyContentData({
    parentId: null,
    allowedParentTypes: ["folder", "sequence", "select"],
    loggedInUserId,
  });
  expect(results.parent).eqls(null);
  expectContentsMatch(
    results.contents,
    ["ps1", "ps2", "qb1", "f1", "f2", "doc1"],
    [true, true, true, true, true, false],
  );

  // Root folder: add to problem set
  results = await getMoveCopyContentData({
    parentId: null,
    allowedParentTypes: ["sequence"],
    loggedInUserId,
  });
  expect(results.parent).eqls(null);
  // Folder 1 has a problem set inside it => can open
  // Folder 2 does not have a problem set => cannot open
  expectContentsMatch(
    results.contents,
    ["ps1", "ps2", "qb1", "f1", "f2", "doc1"],
    [true, true, false, true, false, false],
  );

  // Root folder: add to question bank
  results = await getMoveCopyContentData({
    parentId: null,
    allowedParentTypes: ["select"],
    loggedInUserId,
  });
  expect(results.parent).eqls(null);
  // Problem Set 1 has a question bank inside it => can open
  // Problem Set 2 does not have a question bank => cannot open
  // Same idea for Folder 1 and Folder 2
  expectContentsMatch(
    results.contents,
    ["ps1", "ps2", "qb1", "f1", "f2", "doc1"],
    [true, false, true, true, false, false],
  );

  // Folder 1: add to problem set
  results = await getMoveCopyContentData({
    parentId: f1,
    allowedParentTypes: ["sequence"],
    loggedInUserId,
  });
  expect(results.parent).eqls({
    id: f1,
    name: "f1",
    type: "folder",
    isPublic: true,
    visibility: "public",
    sharedWith: [],
    parent: null,
  });
  expectContentsMatch(
    results.contents,
    ["f1_ps1", "f1_doc1", "f1_doc2"],
    [true, false, false],
  );

  // Folder 1/Problem Set 1: add to question bank
  results = await getMoveCopyContentData({
    parentId: f1_ps1,
    allowedParentTypes: ["select"],
    loggedInUserId,
  });
  expect(results.parent).eqls({
    id: f1_ps1,
    name: "f1_ps1",
    type: "sequence",
    isPublic: true,
    visibility: "public",
    sharedWith: [],
    parent: {
      id: f1,
      type: "folder",
    },
  });
  expectContentsMatch(
    results.contents,
    ["f1_ps1_qb1", "f1_ps1_doc1"],
    [true, false],
  );

  // Folder 2 (empty folder): add to problem set
  results = await getMoveCopyContentData({
    parentId: f2,
    allowedParentTypes: ["sequence"],
    loggedInUserId,
  });
  expect(results.parent).eqls({
    id: f2,
    name: "f2",
    type: "folder",
    isPublic: false,
    visibility: "private",
    sharedWith: [],
    parent: null,
  });
  expectContentsMatch(results.contents, [], []);
});

describe("moveContent() basic", () => {
  test("move content to a different folder", async () => {
    const { userId: ownerId } = await createTestUser();
    const [folder1, doc1, folder2] = await setupTestContent(ownerId, {
      folder1: fold({
        doc1: doc(""),
      }),
      folder2: fold({}),
    });

    // Verify initial state
    let folder1Contents = await getMyContent({
      ownerId,
      parentId: folder1,
      loggedInUserId: ownerId,
    });
    if (folder1Contents.notMe) throw Error("shouldn't happen");
    expect(folder1Contents.content.length).eq(1);

    let folder2Contents = await getMyContent({
      ownerId,
      parentId: folder2,
      loggedInUserId: ownerId,
    });
    if (folder2Contents.notMe) throw Error("shouldn't happen");
    expect(folder2Contents.content.length).eq(0);

    // Move doc1 from folder1 to folder2
    await moveContent({
      contentId: doc1,
      loggedInUserId: ownerId,
      changeParentIdTo: folder2,
      desiredPosition: 0,
    });

    // Verify doc1 is now in folder2
    folder1Contents = await getMyContent({
      ownerId,
      parentId: folder1,
      loggedInUserId: ownerId,
    });
    if (folder1Contents.notMe) throw Error("shouldn't happen");
    expect(folder1Contents.content.length).eq(0);

    folder2Contents = await getMyContent({
      ownerId,
      parentId: folder2,
      loggedInUserId: ownerId,
    });
    if (folder2Contents.notMe) throw Error("shouldn't happen");
    expect(folder2Contents.content.length).eq(1);
    expect(folder2Contents.content[0].contentId).eqls(doc1);
  });

  test("move content to root folder", async () => {
    const { userId: ownerId } = await createTestUser();
    const [folder1, doc1] = await setupTestContent(ownerId, {
      folder1: fold({
        doc1: doc(""),
      }),
    });

    // Verify doc1 is in folder1
    let folder1Contents = await getMyContent({
      ownerId,
      parentId: folder1,
      loggedInUserId: ownerId,
    });
    if (folder1Contents.notMe) throw Error("shouldn't happen");
    expect(folder1Contents.content.length).eq(1);

    // Move doc1 to root folder
    await moveContent({
      contentId: doc1,
      loggedInUserId: ownerId,
      changeParentIdTo: null,
      desiredPosition: 0,
    });

    // Verify doc1 is now in root
    folder1Contents = await getMyContent({
      ownerId,
      parentId: folder1,
      loggedInUserId: ownerId,
    });
    if (folder1Contents.notMe) throw Error("shouldn't happen");
    expect(folder1Contents.content.length).eq(0);

    const rootContents = await getMyContent({
      ownerId,
      parentId: null,
      loggedInUserId: ownerId,
    });
    if (rootContents.notMe) throw Error("shouldn't happen");
    expect(rootContents.content.length).eq(2);
    expect(rootContents.content[0].contentId).eqls(doc1);
  });

  test("move content position without changing parent", async () => {
    const { userId: ownerId } = await createTestUser();
    const [_folder1, doc1, doc2, doc3] = await setupTestContent(ownerId, {
      folder1: fold({
        doc1: doc(""),
        doc2: doc(""),
        doc3: doc(""),
      }),
    });

    // Verify initial order
    let folderContents = await getMyContent({
      ownerId,
      parentId: _folder1,
      loggedInUserId: ownerId,
    });
    if (folderContents.notMe) throw Error("shouldn't happen");
    expect(folderContents.content.length).eq(3);
    expect(folderContents.content[0].contentId).eqls(doc1);
    expect(folderContents.content[1].contentId).eqls(doc2);
    expect(folderContents.content[2].contentId).eqls(doc3);

    // Move doc1 to position 2 (last position) without changing parent
    await moveContent({
      contentId: doc1,
      loggedInUserId: ownerId,
      // changeParentIdTo is NOT specified (undefined)
      desiredPosition: 2,
    });

    // Verify new order: doc2, doc3, doc1
    folderContents = await getMyContent({
      ownerId,
      parentId: _folder1,
      loggedInUserId: ownerId,
    });
    if (folderContents.notMe) throw Error("shouldn't happen");
    expect(folderContents.content.length).eq(3);
    expect(folderContents.content[0].contentId).eqls(doc2);
    expect(folderContents.content[1].contentId).eqls(doc3);
    expect(folderContents.content[2].contentId).eqls(doc1);
  });

  test("move content to specific position in different folder", async () => {
    const { userId: ownerId } = await createTestUser();
    const [_folder1, doc1, folder2, doc2, doc3] = await setupTestContent(
      ownerId,
      {
        folder1: fold({
          doc1: doc(""),
        }),
        folder2: fold({
          doc2: doc(""),
          doc3: doc(""),
        }),
      },
    );

    // Move doc1 to position 1 (between doc2 and doc3) in folder2
    await moveContent({
      contentId: doc1,
      loggedInUserId: ownerId,
      changeParentIdTo: folder2,
      desiredPosition: 1,
    });

    // Verify order in folder2: doc2, doc1, doc3
    const folder2Contents = await getMyContent({
      ownerId,
      parentId: folder2,
      loggedInUserId: ownerId,
    });
    if (folder2Contents.notMe) throw Error("shouldn't happen");
    expect(folder2Contents.content.length).eq(3);
    expect(folder2Contents.content[0].contentId).eqls(doc2);
    expect(folder2Contents.content[1].contentId).eqls(doc1);
    expect(folder2Contents.content[2].contentId).eqls(doc3);
  });

  test("cannot move content into itself", async () => {
    const { userId: ownerId } = await createTestUser();
    const [folder1] = await setupTestContent(ownerId, {
      folder1: fold({}),
    });

    await expect(
      moveContent({
        contentId: folder1,
        loggedInUserId: ownerId,
        changeParentIdTo: folder1,
        desiredPosition: 0,
      }),
    ).rejects.toThrow("Cannot move content into itself");
  });

  test("cannot move content into a descendant", async () => {
    const { userId: ownerId } = await createTestUser();
    const [folder1, subfolder1] = await setupTestContent(ownerId, {
      folder1: fold({
        subfolder1: fold({}),
      }),
    });

    await expect(
      moveContent({
        contentId: folder1,
        loggedInUserId: ownerId,
        changeParentIdTo: subfolder1,
        desiredPosition: 0,
      }),
    ).rejects.toThrow("Cannot move content into a descendant of itself");
  });
});

describe("moveContent() with courses", () => {
  async function setupCourses({ addStudentData }: { addStudentData: boolean }) {
    const { userId: ownerId } = await createTestUser();
    const { userId: anonId } = await createTestAnonymousUser();
    const [
      outerFolder,
      courseFolder1,
      innerFolder1,
      courseDoc,
      innerFolder2,
      courseFolder2,
      nonCourseFolder,
      nonCourseDoc,
    ] = await setupTestContent(ownerId, {
      "outer folder": fold({
        "course folder 1": fold({
          "inner folder 1": fold({
            "course doc": doc(""),
          }),
          "inner folder 2": fold({}),
        }),
      }),
      "course folder 2": fold({}),
      "non-course folder": fold({
        "non-course doc": doc(""),
      }),
    });
    const { assignmentId: courseAssignmentId } = await createAssignment({
      contentId: courseDoc,
      loggedInUserId: ownerId,
      destinationParentId: innerFolder1,
      closedOn: DateTime.now().plus({ days: 1 }),
    });
    const { assignmentId: nonCourseAssignmentId } = await createAssignment({
      contentId: nonCourseDoc,
      loggedInUserId: ownerId,
      destinationParentId: nonCourseFolder,
      closedOn: DateTime.now().plus({ days: 1 }),
    });

    await markFolderAsCourse({
      loggedInUserId: ownerId,
      folderId: courseFolder1,
    });
    await markFolderAsCourse({
      loggedInUserId: ownerId,
      folderId: courseFolder2,
    });

    const { accounts } = await createStudentHandleAccounts({
      loggedInUserId: ownerId,
      numAccounts: 1,
      folderId: courseFolder1,
    });
    const studentId = accounts[0].userId;

    if (addStudentData) {
      await createNewAttempt({
        loggedInUserId: studentId,
        contentId: courseAssignmentId,
        variant: 1,
        state: null,
      });
      await createNewAttempt({
        loggedInUserId: anonId,
        contentId: nonCourseAssignmentId,
        variant: 1,
        state: null,
      });
    }

    return {
      ownerId,
      studentId,
      anonId,
      outerFolder,
      courseFolder1,
      innerFolder1,
      courseDoc,
      innerFolder2,
      courseFolder2,
      nonCourseFolder,
      nonCourseDoc,
      courseAssignmentId,
      nonCourseAssignmentId,
    };
  }

  test("move content within same course (with data)", async () => {
    const { ownerId, innerFolder2, courseAssignmentId } = await setupCourses({
      addStudentData: true,
    });

    await moveContent({
      contentId: courseAssignmentId,
      loggedInUserId: ownerId,
      changeParentIdTo: innerFolder2,
      desiredPosition: 0,
    });

    const description = await getContentDescription({
      contentId: courseAssignmentId,
      loggedInUserId: ownerId,
    });
    expect(description.parent?.contentId).eqls(innerFolder2);
  });

  test("move content without data to a different course", async () => {
    const { ownerId, courseFolder2, courseAssignmentId } = await setupCourses({
      addStudentData: false,
    });

    await moveContent({
      contentId: courseAssignmentId,
      loggedInUserId: ownerId,
      changeParentIdTo: courseFolder2,
      desiredPosition: 0,
    });

    const description = await getContentDescription({
      contentId: courseAssignmentId,
      loggedInUserId: ownerId,
    });
    expect(description.parent?.contentId).eqls(courseFolder2);
  });

  test("cannot move content with data to a different course", async () => {
    const { ownerId, courseFolder2, courseAssignmentId } = await setupCourses({
      addStudentData: true,
    });

    await expect(
      moveContent({
        contentId: courseAssignmentId,
        loggedInUserId: ownerId,
        changeParentIdTo: courseFolder2,
        desiredPosition: 0,
      }),
    ).rejects.toThrow("Cannot move content with student data");
  });

  test("move content without data out of course", async () => {
    const { ownerId, nonCourseFolder, courseAssignmentId } = await setupCourses(
      {
        addStudentData: false,
      },
    );

    await moveContent({
      contentId: courseAssignmentId,
      loggedInUserId: ownerId,
      changeParentIdTo: nonCourseFolder,
      desiredPosition: 0,
    });

    const description = await getContentDescription({
      contentId: courseAssignmentId,
      loggedInUserId: ownerId,
    });
    expect(description.parent?.contentId).eqls(nonCourseFolder);
  });

  test("cannot move content with data out of course", async () => {
    const { ownerId, nonCourseFolder, courseAssignmentId } = await setupCourses(
      {
        addStudentData: true,
      },
    );

    await expect(
      moveContent({
        contentId: courseAssignmentId,
        loggedInUserId: ownerId,
        changeParentIdTo: nonCourseFolder,
        desiredPosition: 0,
      }),
    ).rejects.toThrow("Cannot move content with student data");
  });

  test("move course root to non-course parent", async () => {
    const { ownerId, courseFolder1, nonCourseFolder } = await setupCourses({
      addStudentData: true,
    });

    await moveContent({
      contentId: courseFolder1,
      loggedInUserId: ownerId,
      changeParentIdTo: nonCourseFolder,
      desiredPosition: 0,
    });

    const description = await getContentDescription({
      contentId: courseFolder1,
      loggedInUserId: ownerId,
    });
    expect(description.parent?.contentId).eqls(nonCourseFolder);
  });

  test("cannot move course root to any course parent", async () => {
    const { ownerId, courseFolder1, courseFolder2 } = await setupCourses({
      addStudentData: true,
    });

    await expect(
      moveContent({
        contentId: courseFolder1,
        loggedInUserId: ownerId,
        changeParentIdTo: courseFolder2,
        desiredPosition: 0,
      }),
    ).rejects.toThrow("Cannot move a course into a course");
  });

  test("move content containing course to non-course parent", async () => {
    const { ownerId, outerFolder, nonCourseFolder } = await setupCourses({
      addStudentData: true,
    });

    await moveContent({
      contentId: outerFolder,
      loggedInUserId: ownerId,
      changeParentIdTo: nonCourseFolder,
      desiredPosition: 0,
    });

    const description = await getContentDescription({
      contentId: outerFolder,
      loggedInUserId: ownerId,
    });
    expect(description.parent?.contentId).eqls(nonCourseFolder);
  });

  test("cannot move content containing course to any course parent", async () => {
    const { ownerId, outerFolder, courseFolder2 } = await setupCourses({
      addStudentData: true,
    });

    await expect(
      moveContent({
        contentId: outerFolder,
        loggedInUserId: ownerId,
        changeParentIdTo: courseFolder2,
        desiredPosition: 0,
      }),
    ).rejects.toThrow("Cannot move a course into a course");
  });

  test("move content not containing any courses into to a course", async () => {
    const { ownerId, nonCourseFolder, courseFolder2 } = await setupCourses({
      addStudentData: true,
    });

    await moveContent({
      contentId: nonCourseFolder,
      loggedInUserId: ownerId,
      changeParentIdTo: courseFolder2,
      desiredPosition: 0,
    });

    const description = await getContentDescription({
      contentId: nonCourseFolder,
      loggedInUserId: ownerId,
    });
    expect(description.parent?.contentId).eqls(courseFolder2);
  });
});
