import { describe, expect, test } from "vitest";
import {
  createTestAnonymousUser,
  createTestPremiumUser,
  createTestUser,
  doc,
  fold,
  getTestAssignment,
  pset,
  setupTestContent,
} from "./utils";
import { DateTime } from "luxon";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { convertUUID, fromUUID } from "../utils/uuid";
import { createContent, updateContent } from "../query/activity";
import {
  closeAssignment,
  getAllAssignmentScores,
  getAssignedScores,
  getAssignmentResponseOverview,
  getAssignmentResponseStudent,
  getAssignmentData,
  getStudentAssignmentScores,
  getStudentSubmittedResponses,
  listUserAssigned,
  createAssignment,
  recordSubmittedEvent,
  updateAssignmentClosedOn,
  updateAssignmentMaxAttempts,
  updateAssignmentSettings,
  getContentFromCode,
} from "../query/assign";
import { modifyContentSharedWith, setContentIsPublic } from "../query/share";
import {
  createNewAttempt,
  getScoresOfAllStudents,
  loadState,
  saveScoreAndState,
} from "../query/scores";
import { getContent } from "../query/activity_edit_view";
import { AssignmentMode } from "@prisma/client";
import { ItemScores, UserInfo } from "../types";
import { getAssignmentNonRootIds } from "./testQueries";
import { createStudentHandleAccounts } from "../query/user";
import { markFolderAsCourse } from "../query/course";

test("assign an activity", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;
  const { contentId: contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId,
    name: "Activity 1",
    source: "Some content",
    loggedInUserId: ownerId,
  });

  const { assignmentId } = await createAssignment({
    contentId,
    loggedInUserId: ownerId,
    closedOn: DateTime.now().plus({ days: 1 }),
    destinationParentId: null,
  });
  const assignment = await getTestAssignment(assignmentId, ownerId);

  expect(assignment.name).eq("Activity 1");
  expect(assignment.source).eq("Some content");

  // changing name of activity does change assignment name
  await updateContent({
    contentId: assignmentId,
    name: "Activity 1a",
    loggedInUserId: ownerId,
  });

  let updatedAssignment = await getTestAssignment(assignmentId, ownerId);
  expect(updatedAssignment.name).eq("Activity 1a");

  // cannot change content of activity
  await expect(
    updateContent({
      contentId: assignmentId,
      source: "Some amended content",
      loggedInUserId: ownerId,
    }),
  ).rejects.toThrow("Cannot change assigned content");

  updatedAssignment = await getTestAssignment(assignmentId, ownerId);
  expect(updatedAssignment.source).eq("Some content");
});

test("cannot assign other user's activity", async () => {
  const ownerId1 = (await createTestUser()).userId;
  const ownerId2 = (await createTestUser()).userId;
  const { contentId: contentId } = await createContent({
    loggedInUserId: ownerId1,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId,
    name: "Activity 1",
    source: "Some content",
    loggedInUserId: ownerId1,
  });

  await expect(
    createAssignment({
      contentId: contentId,
      loggedInUserId: ownerId2,
      closedOn: DateTime.now().plus({ days: 1 }),
      destinationParentId: null,
    }),
  ).rejects.toThrow(PrismaClientKnownRequestError);

  // still cannot create assignment even if activity is made public
  await setContentIsPublic({
    contentId: contentId,
    isPublic: true,
    loggedInUserId: ownerId1,
  });

  await expect(
    createAssignment({
      contentId: contentId,
      loggedInUserId: ownerId2,
      closedOn: DateTime.now().plus({ days: 1 }),
      destinationParentId: null,
    }),
  ).rejects.toThrow(PrismaClientKnownRequestError);

  // still cannot create assignment even if activity is shared
  await modifyContentSharedWith({
    action: "share",
    contentId: contentId,
    loggedInUserId: ownerId1,
    users: [ownerId2],
  });

  await expect(
    createAssignment({
      contentId: contentId,
      loggedInUserId: ownerId2,
      closedOn: DateTime.now().plus({ days: 1 }),
      destinationParentId: null,
    }),
  ).rejects.toThrow(PrismaClientKnownRequestError);
});

test("open and close one-off assignment", async () => {
  // TODO: Unclear why `fakeId` should be allowed to `getAssignmentData`
  // For now, we marked owner as premium
  const owner = await createTestPremiumUser();
  const ownerId = owner.userId;
  const fakeId = new Uint8Array(16);

  const { contentId: contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId,
    name: "Activity 1",
    source: "Some content",
    loggedInUserId: ownerId,
  });

  // open assignment assigns activity and generates code
  let closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId, classCode } = await createAssignment({
    contentId: contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });
  if (classCode === null) {
    throw new Error("Class code shouldn't be null");
  }
  let assignment = await getTestAssignment(assignmentId, ownerId);
  expect(assignment.classCode).eq(classCode);
  expect(assignment.assignmentClosedOn).eqls(closedOn.toJSDate());

  let assignmentData = await getAssignmentData({
    assignmentId: assignmentId,
    loggedInUserId: fakeId,
  });
  if (assignmentData.assignment?.type !== "singleDoc") {
    throw Error("Shouldn't happen");
  }
  expect(assignmentData.assignment.contentId).eqls(assignmentId);
  expect(assignmentData.assignment.doenetML).eq("Some content");

  let closeDate = new Date();
  await closeAssignment({
    contentId: assignmentId,
    loggedInUserId: ownerId,
  });
  assignment = await getTestAssignment(assignmentId, ownerId);
  expect(assignment.assignmentClosedOn!.getTime()).gte(closeDate.getTime());
  expect(assignment.assignmentClosedOn!.getTime()).lte(
    closeDate.getTime() + 30 * 1000,
  );

  await expect(
    getAssignmentData({
      assignmentId: assignmentId,
      loggedInUserId: fakeId,
    }),
  ).rejects.toThrow();

  // get same code back if reopen
  closedOn = DateTime.now().plus({ weeks: 3 });
  await updateAssignmentClosedOn({
    contentId: assignmentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
  });
  assignment = await getTestAssignment(assignmentId, ownerId);
  expect(assignment.classCode).eq(classCode);
  expect(assignment.assignmentClosedOn).eqls(closedOn.toJSDate());

  assignmentData = await getAssignmentData({
    assignmentId: assignmentId,
    loggedInUserId: fakeId,
  });
  expect(assignmentData.assignment!.contentId).eqls(assignmentId);

  // Change opening date to the past.
  // Currently, says assignment is not found
  // TODO: if we want students who have previously joined the assignment to be able to reload the page,
  // then this should still retrieve data for those students.
  closedOn = DateTime.now().plus({ seconds: -7 });
  await updateAssignmentClosedOn({
    contentId: assignmentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
  });
  await expect(
    getAssignmentData({
      assignmentId: assignmentId,
      loggedInUserId: fakeId,
    }),
  ).rejects.toThrow();

  // reopen with future date
  closedOn = DateTime.now().plus({ years: 1 });
  await updateAssignmentClosedOn({
    contentId: assignmentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
  });
  assignment = await getTestAssignment(assignmentId, ownerId);
  expect(assignment.classCode).eq(classCode);
  expect(assignment.assignmentClosedOn).eqls(closedOn.toJSDate());

  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    variant: 1,
    state: null,
  });

  // add some data
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    attemptNumber: 1,
    score: 0.3,
    state: "document state",
    variant: 1,
  });

  // closing assignment doesn't close completely due to the data
  closeDate = new Date();
  await closeAssignment({
    contentId: assignmentId,
    loggedInUserId: ownerId,
  });
  assignment = await getTestAssignment(assignmentId, ownerId);
  expect(assignment.classCode).eq(classCode);
  expect(assignment.assignmentClosedOn!.getTime()).gte(closeDate.getTime());
  expect(assignment.assignmentClosedOn!.getTime()).lte(
    closeDate.getTime() + 30 * 1000,
  );
});

test("new assignment in course does not generate code", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;

  const [folderId, docId] = await setupTestContent(ownerId, {
    "folder 1": fold({
      "doc 1": doc("hi"),
    }),
  });
  await markFolderAsCourse({
    loggedInUserId: ownerId,
    folderId,
  });
  await createStudentHandleAccounts({
    loggedInUserId: ownerId,
    folderId,
    numAccounts: 1,
  });

  // open assignment assigns activity and generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { classCode } = await createAssignment({
    contentId: docId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: folderId,
  });

  expect(classCode).toBeNull();
});

test("assignment document in problem set gets status from parent", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;

  const [sequenceId] = await setupTestContent(ownerId, {
    "A problem set": pset({
      "doc 1": doc("Some content 1"),
    }),
  });
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId: sequenceId,
    closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });
  const nonRootId = (await getAssignmentNonRootIds(assignmentId))[0];
  const doc1 = await getContent({
    contentId: nonRootId,
    loggedInUserId: ownerId,
    includeAssignInfo: true,
  });
  expect(doc1.assignmentInfo?.assignmentStatus).eq("Open");
});

test("open one-off compound assignment", async () => {
  // TODO: Unclear why `fakeId` should be allowed to `getAssignmentData`
  // For now, we marked owner as premium
  const owner = await createTestPremiumUser();
  const ownerId = owner.userId;
  const fakeId = new Uint8Array(16);

  const [sequenceId] = await setupTestContent(ownerId, {
    "A problem set": pset({
      "doc 1": doc("Some content 1"),
      "doc 2": doc("Some content 2"),
    }),
  });

  // open assignment assigns activity and generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId: sequenceAssignmentId, classCode } =
    await createAssignment({
      contentId: sequenceId,
      closedOn: closedOn,
      loggedInUserId: ownerId,
      destinationParentId: null,
    });
  if (classCode === null) {
    throw new Error("Class code shouldn't be null");
  }
  const assignment = await getTestAssignment(sequenceAssignmentId, ownerId);
  expect(assignment.classCode).eq(classCode);
  expect(assignment.assignmentClosedOn).eqls(closedOn.toJSDate());

  const assignmentData = await getAssignmentData({
    assignmentId: sequenceAssignmentId,
    loggedInUserId: fakeId,
  });
  if (assignmentData.assignment?.type !== "sequence") {
    throw Error("Shouldn't happen");
  }

  expect(assignmentData.assignment.contentId).eqls(sequenceAssignmentId);
  expect(assignmentData.assignment.name).eq("A problem set");
  expect(assignmentData.assignment.children.length).eq(2);

  const question1 = assignmentData.assignment.children[0];
  if (question1.type !== "singleDoc") {
    throw Error("Shouldn't happen");
  }
  expect(question1.doenetML).eq("Some content 1");

  const question2 = assignmentData.assignment.children[1];
  if (question2.type !== "singleDoc") {
    throw Error("Shouldn't happen");
  }
  expect(question2.doenetML).eq("Some content 2");

  // check content info from root and a descendant
  let content = await getContent({
    contentId: sequenceAssignmentId,
    loggedInUserId: ownerId,
    includeAssignInfo: true,
  });
  expect(content.assignmentInfo?.assignmentStatus).eq("Open");
  expect(content.assignmentInfo?.assignmentClosedOn).eqls(closedOn.toJSDate());
  expect(content.assignmentInfo?.classCode).eq(classCode);
  expect(content.assignmentInfo?.maxAttempts).eq(1);
  expect(content.assignmentInfo?.mode).eq("formative");

  const nonRootIds = await getAssignmentNonRootIds(sequenceAssignmentId);
  expect(nonRootIds.length).eqls(2);

  content = await getContent({
    contentId: nonRootIds[0],
    loggedInUserId: ownerId,
    includeAssignInfo: true,
  });
  expect(content.assignmentInfo?.assignmentStatus).eq("Open");
  expect(content.assignmentInfo?.assignmentClosedOn).eqls(closedOn.toJSDate());
  expect(content.assignmentInfo?.classCode).eq(classCode);
  expect(content.assignmentInfo?.maxAttempts).eq(1);
  expect(content.assignmentInfo?.mode).eq("formative");
});

test("only owner can open, close, modify, or unassign assignment", async () => {
  // Setup
  const owner = await createTestUser();
  const ownerId = owner.userId;
  const user2 = await createTestUser();
  const userId2 = user2.userId;
  const { contentId: contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId,
    name: "Activity 1",
    source: "Some content",
    loggedInUserId: ownerId,
  });

  await expect(
    updateContent({
      contentId: contentId,
      name: "Activity 1",
      source: "Some content",
      loggedInUserId: userId2,
    }),
  ).rejects.toThrow("not found");

  const closedOn = DateTime.now().plus({ days: 1 });

  // Only owner can create assignment
  await expect(
    createAssignment({
      contentId: contentId,
      loggedInUserId: userId2,
      closedOn: closedOn,
      destinationParentId: null,
    }),
  ).rejects.toThrow("not found");

  const { assignmentId } = await createAssignment({
    contentId: contentId,
    loggedInUserId: ownerId,
    closedOn: closedOn,
    destinationParentId: null,
  });

  await expect(getTestAssignment(assignmentId, userId2)).rejects.toThrow(
    PrismaClientKnownRequestError,
  );
  let assignment = await getTestAssignment(assignmentId, ownerId);
  expect(assignment.name).eq("Activity 1");

  // Only owner can rename assignment
  await expect(
    updateContent({
      contentId: assignmentId,
      name: "New Activity",
      loggedInUserId: userId2,
    }),
  ).rejects.toThrow("not found");

  await updateContent({
    contentId: assignmentId,
    name: "New Activity",
    loggedInUserId: ownerId,
  });
  assignment = await getTestAssignment(assignmentId, ownerId);
  expect(assignment.name).eq("New Activity");

  // Only owner can edit close datetime
  const newClosedOn = DateTime.now().plus({ days: 2 });

  await expect(
    updateAssignmentClosedOn({
      contentId: assignmentId,
      closedOn: newClosedOn,
      loggedInUserId: userId2,
    }),
  ).rejects.toThrow("Record to update not found");
  assignment = await getTestAssignment(assignmentId, ownerId);
  expect(assignment.assignmentClosedOn).eqls(closedOn.toJSDate());

  await updateAssignmentClosedOn({
    contentId: assignmentId,
    closedOn: newClosedOn,
    loggedInUserId: ownerId,
  });
  assignment = await getTestAssignment(assignmentId, ownerId);
  expect(assignment.assignmentClosedOn).eqls(newClosedOn.toJSDate());

  // Only owner can manually close the assignment
  await expect(
    closeAssignment({
      contentId: assignmentId,
      loggedInUserId: userId2,
    }),
  ).rejects.toThrow("Record to update not found");

  await closeAssignment({
    contentId: assignmentId,
    loggedInUserId: ownerId,
  });
});

test("cannot assign a descendant of an assignment", async () => {
  const { userId: ownerId } = await createTestUser();

  const [sequenceId, ..._] = await setupTestContent(ownerId, {
    "A problem set": pset({
      "A question": doc("Some content"),
    }),
  });

  const { assignmentId } = await createAssignment({
    contentId: sequenceId,
    loggedInUserId: ownerId,
    closedOn: DateTime.now().plus({ days: 1 }),
    destinationParentId: null,
  });

  const nonRootIds = await getAssignmentNonRootIds(assignmentId);
  expect(nonRootIds.length).eqls(1);

  // cannot assign the descendants of the assignment sequenceId
  await expect(
    createAssignment({
      contentId: nonRootIds[0],
      loggedInUserId: ownerId,
      closedOn: DateTime.now().plus({ days: 1 }),
      destinationParentId: null,
    }),
  ).rejects.toThrow("not found");
});

test("cannot assign an ancestor of an assignment", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;

  const [outerFolderId, innerFolderId, docId] = await setupTestContent(
    ownerId,
    {
      "Outer Folder": fold({
        "Inner Folder": fold({
          "Some question": doc("some content"),
        }),
      }),
    },
  );

  // Create an assignment and put it inside the inner folder
  await createAssignment({
    contentId: docId,
    loggedInUserId: ownerId,
    closedOn: DateTime.now().plus({ days: 1 }),
    destinationParentId: innerFolderId,
  });

  // cannot assign the ancestors of the assignment: outer folder, inner folder
  await expect(
    createAssignment({
      contentId: outerFolderId,
      loggedInUserId: ownerId,
      closedOn: DateTime.now().plus({ days: 1 }),
      destinationParentId: null,
    }),
  ).rejects.toThrow();

  await expect(
    createAssignment({
      contentId: innerFolderId,
      loggedInUserId: ownerId,
      closedOn: DateTime.now().plus({ days: 1 }),
      destinationParentId: null,
    }),
  ).rejects.toThrow();
});

test("cannot assign sub-part of problem set", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;

  const [_, docId] = await setupTestContent(ownerId, {
    "A problem set": pset({
      "Some question": doc("some content"),
    }),
  });

  // cannot assign the inner document
  await expect(
    createAssignment({
      contentId: docId,
      loggedInUserId: ownerId,
      closedOn: DateTime.now().plus({ days: 1 }),
      destinationParentId: null,
    }),
  ).rejects.toThrow();
});

test("cannot change closedOn, maxAttempts, mode, individualizeByStudent of a non-root assignment activity", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;

  const [sequenceId, ..._] = await setupTestContent(ownerId, {
    "A problem set": pset({
      "Some question": doc("some content"),
    }),
  });

  const { assignmentId } = await createAssignment({
    contentId: sequenceId,
    loggedInUserId: ownerId,
    closedOn: DateTime.now().plus({ days: 1 }),
    destinationParentId: null,
  });

  const nonRootIds = await getAssignmentNonRootIds(assignmentId);
  expect(nonRootIds.length).eqls(1);

  const closedOn = DateTime.now().plus({ days: 1 });
  const maxAttempts = 2;
  const mode: AssignmentMode = "summative";
  const individualizeByStudent = false;

  for (const nonRootId of nonRootIds) {
    await expect(
      updateAssignmentClosedOn({
        contentId: nonRootId,
        loggedInUserId: ownerId,
        closedOn: closedOn,
      }),
    ).rejects.toThrow("not found");

    await expect(
      updateAssignmentMaxAttempts({
        contentId: nonRootId,
        loggedInUserId: ownerId,
        maxAttempts,
      }),
    ).rejects.toThrow();

    await expect(
      updateAssignmentSettings({
        contentId: nonRootId,
        loggedInUserId: ownerId,
        mode,
      }),
    ).rejects.toThrow();

    await expect(
      updateAssignmentSettings({
        contentId: nonRootId,
        loggedInUserId: ownerId,
        individualizeByStudent,
      }),
    ).rejects.toThrow();
  }

  await updateAssignmentClosedOn({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    closedOn: closedOn,
  });

  await updateAssignmentMaxAttempts({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    maxAttempts,
  });

  const content = await getContent({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    includeAssignInfo: true,
  });

  expect(content.assignmentInfo?.assignmentStatus).eq("Open");
  expect(content.assignmentInfo?.assignmentClosedOn).eqls(closedOn.toJSDate());
  expect(content.assignmentInfo?.maxAttempts).eq(2);
  expect(content.assignmentInfo?.mode).eq("formative");
  expect(content.assignmentInfo?.individualizeByStudent).eq(true);
});

function scoreFromStudentAttempts(
  attempts: {
    attemptNumber: number;
    score: number;
    itemScores: ItemScores[];
  }[],
) {
  const topScore = attempts.reduce((a, c) => Math.max(a, c.score), 0);
  const maxIdx = attempts.map((a) => a.score).lastIndexOf(topScore);
  const lastIdx = attempts.length - 1;
  return {
    score: topScore,
    bestAttemptNumber: maxIdx + 1,
    itemScores: attempts[maxIdx].itemScores,
    latestAttempt: attempts[lastIdx],
  };
}

async function testSingleDocResponses({
  contentId,
  ownerId,
  dataByStudent,
  source,
}: {
  contentId: Uint8Array;
  ownerId: Uint8Array;
  dataByStudent: {
    user: UserInfo;
    attempts: {
      attemptNumber: number;
      score: number;
      itemScores: ItemScores[];
    }[];
    lastState: {
      state: string;
      variant: number;
    };
  }[];
  classCode: number;
  source: {
    doenetML: string;
    name: string;
    doenetmlVersion: { fullVersion: string };
  };
}) {
  const assignmentScores = await getScoresOfAllStudents({
    contentId: contentId,
    loggedInUserId: ownerId,
  });

  const expectedScoreSummary = dataByStudent.map((data) => {
    return {
      ...scoreFromStudentAttempts(data.attempts),
      user: data.user,
    };
  });

  expect(assignmentScores.scores).eqls(expectedScoreSummary);

  const overviewData = await getAssignmentResponseOverview({
    contentId,
    loggedInUserId: ownerId,
  });

  expect(overviewData.scoreSummary.scores).eqls(expectedScoreSummary);

  for (const studentData of dataByStudent) {
    const scoreFromAttempts = scoreFromStudentAttempts(studentData.attempts);

    const data = await getAssignmentData({
      assignmentId: contentId,
      loggedInUserId: studentData.user.userId,
    });
    expect(data.scoreData).eqls({
      calculatedScore: true,
      ...scoreFromAttempts,
    });

    const assignmentResponseStudentData = await getAssignmentResponseStudent({
      contentId,
      loggedInUserId: ownerId,
      studentUserId: studentData.user.userId,
      shuffledOrder: false,
    });

    expect(assignmentResponseStudentData.overallScores).eqls({
      calculatedScore: true,
      ...scoreFromAttempts,
    });

    if (assignmentResponseStudentData.singleItemAttempt) {
      throw Error("Shouldn't happen");
    }

    if (assignmentResponseStudentData.allAttemptScores.byItem) {
      throw Error("Shouldn't happen");
    }

    expect(assignmentResponseStudentData.allAttemptScores.attemptScores).eqls(
      studentData.attempts.map((attempt) => ({
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        items: attempt.itemScores,
      })),
    );

    const assignmentItemResponseStudentData =
      await getAssignmentResponseStudent({
        contentId,
        loggedInUserId: ownerId,
        studentUserId: studentData.user.userId,
        shuffledOrder: false,
        attemptNumber: studentData.attempts.length,
      });

    if (!assignmentItemResponseStudentData.singleItemAttempt) {
      throw Error("Shouldn't happen");
    }

    expect(assignmentItemResponseStudentData.itemAttemptState).eqls({
      docId: contentId,
      score: scoreFromAttempts.score,
      state: studentData.lastState.state,
      variant: studentData.lastState.variant,
    });

    expect(assignmentItemResponseStudentData.content).toMatchObject({
      contentId,
      name: source.name,
      doenetML: source.doenetML,
      doenetmlVersion: source.doenetmlVersion,
    });
  }
}

test("get assignment data from anonymous users", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;

  const [contentId] = await setupTestContent(ownerId, {
    "Activity 1": doc("Some content"),
  });

  await updateAssignmentSettings({
    contentId,
    loggedInUserId: ownerId,
    mode: "summative",
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId, classCode } = await createAssignment({
    contentId: contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });
  if (classCode === null) {
    throw new Error("Class code shouldn't be null");
  }

  const newUser1 = await createTestAnonymousUser();
  const userData1 = {
    userId: newUser1.userId,
    firstNames: newUser1.firstNames,
    lastNames: newUser1.lastNames,
  };

  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    variant: 1,
    state: null,
  });

  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    attemptNumber: 1,
    score: 0.5,
    state: "document state 1",
    variant: 1,
  });

  await testSingleDocResponses({
    contentId: assignmentId,
    ownerId,
    dataByStudent: [
      {
        user: userData1,
        attempts: [
          {
            attemptNumber: 1,
            score: 0.5,
            itemScores: [],
          },
        ],
        lastState: {
          state: "document state 1",
          variant: 1,
        },
      },
    ],
    classCode,
    source: {
      name: "Activity 1",
      doenetML: "Some content",
      doenetmlVersion: { fullVersion: "latest" },
    },
  });

  // new lower score decreases score
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    attemptNumber: 1,
    score: 0.2,
    state: "document state 2",
    variant: 1,
  });

  await testSingleDocResponses({
    contentId: assignmentId,
    ownerId,
    dataByStudent: [
      {
        user: userData1,
        attempts: [
          {
            attemptNumber: 1,
            score: 0.2,
            itemScores: [],
          },
        ],
        lastState: {
          state: "document state 2",
          variant: 1,
        },
      },
    ],
    classCode,
    source: {
      name: "Activity 1",
      doenetML: "Some content",
      doenetmlVersion: { fullVersion: "latest" },
    },
  });

  // new higher score used
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    attemptNumber: 1,
    score: 0.7,
    state: "document state 3",
    variant: 1,
  });

  await testSingleDocResponses({
    contentId: assignmentId,
    ownerId,
    dataByStudent: [
      {
        user: userData1,
        attempts: [
          {
            attemptNumber: 1,
            score: 0.7,
            itemScores: [],
          },
        ],
        lastState: {
          state: "document state 3",
          variant: 1,
        },
      },
    ],
    classCode,
    source: {
      name: "Activity 1",
      doenetML: "Some content",
      doenetmlVersion: { fullVersion: "latest" },
    },
  });

  // second user opens assignment
  const newUser2 = await createTestAnonymousUser();
  const userData2 = {
    userId: newUser2.userId,
    firstNames: newUser2.firstNames,
    lastNames: newUser2.lastNames,
  };

  // save state for second user
  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: newUser2.userId,
    variant: 1,
    state: null,
  });

  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser2.userId,
    attemptNumber: 1,
    score: 0.3,
    state: "document state 4",
    variant: 1,
  });

  const dataByStudent2 = {
    user: userData2,
    attempts: [
      {
        attemptNumber: 1,
        score: 0.3,
        itemScores: [],
      },
    ],
    lastState: {
      state: "document state 4",
      variant: 1,
    },
  };

  const dataByStudent1 = {
    user: userData1,
    attempts: [
      {
        attemptNumber: 1,
        score: 0.7,
        itemScores: [],
      },
    ],
    lastState: {
      state: "document state 3",
      variant: 1,
    },
  };

  // User data is sorted alphabetically by last name, then first name
  const dataByStudent = [dataByStudent1, dataByStudent2].sort((a, b) => {
    return a.user.lastNames.localeCompare(b.user.lastNames);
  });

  await testSingleDocResponses({
    contentId: assignmentId,
    ownerId,
    dataByStudent,
    classCode,
    source: {
      name: "Activity 1",
      doenetML: "Some content",
      doenetmlVersion: { fullVersion: "latest" },
    },
  });
});

test.todo("get assignment data from anonymous users, problem set");

test("can't get assignment data if other user, but student can get their own data", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;
  const otherUser = await createTestUser();
  const otherUserId = otherUser.userId;
  const { contentId: contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId: contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  const newUser1 = await createTestAnonymousUser();

  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    variant: 1,
    state: null,
  });

  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    attemptNumber: 1,
    score: 0.5,
    state: "document state 1",
    variant: 1,
  });

  // assignment owner can get score data
  expect(
    (
      await getScoresOfAllStudents({
        contentId: assignmentId,
        loggedInUserId: ownerId,
      })
    ).scores.length,
  ).eq(1);

  // other user cannot get score data
  await expect(
    getScoresOfAllStudents({
      contentId: assignmentId,
      loggedInUserId: otherUserId,
    }),
  ).rejects.toThrow("not found");

  // student cannot get score data on all of assignment
  await expect(
    getScoresOfAllStudents({
      contentId: assignmentId,
      loggedInUserId: newUser1.userId,
    }),
  ).rejects.toThrow("not found");

  // assignment owner can get data on student
  const studentData = await getAssignmentResponseStudent({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    studentUserId: newUser1.userId,
    shuffledOrder: false,
  });

  // another user cannot get data on student
  await expect(
    getAssignmentResponseStudent({
      contentId: assignmentId,
      loggedInUserId: otherUserId,
      studentUserId: newUser1.userId,
      shuffledOrder: false,
    }),
  ).rejects.toThrow(PrismaClientKnownRequestError);

  // student can get own data, except don't get allStudents
  studentData.allStudents = [];
  expect(
    await getAssignmentResponseStudent({
      contentId: assignmentId,
      loggedInUserId: newUser1.userId,
      shuffledOrder: false,
    }),
  ).eqls(studentData);
});

test("list assigned and get assigned scores get student assignments and scores", async () => {
  const user1 = await createTestPremiumUser();
  const user1Id = user1.userId;
  const user2 = await createTestPremiumUser();
  const user2Id = user2.userId;

  let assignmentList = await listUserAssigned({ loggedInUserId: user1Id });
  expect(assignmentList.assignments).eqls([]);
  expect(assignmentList.user.userId).eqls(user1Id);

  let studentData = await getAssignedScores({ loggedInUserId: user1Id });
  expect(studentData.orderedActivityScores).eqls([]);
  expect(studentData.userData.userId).eqls(user1Id);

  const { contentId: contentId1 } = await createContent({
    loggedInUserId: user1Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId1,
    name: "Activity 1",
    loggedInUserId: user1Id,
  });
  await createAssignment({
    contentId: contentId1,
    loggedInUserId: user1Id,
    closedOn: DateTime.now().plus({ days: 1 }),
    destinationParentId: null,
  });

  assignmentList = await listUserAssigned({ loggedInUserId: user1Id });
  expect(assignmentList.assignments).eqls([]);
  studentData = await getAssignedScores({ loggedInUserId: user1Id });
  expect(studentData.orderedActivityScores).eqls([]);

  const { contentId: contentId2 } = await createContent({
    loggedInUserId: user2Id,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId2,
    name: "Activity 2",
    loggedInUserId: user2Id,
  });
  const { assignmentId: assignmentId2 } = await createAssignment({
    contentId: contentId2,
    loggedInUserId: user2Id,
    closedOn: DateTime.now().plus({ days: 1 }),
    destinationParentId: null,
  });

  assignmentList = await listUserAssigned({ loggedInUserId: user1Id });
  expect(assignmentList.assignments).eqls([]);
  studentData = await getAssignedScores({ loggedInUserId: user1Id });
  expect(studentData.orderedActivityScores).eqls([]);

  await createNewAttempt({
    contentId: assignmentId2,
    variant: 1,
    state: "document state 1",
    loggedInUserId: user1Id,
  });

  // recording score for user1 on assignment2 adds it to user1's assignment list
  await saveScoreAndState({
    contentId: assignmentId2,
    loggedInUserId: user1Id,
    attemptNumber: 1,
    score: 0.5,
    state: "document state 1",
    variant: 1,
  });

  assignmentList = await listUserAssigned({ loggedInUserId: user1Id });
  expect(assignmentList.assignments).toMatchObject([
    {
      contentId: assignmentId2,
      ownerId: user2Id,
    },
  ]);
  studentData = await getAssignedScores({ loggedInUserId: user1Id });
  expect(studentData.orderedActivityScores).eqls([
    { contentId: assignmentId2, activityName: "Activity 2", score: 0.5 },
  ]);
});

test("get all assignment data from anonymous user", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;

  const [contentId] = await setupTestContent(ownerId, {
    "Activity 1": doc("Some content"),
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId: contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  const newUser1 = await createTestAnonymousUser();
  const newUser1Info = convertUUID({
    userId: newUser1.userId,
    email: newUser1.email,
    firstNames: newUser1.firstNames,
    lastNames: newUser1.lastNames,
  });

  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    state: "document state 1",
    loggedInUserId: newUser1.userId,
  });

  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    attemptNumber: 1,
    score: 0.5,
    state: "document state 1",
    variant: 1,
  });

  let userWithScores = convertUUID(
    await getStudentAssignmentScores({
      studentUserId: newUser1.userId,
      loggedInUserId: ownerId,
      parentId: null,
    }),
  );

  expect(userWithScores).eqls({
    studentData: newUser1Info,
    orderedActivityScores: [
      {
        contentId: fromUUID(assignmentId),
        score: 0.5,
        activityName: "Activity 1",
      },
    ],
    folder: null,
  });

  // new lower score used
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    attemptNumber: 1,
    score: 0.2,
    state: "document state 2",
    variant: 1,
  });

  userWithScores = convertUUID(
    await getStudentAssignmentScores({
      studentUserId: newUser1.userId,
      loggedInUserId: ownerId,
      parentId: null,
    }),
  );

  expect(userWithScores).eqls({
    studentData: newUser1Info,
    orderedActivityScores: [
      {
        contentId: fromUUID(assignmentId),
        score: 0.2,
        activityName: "Activity 1",
      },
    ],
    folder: null,
  });

  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    attemptNumber: 1,
    score: 0.7,
    state: "document state 3",
    variant: 1,
  });

  userWithScores = convertUUID(
    await getStudentAssignmentScores({
      studentUserId: newUser1.userId,
      loggedInUserId: ownerId,
      parentId: null,
    }),
  );

  expect(userWithScores).eqls({
    studentData: newUser1Info,
    orderedActivityScores: [
      {
        contentId: fromUUID(assignmentId),
        score: 0.7,
        activityName: "Activity 1",
      },
    ],
    folder: null,
  });
});

test(
  "assignment list is correctly ordered depth-first and by sortIndex",
  { timeout: 100000 },
  async () => {
    const owner = await createTestUser();
    const ownerId = owner.userId;

    const [docId, folder1] = await setupTestContent(ownerId, {
      "my doc": doc("<answer>1</answer>"),
      "Folder 1": fold({
        // These folders and assignments will be created:
        // beforeFolder 2 (assignment)
        // Folder 2
        //  |--> beforeFolder 3 (assignment)
        //  |--> Folder 3
        //  |--> afterFolder 3 (assignment)
        // afterFolder 2 (assignment)
      }),
      // Created on the root level and should NOT be listed:
      // Root assignment
    });

    const closedOn = DateTime.now().plus({ days: 1 });

    async function setupAssignment(
      parentId: Uint8Array | null,
    ): Promise<Uint8Array> {
      const { assignmentId } = await createAssignment({
        contentId: docId,
        closedOn: closedOn,
        loggedInUserId: ownerId,
        destinationParentId: parentId,
      });
      return assignmentId;
    }

    // Root assignment, not listed
    await setupAssignment(null);

    // Inside Folder 1
    const beforeFolder2 = await setupAssignment(folder1);
    const { contentId: folder2 } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: folder1,
    });
    const afterFolder2 = await setupAssignment(folder1);

    // Inside Folder 2
    const beforeFolder3 = await setupAssignment(folder2);
    const { contentId: _folder3 } = await createContent({
      loggedInUserId: ownerId,
      contentType: "folder",
      parentId: folder2,
    });
    const afterFolder3 = await setupAssignment(folder2);

    const expectedOrderedAssignments = [
      { contentId: beforeFolder2, name: "my doc" },
      { contentId: beforeFolder3, name: "my doc" },
      { contentId: afterFolder3, name: "my doc" },
      { contentId: afterFolder2, name: "my doc" },
    ];

    const scoreData = await getAllAssignmentScores({
      loggedInUserId: ownerId,
      parentId: folder1,
    });
    expect(scoreData.orderedAssignments).eqls(expectedOrderedAssignments);
  },
);

test("getAllAssignmentScores retrieves ordered assignments, ordered students, and scores", async () => {
  // --- Setup ---
  const owner = await createTestUser();
  const ownerId = owner.userId;
  const [folderId, contentId] = await setupTestContent(ownerId, {
    "Folder 1": fold({
      "Activity 1": doc("Some content"),
    }),
  });
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: folderId,
  });

  // --- Test: one assignment, no scores ---
  let scoreData = await getAllAssignmentScores({
    loggedInUserId: ownerId,
    parentId: folderId,
  });
  const expectedScoreData: {
    orderedAssignments: { contentId: Uint8Array; name: string }[];
    scores: (number | null)[][];
    orderedStudents: UserInfo[];
    folder: { contentId: Uint8Array; name: string };
  } = {
    orderedAssignments: [
      {
        contentId: assignmentId,
        name: "Activity 1",
      },
    ],
    scores: [],
    orderedStudents: [],
    folder: {
      contentId: folderId,
      name: "Folder 1",
    },
  };

  expect(scoreData).eqls(expectedScoreData);

  // --- Test: one assignment, one student, one score ---
  const newUser1 = await createTestAnonymousUser("B is after A");
  const newUser1Info = {
    userId: newUser1.userId,
    firstNames: newUser1.firstNames,
    lastNames: newUser1.lastNames,
  };
  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    state: "document state 1",
    variant: 1,
  });
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser1.userId,
    attemptNumber: 1,
    score: 0.5,
    state: "document state 1",
    variant: 1,
  });

  scoreData = await getAllAssignmentScores({
    loggedInUserId: ownerId,
    parentId: folderId,
  });

  expectedScoreData.orderedStudents = [newUser1Info];
  expectedScoreData.scores = [[0.5]];
  expect(scoreData).eqls(expectedScoreData);

  // --- Test: one assignment, two students, two scores ---
  const newUser2 = await createTestAnonymousUser("A is before B");
  const newUser2Info = {
    userId: newUser2.userId,
    firstNames: newUser2.firstNames,
    lastNames: newUser2.lastNames,
  };

  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: newUser2.userId,
    state: "document state 3",
    variant: 1,
  });
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser2.userId,
    attemptNumber: 1,
    score: 0.3,
    state: "document state 3",
    variant: 1,
  });

  expectedScoreData.orderedStudents = [newUser2Info, newUser1Info];
  // New student comes first alphabetically
  // New student (user 2) scored 0.3
  // Old student (user 1) scored 0.5 previously
  expectedScoreData.scores = [[0.3], [0.5]];

  scoreData = await getAllAssignmentScores({
    loggedInUserId: ownerId,
    parentId: folderId,
  });

  expect(scoreData).eqls(expectedScoreData);

  // --- Test: two assignments, two students, 2nd assignment score mssing for first student ---
  const { contentId: activity2Id } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: folderId,
  });
  await updateContent({
    contentId: activity2Id,
    name: "Activity 2",
    source: "Some content",
    loggedInUserId: ownerId,
  });

  const { assignmentId: assignmentId2 } = await createAssignment({
    contentId: activity2Id,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: folderId,
  });

  await createNewAttempt({
    contentId: assignmentId2,
    loggedInUserId: newUser1.userId,
    state: "document state 1",
    variant: 1,
  });
  await saveScoreAndState({
    contentId: assignmentId2,
    loggedInUserId: newUser1.userId,
    attemptNumber: 1,
    score: 0.9,
    state: "document state 1",
    variant: 1,
  });

  expectedScoreData.orderedAssignments.push({
    contentId: assignmentId2,
    name: "Activity 2",
  });
  expectedScoreData.scores = [
    [0.3, null],
    [0.5, 0.9],
  ];

  scoreData = await getAllAssignmentScores({
    loggedInUserId: ownerId,
    parentId: folderId,
  });

  expect(scoreData).eqls(expectedScoreData);
});

test("score for one attempt uses most recent save", async () => {
  const { userId } = await createTestUser();
  const [folderId, contentId] = await setupTestContent(userId, {
    "Folder 1": fold({
      "Activity 1": doc("Some content"),
    }),
  });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: DateTime.now().plus({ days: 1 }),
    loggedInUserId: userId,
    destinationParentId: folderId,
  });

  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: userId,
    state: "document state 1",
    variant: 1,
  });
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: userId,
    attemptNumber: 1,
    score: 0.8,
    state: "document state 2",
    variant: 1,
  });
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: userId,
    attemptNumber: 1,
    score: 0.2,
    state: "document state 3",
    variant: 1,
  });

  const scoreData = await getAllAssignmentScores({
    loggedInUserId: userId,
    parentId: folderId,
  });
  expect(scoreData.scores).eqls([[0.2]]);
});

// Are we allowing this?
test.todo("get student data where two students share the same name");

test("record submitted events and get responses", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;
  const { contentId: contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  await updateContent({
    contentId: contentId,
    name: "My Activity",
    loggedInUserId: ownerId,
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  await createAssignment({
    contentId: contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const newUser = await createTestAnonymousUser();

  const answerId1 = "answer1";
  const answerId2 = "answer2";

  // no submitted responses at first

  let submittedResponses = await getStudentSubmittedResponses({
    contentId,
    studentUserId: newUser.userId,
    loggedInUserId: ownerId,
    answerId: answerId1,
    contentAttemptNumber: 1,
    shuffledOrder: false,
  });
  expect(submittedResponses.responses.length).eq(0);
  submittedResponses = await getStudentSubmittedResponses({
    contentId,
    studentUserId: newUser.userId,
    loggedInUserId: ownerId,
    answerId: answerId2,
    contentAttemptNumber: 1,
    shuffledOrder: false,
  });
  expect(submittedResponses.responses.length).eq(0);

  // record event and retrieve it
  await recordSubmittedEvent({
    contentId: contentId,
    loggedInUserId: newUser.userId,
    contentAttemptNumber: 1,
    itemAttemptNumber: null,
    answerId: answerId1,
    response: "Answer result 1",
    answerNumber: 1,
    componentNumber: 2,
    itemNumber: 3,
    shuffledItemNumber: 3,
    answerCreditAchieved: 0.4,
    componentCreditAchieved: 0.2,
    itemCreditAchieved: 0.1,
  });

  submittedResponses = await getStudentSubmittedResponses({
    contentId,
    studentUserId: newUser.userId,
    loggedInUserId: ownerId,
    answerId: answerId1,
    contentAttemptNumber: 1,
    shuffledOrder: false,
  });
  expect(submittedResponses.responses).toMatchObject([
    {
      response: "Answer result 1",
      answerCreditAchieved: 0.4,
    },
  ]);

  // record new event
  await recordSubmittedEvent({
    contentId: contentId,
    loggedInUserId: newUser.userId,
    contentAttemptNumber: 1,
    itemAttemptNumber: null,
    answerId: answerId1,
    response: "Answer result 2",
    answerNumber: 1,
    componentNumber: 2,
    itemNumber: 3,
    shuffledItemNumber: 3,
    answerCreditAchieved: 0.8,
    componentCreditAchieved: 0.4,
    itemCreditAchieved: 0.2,
  });

  submittedResponses = await getStudentSubmittedResponses({
    contentId,
    studentUserId: newUser.userId,
    loggedInUserId: ownerId,
    answerId: answerId1,
    contentAttemptNumber: 1,
    shuffledOrder: false,
  });
  expect(submittedResponses.responses).toMatchObject([
    {
      response: "Answer result 1",
      answerCreditAchieved: 0.4,
    },
    {
      response: "Answer result 2",
      answerCreditAchieved: 0.8,
    },
  ]);

  // record event for different answer
  await recordSubmittedEvent({
    contentId: contentId,
    loggedInUserId: newUser.userId,
    contentAttemptNumber: 1,
    itemAttemptNumber: null,
    answerId: answerId2,
    response: "Answer result 3",
    answerNumber: 2,
    componentNumber: 2,
    itemNumber: 3,
    shuffledItemNumber: 3,
    answerCreditAchieved: 0.2,
    componentCreditAchieved: 0.1,
    itemCreditAchieved: 0.05,
  });

  submittedResponses = await getStudentSubmittedResponses({
    contentId,
    studentUserId: newUser.userId,
    loggedInUserId: ownerId,
    answerId: answerId2,
    contentAttemptNumber: 1,
    shuffledOrder: false,
  });
  expect(submittedResponses.responses).toMatchObject([
    {
      response: "Answer result 3",
      answerCreditAchieved: 0.2,
    },
  ]);
  submittedResponses = await getStudentSubmittedResponses({
    contentId,
    studentUserId: newUser.userId,
    loggedInUserId: ownerId,
    answerId: answerId1,
    contentAttemptNumber: 1,
    shuffledOrder: false,
  });
  expect(submittedResponses.responses).toMatchObject([
    {
      response: "Answer result 1",
      answerCreditAchieved: 0.4,
    },
    {
      response: "Answer result 2",
      answerCreditAchieved: 0.8,
    },
  ]);

  // response for a second user
  const newUser2 = await createTestAnonymousUser();

  await recordSubmittedEvent({
    contentId: contentId,
    loggedInUserId: newUser2.userId,
    contentAttemptNumber: 1,
    itemAttemptNumber: null,
    answerId: answerId1,
    response: "Answer result 4",
    answerNumber: 1,
    componentNumber: 2,
    itemNumber: 3,
    shuffledItemNumber: 3,
    answerCreditAchieved: 1,
    componentCreditAchieved: 0.5,
    itemCreditAchieved: 0.25,
  });

  submittedResponses = await getStudentSubmittedResponses({
    contentId,
    studentUserId: newUser2.userId,
    loggedInUserId: ownerId,
    answerId: answerId1,
    contentAttemptNumber: 1,
    shuffledOrder: false,
  });
  expect(submittedResponses.responses).toMatchObject([
    {
      response: "Answer result 4",
      answerCreditAchieved: 1,
    },
  ]);

  submittedResponses = await getStudentSubmittedResponses({
    contentId,
    studentUserId: newUser.userId,
    loggedInUserId: ownerId,
    answerId: answerId2,
    contentAttemptNumber: 1,
    shuffledOrder: false,
  });
  expect(submittedResponses.responses).toMatchObject([
    {
      response: "Answer result 3",
      answerCreditAchieved: 0.2,
    },
  ]);
});

test("only owner can get submitted responses", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;
  const { contentId: contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  const user2 = await createTestUser();
  const userId2 = user2.userId;

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  await createAssignment({
    contentId: contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const newUser = await createTestAnonymousUser();
  const answerId1 = "answer1";

  // record event and retrieve it
  await recordSubmittedEvent({
    contentId: contentId,
    loggedInUserId: newUser.userId,
    contentAttemptNumber: 1,
    itemAttemptNumber: null,
    answerId: answerId1,
    response: "Answer result 1",
    answerNumber: 1,
    componentNumber: 2,
    itemNumber: 1,
    shuffledItemNumber: 1,
    answerCreditAchieved: 1,
    componentCreditAchieved: 0.5,
    itemCreditAchieved: 0.25,
  });
  const submittedResponses = await getStudentSubmittedResponses({
    contentId,
    studentUserId: newUser.userId,
    loggedInUserId: ownerId,
    answerId: answerId1,
    contentAttemptNumber: 1,
    shuffledOrder: false,
  });
  expect(submittedResponses.responses).toMatchObject([
    {
      response: "Answer result 1",
      answerCreditAchieved: 1,
    },
  ]);

  // cannot retrieve responses as other user
  await expect(
    getStudentSubmittedResponses({
      contentId,
      studentUserId: newUser.userId,
      loggedInUserId: userId2,
      answerId: answerId1,
      contentAttemptNumber: 1,
      shuffledOrder: false,
    }),
  ).rejects.toThrow(PrismaClientKnownRequestError);
});

test("only user and assignment owner can load document state", async () => {
  const owner = await createTestUser();
  const ownerId = owner.userId;
  const { contentId: contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId: contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const newUser = await createTestAnonymousUser();

  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: newUser.userId,
    state: "document state 1",
    variant: 1,
  });
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: newUser.userId,
    attemptNumber: 1,
    score: 0.5,
    state: "document state 1",
    variant: 1,
  });

  // anonymous user can load state
  const retrievedState = await loadState({
    contentId: assignmentId,
    requestedUserId: newUser.userId,
    loggedInUserId: newUser.userId,
    attemptNumber: 1,
  });

  expect(retrievedState).eqls({
    loadedState: true,
    state: "document state 1",
    score: 0.5,
    items: [],
    attemptNumber: 1,
    variant: 1,
  });

  // assignment owner can load state
  const retrievedState2 = await loadState({
    contentId: assignmentId,
    requestedUserId: newUser.userId,
    loggedInUserId: ownerId,
    attemptNumber: 1,
  });

  expect(retrievedState2).eqls({
    loadedState: true,
    state: "document state 1",
    score: 0.5,
    items: [],
    attemptNumber: 1,
    variant: 1,
  });

  // another user cannot load state
  const user2 = await createTestUser();

  const retrievedState3 = await loadState({
    contentId: assignmentId,
    requestedUserId: newUser.userId,
    loggedInUserId: user2.userId,
    attemptNumber: 1,
  });

  expect(retrievedState3).eqls({ loadedState: false });
});

describe("getAssignmentData() user permissions", () => {
  // TODO: same logic as `createNewAttempt` tests below, but for `getAssignmentData()`
  // Should we abstract this logic and test it separately?
  test.todo("see above");
});

describe("createNewAttempt user permissions", () => {
  test("scoped user can take course assignment", async () => {
    const { userId: instructorId } = await createTestUser();
    const [folderId, docId] = await setupTestContent(instructorId, {
      "folder 1": fold({
        "doc 1": doc("hi"),
      }),
    });
    const { assignmentId } = await createAssignment({
      contentId: docId,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: folderId,
    });
    // mark folder as course
    await markFolderAsCourse({
      loggedInUserId: instructorId,
      folderId: folderId,
    });
    const { accounts } = await createStudentHandleAccounts({
      loggedInUserId: instructorId,
      folderId,
      numAccounts: 1,
    });
    const attempt = await createNewAttempt({
      contentId: assignmentId,
      loggedInUserId: accounts[0].userId,
      variant: 1,
      state: null,
    });
    expect(attempt.score).toBe(0);
  });

  test("scoped user can take course assignment in sub-folder", async () => {
    const { userId: instructorId } = await createTestUser();
    const [folderId, subFolderId, docId] = await setupTestContent(
      instructorId,
      {
        "folder 1": fold({
          "folder 2": fold({
            "doc 1": doc("hi"),
          }),
        }),
      },
    );
    const { assignmentId } = await createAssignment({
      contentId: docId,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: subFolderId,
    });
    // mark folder as course
    await markFolderAsCourse({
      loggedInUserId: instructorId,
      folderId: folderId,
    });
    const { accounts } = await createStudentHandleAccounts({
      loggedInUserId: instructorId,
      folderId,
      numAccounts: 1,
    });
    const attempt = await createNewAttempt({
      contentId: assignmentId,
      loggedInUserId: accounts[0].userId,
      variant: 1,
      state: null,
    });
    expect(attempt.score).toBe(0);
  });

  test("scoped user from another course cannot take course assignment", async () => {
    const { userId: instructorId } = await createTestUser();

    const [folder1, doc1, folder2] = await setupTestContent(instructorId, {
      "folder 1": fold({
        "doc 1": doc("hi"),
      }),
      "folder 2": fold({}),
    });
    await markFolderAsCourse({
      loggedInUserId: instructorId,
      folderId: folder1,
    });

    await markFolderAsCourse({
      loggedInUserId: instructorId,
      folderId: folder2,
    });
    const { accounts } = await createStudentHandleAccounts({
      loggedInUserId: instructorId,
      folderId: folder2,
      numAccounts: 1,
    });
    const { assignmentId } = await createAssignment({
      contentId: doc1,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: folder1,
    });

    await expect(
      createNewAttempt({
        contentId: assignmentId,
        loggedInUserId: accounts[0].userId,
        variant: 1,
        state: null,
      }),
    ).rejects.toThrow("not found");
  });

  test("external user cannot take course assignment", async () => {
    const { userId: instructorId } = await createTestUser();

    const [folderId, docId] = await setupTestContent(instructorId, {
      "folder 1": fold({
        "doc 1": doc("hi"),
      }),
    });
    const { assignmentId } = await createAssignment({
      contentId: docId,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: folderId,
    });
    // mark folder as course
    await markFolderAsCourse({
      loggedInUserId: instructorId,
      folderId: folderId,
    });
    await createStudentHandleAccounts({
      loggedInUserId: instructorId,
      folderId,
      numAccounts: 1,
    });

    const { userId: outsideUserId } = await createTestUser();

    await expect(
      createNewAttempt({
        contentId: assignmentId,
        loggedInUserId: outsideUserId,
        variant: 1,
        state: null,
      }),
    ).rejects.toThrow("not found");
  });

  test("external user cannot take course assignment in sub folder", async () => {
    const { userId: instructorId } = await createTestUser();

    const [folderId, subFolderId, docId] = await setupTestContent(
      instructorId,
      {
        "folder 1": fold({
          "folder 2": fold({
            "doc 1": doc("hi"),
          }),
        }),
      },
    );
    const { assignmentId } = await createAssignment({
      contentId: docId,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: subFolderId,
    });
    // mark folder as course
    await markFolderAsCourse({
      loggedInUserId: instructorId,
      folderId: folderId,
    });
    await createStudentHandleAccounts({
      loggedInUserId: instructorId,
      folderId,
      numAccounts: 1,
    });

    const { userId: outsideUserId } = await createTestUser();

    await expect(
      createNewAttempt({
        contentId: assignmentId,
        loggedInUserId: outsideUserId,
        variant: 1,
        state: null,
      }),
    ).rejects.toThrow("not found");
  });

  test("anonymous user cannot take course assignment", async () => {
    const { userId: instructorId } = await createTestUser();

    const [folderId, docId] = await setupTestContent(instructorId, {
      "folder 1": fold({
        "doc 1": doc("hi"),
      }),
    });
    const { assignmentId } = await createAssignment({
      contentId: docId,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: folderId,
    });
    // mark folder as course
    await markFolderAsCourse({
      loggedInUserId: instructorId,
      folderId: folderId,
    });
    await createStudentHandleAccounts({
      loggedInUserId: instructorId,
      folderId,
      numAccounts: 1,
    });

    const { userId: anonUserId } = await createTestAnonymousUser();

    await expect(
      createNewAttempt({
        contentId: assignmentId,
        loggedInUserId: anonUserId,
        variant: 1,
        state: null,
      }),
    ).rejects.toThrow("not found");
  });

  test("anonymous user can take one-off assignment", async () => {
    const { userId: instructorId } = await createTestUser();

    const [folderId, docId] = await setupTestContent(instructorId, {
      "folder 1": fold({
        "doc 1": doc("hi"),
      }),
    });
    const { assignmentId } = await createAssignment({
      contentId: docId,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: folderId,
    });

    const { userId: anonUserId } = await createTestAnonymousUser();

    const attempt = await createNewAttempt({
      contentId: assignmentId,
      loggedInUserId: anonUserId,
      variant: 1,
      state: null,
    });
    expect(attempt.score).toBe(0);
  });

  test("scoped user cannot take one-off assignment", async () => {
    const { userId: instructorId } = await createTestUser();

    const [folder1, doc1, folder2] = await setupTestContent(instructorId, {
      "folder 1": fold({
        "doc 1": doc("hi"),
      }),
      "folder 2": fold({}),
    });
    await markFolderAsCourse({
      loggedInUserId: instructorId,
      folderId: folder2,
    });
    const { accounts } = await createStudentHandleAccounts({
      loggedInUserId: instructorId,
      folderId: folder2,
      numAccounts: 1,
    });

    const { assignmentId } = await createAssignment({
      contentId: doc1,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: folder1,
    });

    await expect(
      createNewAttempt({
        contentId: assignmentId,
        loggedInUserId: accounts[0].userId,
        variant: 1,
        state: null,
      }),
    ).rejects.toThrow("not found");
  });

  test("external user cannot take one-off assignment", async () => {
    const { userId: instructorId } = await createTestUser();
    const { userId: externalUserId } = await createTestUser();

    const [folder1, doc1] = await setupTestContent(instructorId, {
      "folder 1": fold({
        "doc 1": doc("hi"),
      }),
    });

    const { assignmentId } = await createAssignment({
      contentId: doc1,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: folder1,
    });

    await expect(
      createNewAttempt({
        contentId: assignmentId,
        loggedInUserId: externalUserId,
        variant: 1,
        state: null,
      }),
    ).rejects.toThrow("not found");
  });

  test("external user can take one-off assignment if owner is premium", async () => {
    const { userId: instructorId } = await createTestPremiumUser();
    const { userId: externalUserId } = await createTestUser();

    const [folder1, doc1] = await setupTestContent(instructorId, {
      "folder 1": fold({
        "doc 1": doc("hi"),
      }),
    });

    const { assignmentId } = await createAssignment({
      contentId: doc1,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: folder1,
    });

    const attempt = await createNewAttempt({
      contentId: assignmentId,
      loggedInUserId: externalUserId,
      variant: 1,
      state: null,
    });
    expect(attempt.score).toBe(0);
  });
});

describe("getContentFromCode", () => {
  test("get assignment id from code", async () => {
    const { userId: instructorId } = await createTestUser();
    const [docId] = await setupTestContent(instructorId, {
      "doc 1": doc("hi"),
    });
    const { assignmentId, classCode } = await createAssignment({
      contentId: docId,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: null,
    });

    const content = await getContentFromCode({ code: classCode! });
    expect(content.contentId).toEqual(assignmentId);
    expect(content.contentType).toEqual("singleDoc");
  });

  test("get course id from code", async () => {
    const { userId: instructorId } = await createTestUser();
    const [folder1, _folder2, folder3, doc1] = await setupTestContent(
      instructorId,
      {
        "folder 1": fold({
          "folder 2": fold({
            "folder 3": fold({
              "doc 1": doc("hi"),
            }),
          }),
        }),
      },
    );

    // mark folder1 as course
    const { classCode: code } = await markFolderAsCourse({
      loggedInUserId: instructorId,
      folderId: folder1,
    });

    await createStudentHandleAccounts({
      loggedInUserId: instructorId,
      folderId: folder1,
      numAccounts: 1,
    });

    await createAssignment({
      contentId: doc1,
      closedOn: DateTime.now().plus({ days: 1 }),
      loggedInUserId: instructorId,
      destinationParentId: folder3,
    });

    const content = await getContentFromCode({ code });
    expect(content.contentId).toEqual(folder1);
    expect(content.contentType).toEqual("folder");
  });
});
