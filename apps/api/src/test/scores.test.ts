import { expect, test } from "vitest";
import {
  createTestAnonymousUser,
  createTestPremiumUser,
  createTestUser,
  doc,
  pset,
  setupTestContent,
} from "./utils";
import { createContent } from "../query/activity";
import { DateTime } from "luxon";
import {
  createAssignment,
  updateAssignmentMaxAttempts,
  updateAssignmentSettings,
} from "../query/assign";
import {
  createNewAttempt,
  getScore,
  getScoresOfAllStudents,
  loadItemState,
  loadState,
  saveScoreAndState,
} from "../query/scores";

test("Create and save responses for new attempts, no items", async () => {
  const { userId: ownerId } = await createTestUser();
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
  const { userId: anonId } = await createTestAnonymousUser();

  let retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    state: "document state 1",
  });

  let expectedScore = {
    calculatedScore: true,
    score: 0,
    bestAttemptNumber: 1,
    itemScores: [],
    latestAttempt: {
      attemptNumber: 1,
      score: 0,
      itemScores: [],
    },
  };

  expect(retrievedScore).eqls(expectedScore);

  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: 0.5,
    state: "document state 1",
    variant: 1,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.5,
    bestAttemptNumber: 1,
    itemScores: [],
    latestAttempt: {
      attemptNumber: 1,
      score: 0.5,
      itemScores: [],
    },
  };

  expect(retrievedScore).eqls(expectedScore);

  let retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).eqls({
    loadedState: true,
    state: "document state 1",
    score: 0.5,
    attemptNumber: 1,
    items: [],
    variant: 1,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls(expectedScore);

  // cannot save state to an attempt number that doesn't exist
  await expect(
    saveScoreAndState({
      contentId: assignmentId,
      loggedInUserId: anonId,
      attemptNumber: 2,
      score: 0.9,
      state: "document state 2",
      variant: 1,
    }),
  ).rejects.toThrow("non-maximal attempt number");

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
  });
  expect(retrievedState.loadedState).eq(false);

  // fail to create an attempt as maxAttempts defaults to 1
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 2,
      loggedInUserId: anonId,
      state: null,
    }),
  ).rejects.toThrow(
    "Cannot create new attempt; maximum number of attempts exceeded",
  );

  // set max attempts to unlimited
  await updateAssignmentMaxAttempts({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    maxAttempts: 0,
  });

  // create a new attempt
  retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 2,
    loggedInUserId: anonId,
    state: null,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.5,
    bestAttemptNumber: 1,
    itemScores: [],
    latestAttempt: {
      attemptNumber: 2,
      score: 0,
      itemScores: [],
    },
  };

  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
  });

  expect(retrievedState).eqls({
    loadedState: true,
    state: null,
    score: 0,
    attemptNumber: 2,
    items: [],
    variant: 2,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls(expectedScore);

  // now we can save state to attempt 2
  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
    score: 0.9,
    state: "document state 3",
    variant: 1,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.9,
    bestAttemptNumber: 2,
    itemScores: [],
    latestAttempt: {
      attemptNumber: 2,
      score: 0.9,
      itemScores: [],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  // skip attempt number on loadState gets the latest attempt
  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedState).eqls({
    loadedState: true,
    state: "document state 3",
    score: 0.9,
    items: [],
    attemptNumber: 2,
    variant: 2,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // can still load old attempt
  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
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

  // if get lower score, lowers score on state and lower actual score to the higher previous attempt score
  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
    score: 0.2,
    state: "document state 4",
    variant: 1,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.5,
    bestAttemptNumber: 1,
    itemScores: [],
    latestAttempt: {
      attemptNumber: 2,
      score: 0.2,
      itemScores: [],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
  });

  expect(retrievedState).eqls({
    loadedState: true,
    state: "document state 4",
    score: 0.2,
    items: [],
    attemptNumber: 2,
    variant: 2,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);
});

test("Create and save responses for new activity-wide attempts, two items", async () => {
  const { userId: ownerId } = await createTestUser();

  // create sequence of two items
  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });
  const { contentId: docId1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });
  const { contentId: docId2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });

  // The information we'll need about the two items
  const shuffledItemOrder = [
    {
      shuffledItemNumber: 1,
      docId: docId1,
      variant: 11,
    },
    {
      shuffledItemNumber: 2,
      docId: docId2,
      variant: 21,
    },
  ];

  // since we are doing activity-wide attempts, we are creating data in line with the summative mode
  await updateAssignmentSettings({
    contentId,
    loggedInUserId: ownerId,
    mode: "summative",
  });

  // set max attempts to unlimited
  await updateAssignmentMaxAttempts({
    contentId,
    loggedInUserId: ownerId,
    maxAttempts: 0,
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  let retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 2,
    loggedInUserId: anonId,
    shuffledItemOrder,
    state: null,
  });

  let expectedScore = {
    calculatedScore: true,
    score: 0,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };

  expect(retrievedScore).eqls(expectedScore);

  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    item: {
      itemNumber: 1,
      itemAttemptNumber: 1,
      score: 0.8,
      state: "Item 1 state 1",
    },
    state: "assignment state 1",
    shuffledItemOrder,
    variant: 2,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.4,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.8, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0.4,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0.8,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };

  expect(retrievedScore).eqls(expectedScore);

  let retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  if (!retrievedState.loadedState) {
    throw Error("Shouldn't happen");
  }

  expect(retrievedState).eqls({
    loadedState: true,
    state: "assignment state 1",
    score: 0.4,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 1,
        score: 0.8,
        state: "Item 1 state 1",
        docId: retrievedState.items[0].docId,
        variant: retrievedState.items[0].variant,
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
        docId: retrievedState.items[1].docId,
        variant: retrievedState.items[1].variant,
      },
    ],
    variant: 2,
  });

  // load item states separately
  let retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 1,
  });

  if (!retrievedItemState.loadedState) {
    throw Error("Shouldn't happen");
  }

  expect(retrievedItemState).eqls({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0.8,
    state: "Item 1 state 1",
    variant: retrievedItemState.variant,
    docId: retrievedItemState.docId,
  });

  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 2,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 2,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0,
    state: null,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls(expectedScore);

  // cannot save state to an attempt number that doesn't exist
  await expect(
    saveScoreAndState({
      contentId: assignmentId,
      loggedInUserId: anonId,
      attemptNumber: 2,
      score: null,
      state: "assignment state 2",
      item: {
        itemNumber: 2,
        itemAttemptNumber: 1,
        score: 0.6,
        state: "Item 2 state 1",
      },
      shuffledItemOrder,
      variant: 2,
    }),
  ).rejects.toThrow("non-maximal attempt number");

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
  });
  expect(retrievedState.loadedState).eq(false);

  // create a new attempt
  retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 2,
    loggedInUserId: anonId,
    shuffledItemOrder,
    state: null,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.4,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.8, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 2,
      score: 0,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };

  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: null,
    score: 0,
    attemptNumber: 2,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
    ],
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls(expectedScore);

  // now we can save state to attempt 2
  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
    score: null,
    state: "assignment state 3",
    item: {
      itemNumber: 2,
      itemAttemptNumber: 1,
      score: 0.6,
      state: "Item 2 state 2",
    },
    shuffledItemOrder,
    variant: 2,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.4, // maximum occurred on first attempt
    bestAttemptNumber: 1,
    // itemScores are the items that give the above maximum score
    itemScores: [
      { itemNumber: 1, score: 0.8, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 2,
      score: 0.3,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0.6,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 3",
    score: 0.3,
    attemptNumber: 2,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0.6,
        state: "Item 2 state 2",
      },
    ],
  });

  // load item states separately
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 2,
    itemNumber: 1,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 1,
    contentAttemptNumber: 2,
    itemAttemptNumber: 1,
    score: 0,
    state: null,
  });

  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 2,
    itemNumber: 2,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 2,
    contentAttemptNumber: 2,
    itemAttemptNumber: 1,
    score: 0.6,
    state: "Item 2 state 2",
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // can still load old attempt
  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 1",
    score: 0.4,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 1,
        score: 0.8,
        state: "Item 1 state 1",
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
    ],
  });

  // load old item states separately
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 1,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0.8,
    state: "Item 1 state 1",
  });

  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 2,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 2,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0,
    state: null,
  });

  // get a lower score on problem 1 still increases score since combined with problem 2 on this attempt
  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
    score: null,
    state: "assignment state 4",
    item: {
      itemNumber: 1,
      itemAttemptNumber: 1,
      score: 0.4,
      state: "Item 1 state 2",
    },
    shuffledItemOrder,
    variant: 2,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.5, // new higher score
    bestAttemptNumber: 2,
    // itemScores are the items that give the new higher score
    itemScores: [
      { itemNumber: 1, score: 0.4, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0.6, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 2,
      score: 0.5,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0.4,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0.6,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  // skip attempt number loads state from latest attempt
  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 4",
    score: 0.5,
    attemptNumber: 2,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 1,
        score: 0.4,
        state: "Item 1 state 2",
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0.6,
        state: "Item 2 state 2",
      },
    ],
  });

  // load item states separately, skip contentAttemptNumber, loads latest attempt
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    itemNumber: 1,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 1,
    contentAttemptNumber: 2,
    itemAttemptNumber: 1,
    score: 0.4,
    state: "Item 1 state 2",
  });

  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    itemNumber: 2,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 2,
    contentAttemptNumber: 2,
    itemAttemptNumber: 1,
    score: 0.6,
    state: "Item 2 state 2",
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls(expectedScore);
});

test("Create and save responses for new item attempts, two items", async () => {
  const { userId: ownerId } = await createTestUser();

  // create sequence of two items
  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });
  const { contentId: docId1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });
  const { contentId: docId2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });

  // The information we'll need about the two items
  const shuffledItemOrder = [
    {
      shuffledItemNumber: 1,
      docId: docId1,
      variant: 11,
    },
    {
      shuffledItemNumber: 2,
      docId: docId2,
      variant: 21,
    },
  ];

  // set max attempts to unlimited
  await updateAssignmentMaxAttempts({
    contentId: contentId,
    loggedInUserId: ownerId,
    maxAttempts: 0,
  });

  // Since we are doing item attempts, we are creating data in line with the formative mode.
  // (Set the mode to stress the fact even though it is the default)
  await updateAssignmentSettings({
    contentId: contentId,
    loggedInUserId: ownerId,
    mode: "formative",
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  let retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    state: null,
  });

  let expectedScore = {
    calculatedScore: true,
    score: 0,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 1",
    item: {
      itemNumber: 1,
      itemAttemptNumber: 1,
      score: 0.6,
      state: "Item 1 state 1",
    },
    shuffledItemOrder,
    variant: 2,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.3,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0.3,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0.6,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  let retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 1",
    score: 0.3,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 1,
        score: 0.6,
        state: "Item 1 state 1",
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
    ],
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls(expectedScore);

  // load item one state
  let retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 1,
    itemAttemptNumber: 1,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0.6,
    state: "Item 1 state 1",
  });

  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 2,
    itemAttemptNumber: 1,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 2,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0,
    state: null,
  });

  // cannot load state from non-existent itemAttemptNumber
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 1,
    itemAttemptNumber: 2,
  });

  expect(retrievedItemState).eqls({ loadedState: false });

  // We cannot save a score to the second attempt of item 1
  await expect(
    saveScoreAndState({
      contentId: assignmentId,
      loggedInUserId: anonId,
      attemptNumber: 1,
      score: null,
      state: "assignment state 1",
      item: {
        itemNumber: 1,
        itemAttemptNumber: 2,
        score: 0.4,
        state: "Item 1 state 2",
      },
      shuffledItemOrder,
      variant: 2,
    }),
  ).rejects.toThrow("non-maximal item attempt number");

  // create a new attempt for item 1
  retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    itemNumber: 1,
    state: "assignment state 2",
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.3,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 2,
          score: 0,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 2",
    score: 0.0,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0,
        state: null,
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
    ],
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls(expectedScore);

  // now we can save state to item attempt 2
  // did worse on problem 1

  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 2",
    item: {
      itemNumber: 1,
      itemAttemptNumber: 2,
      score: 0.4,
      state: "Item 1 state 3",
    },
    shuffledItemOrder,
    variant: 2,
  });

  // remember previous max score of 0.3 and 0.6 on item 1
  expectedScore = {
    calculatedScore: true,
    score: 0.3,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0.2,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 2,
          score: 0.4,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 2",
    score: 0.2,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0.4,
        state: "Item 1 state 3",
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
    ],
  });

  // load item states, skipping content attempt number
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    itemNumber: 1,
    itemAttemptNumber: 2,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 2,
    score: 0.4,
    state: "Item 1 state 3",
  });

  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    itemNumber: 2,
    itemAttemptNumber: 1,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 2,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0,
    state: null,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  // remember previous max score of 0.3 and 0.6 on item 1
  expect(retrievedScore).eqls(expectedScore);

  // can still load old item attempt
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 1,
    itemAttemptNumber: 1,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0.6,
    state: "Item 1 state 1",
  });

  // create a new attempt for item 2
  retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    itemNumber: 2,
    state: "assignment state 3",
  });

  // remember previous max score of 0.3 and 0.6 on item 1
  expectedScore = {
    calculatedScore: true,
    score: 0.3,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 2 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0.2,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 2,
          score: 0.4,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 2,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 3",
    score: 0.2,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0.4,
        state: "Item 1 state 3",
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 2,
        score: 0,
        state: null,
      },
    ],
  });

  // load item states, skipping content and item attempt numbers
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    itemNumber: 1,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 2,
    score: 0.4,
    state: "Item 1 state 3",
  });

  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    itemNumber: 2,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 2,
    contentAttemptNumber: 1,
    itemAttemptNumber: 2,
    score: 0,
    state: null,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // now we can no longer save state to attempt 1 of item 2
  await expect(
    saveScoreAndState({
      contentId: assignmentId,
      loggedInUserId: anonId,
      attemptNumber: 1,
      score: null,
      state: "assignment state 2",
      item: {
        itemNumber: 2,
        itemAttemptNumber: 1,
        score: 0.8,
        state: "Item 2 state 2",
      },
      shuffledItemOrder,
      variant: 2,
    }),
  ).rejects.toThrow("non-maximal item attempt number");

  // We can save state to attempt 2 of item 2
  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 3",
    item: {
      itemNumber: 2,
      itemAttemptNumber: 2,
      score: 0.8,
      state: "Item 2 state 3",
    },
    shuffledItemOrder,
    variant: 2,
  });

  expectedScore = {
    calculatedScore: true,
    score: (0.6 + 0.8) / 2,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0.8, itemAttemptNumber: 2 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: (0.4 + 0.8) / 2,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 2,
          score: 0.4,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 2,
          score: 0.8,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 3",
    score: (0.4 + 0.8) / 2,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0.4,
        state: "Item 1 state 3",
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 2,
        score: 0.8,
        state: "Item 2 state 3",
      },
    ],
  });

  // load item states, skipping just item attempt numbers
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 1,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 2,
    score: 0.4,
    state: "Item 1 state 3",
  });

  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 2,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 2,
    contentAttemptNumber: 1,
    itemAttemptNumber: 2,
    score: 0.8,
    state: "Item 2 state 3",
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls(expectedScore);

  // When create new attempt on item 2, latest attempt score is adjusted
  retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    itemNumber: 2,
    state: "assignment state 4",
  });

  expectedScore = {
    calculatedScore: true,
    score: (0.6 + 0.8) / 2,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 0.8, itemAttemptNumber: 2 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: (0.4 + 0) / 2,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 2,
          score: 0.4,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 3,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);
});

test("Create attempts before responding, no items", async () => {
  const { userId: ownerId } = await createTestUser();
  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  // create a new attempt without recording any response to attempt 1

  // create initial attempt
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    state: null,
  });

  // first attempt to create new attempt fails as max attempts is 1
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 2,
      loggedInUserId: anonId,
      state: null,
    }),
  ).rejects.toThrow(
    "Cannot create new attempt; maximum number of attempts exceeded",
  );

  // set max attempts to unlimited
  await updateAssignmentMaxAttempts({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    maxAttempts: 0,
  });

  let retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 2,
    loggedInUserId: anonId,
    state: null,
  });

  let expectedScore = {
    calculatedScore: true,
    score: 0,
    bestAttemptNumber: 2,
    itemScores: [],
    latestAttempt: {
      attemptNumber: 2,
      score: 0,
      itemScores: [],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  let retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
  });

  expect(retrievedState).eqls({
    loadedState: true,
    state: null,
    score: 0,
    attemptNumber: 2,
    items: [],
    variant: 2,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // save state to attempt 2
  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
    score: 0.9,
    state: "document state 1",
    variant: 2,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.9,
    bestAttemptNumber: 2,
    itemScores: [],
    latestAttempt: {
      attemptNumber: 2,
      score: 0.9,
      itemScores: [],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
  });

  expect(retrievedState).eqls({
    loadedState: true,
    state: "document state 1",
    score: 0.9,
    items: [],
    attemptNumber: 2,
    variant: 2,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // attempt to load attempt 1, which was never taken
  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  // get a score of 0 and a state of null
  expect(retrievedState).eqls({
    loadedState: true,
    state: null,
    score: 0,
    attemptNumber: 1,
    items: [],
    variant: 1,
  });
});

test("Create item attempts before responding, two items", async () => {
  const { userId: ownerId } = await createTestUser();

  // create sequence of two items
  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });
  const { contentId: docId1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });
  const { contentId: docId2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });

  // The information we'll need about the two items
  const shuffledItemOrder = [
    {
      shuffledItemNumber: 1,
      docId: docId1,
      variant: 11,
    },
    {
      shuffledItemNumber: 2,
      docId: docId2,
      variant: 21,
    },
  ];

  // Since we are doing item attempts, we are creating data in line with the formative mode.
  // (Set the mode to stress the fact even though it is the default)
  await updateAssignmentSettings({
    contentId,
    loggedInUserId: ownerId,
    mode: "formative",
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  // create initial attempt
  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: anonId,
    variant: 1,
    shuffledItemOrder,
    state: null,
  });

  // create a new attempt for item 1 before responding

  // initial attempt fails as max attempts is 1
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      loggedInUserId: anonId,
      variant: 1,
      itemNumber: 1,
      shuffledItemOrder,
      state: null,
    }),
  ).rejects.toThrow(
    "Cannot create new attempt of item; maximum number of attempts exceeded",
  );

  // set max attempts to unlimited
  await updateAssignmentMaxAttempts({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    maxAttempts: 0,
  });

  let retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: anonId,
    variant: 1,
    itemNumber: 1,
    shuffledItemOrder,
    state: null,
  });

  let expectedScore = {
    calculatedScore: true,
    score: 0,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0, itemAttemptNumber: 2 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 2,
          score: 0,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  let retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: null,
    score: 0,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0,
        state: null,
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
    ],
    variant: 1,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // now we can save state to attempt 2 for item 2
  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 1",
    item: {
      itemNumber: 1,
      itemAttemptNumber: 2,
      score: 0.4,
      state: "Item 1 state 1",
    },
    shuffledItemOrder,
    variant: 1,
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.2,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.4, itemAttemptNumber: 2 },
      { itemNumber: 2, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0.2,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 2,
          score: 0.4,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 1",
    score: 0.2,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0.4,
        state: "Item 1 state 1",
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
    ],
    variant: 1,
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // attempt to load attempt 1, which was never taken
  const retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    itemNumber: 1,
    itemAttemptNumber: 1,
  });

  // get a scores of 0 and a state of null
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    state: null,
    score: 0,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    itemNumber: 1,
    shuffledItemNumber: 1,
  });
});

test("Create and save responses for new item attempts, two shuffled items", async () => {
  const { userId: ownerId } = await createTestUser();

  // create sequence of two items
  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });
  const { contentId: docId1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });
  const { contentId: docId2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });

  // The information we'll need about the two items, imagine they were shuffled
  const shuffledItemOrder = [
    {
      shuffledItemNumber: 2,
      docId: docId1,
      variant: 11,
    },
    {
      shuffledItemNumber: 1,
      docId: docId2,
      variant: 21,
    },
  ];

  // Since we are doing item attempts, we are creating data in line with the formative mode.
  // (Set the mode to stress the fact even though it is the default)
  await updateAssignmentSettings({
    contentId,
    loggedInUserId: ownerId,
    mode: "formative",
  });

  // set max attempts to unlimited
  await updateAssignmentMaxAttempts({
    contentId,
    loggedInUserId: ownerId,
    maxAttempts: 0,
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: anonId,
    variant: 1,
    shuffledItemOrder,
    state: null,
  });

  // save state for shuffled item number 1 (which is item number 2)
  let retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 1",
    item: {
      shuffledItemNumber: 1,
      itemAttemptNumber: 1,
      score: 0.6,
      state: "Item 1 state 1",
    },
    shuffledItemOrder,
    variant: 1,
  });

  let expectedScore = {
    calculatedScore: true,
    score: 0.3,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 2, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 1, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0.3,
      itemScores: [
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0.6,
        },
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  let retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 1",
    score: 0.3,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 2,
        shuffledItemNumber: 1,
        itemAttemptNumber: 1,
        score: 0.6,
        state: "Item 1 state 1",
      },
      {
        itemNumber: 1,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
    ],
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // load shuffled item one state
  let retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    shuffledItemNumber: 1,
    itemAttemptNumber: 1,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0.6,
    state: "Item 1 state 1",
  });

  // load shuffled item 2 state
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    shuffledItemNumber: 2,
    itemAttemptNumber: 1,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 2,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0,
    state: null,
  });

  // cannot load state from non-existent itemAttemptNumber
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    shuffledItemNumber: 1,
    itemAttemptNumber: 2,
  });

  expect(retrievedItemState).eqls({ loadedState: false });

  // We cannot save a score to the second attempt of shuffled item 1
  await expect(
    saveScoreAndState({
      contentId: assignmentId,
      loggedInUserId: anonId,
      attemptNumber: 1,
      score: null,
      state: "assignment state 1",
      item: {
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0.4,
        state: "Item 1 state 2",
      },
      shuffledItemOrder,
      variant: 1,
    }),
  ).rejects.toThrow("non-maximal item attempt number");

  // create a new attempt for shuffled item 1
  retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    shuffledItemNumber: 1,
    state: "assignment state 2",
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.3,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 2, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 1, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0,
      itemScores: [
        {
          itemNumber: 2,
          itemAttemptNumber: 2,
          score: 0,
        },
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 2",
    score: 0.0,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 2,
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0,
        state: null,
      },
      {
        itemNumber: 1,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
    ],
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // now we can save state to item attempt 2 for shuffledItemNumber 1
  // did worse than on first attempt

  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 3",
    item: {
      shuffledItemNumber: 1,
      itemAttemptNumber: 2,
      score: 0.4,
      state: "Item 1 state 3",
    },
    shuffledItemOrder,
    variant: 1,
  });

  // remember previous max score of 0.3 and 0.6 on item 2 (shuffledItemNumber 1)
  expectedScore = {
    calculatedScore: true,
    score: 0.3,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 2, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 1, score: 0, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0.2,
      itemScores: [
        {
          itemNumber: 2,
          itemAttemptNumber: 2,
          score: 0.4,
        },
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 3",
    score: 0.2,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 2,
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0.4,
        state: "Item 1 state 3",
      },
      {
        itemNumber: 1,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0,
        state: null,
      },
    ],
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // can still load old item attempt
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    contentAttemptNumber: 1,
    shuffledItemNumber: 1,
    itemAttemptNumber: 1,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0.6,
    state: "Item 1 state 1",
  });

  // create a new attempt for shuffled item 2
  retrievedScore = await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    shuffledItemNumber: 2,
    state: "assignment state 4",
  });

  expectedScore = {
    calculatedScore: true,
    score: 0.3,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 2, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 1, score: 0, itemAttemptNumber: 2 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: 0.2,
      itemScores: [
        {
          itemNumber: 2,
          itemAttemptNumber: 2,
          score: 0.4,
        },
        {
          itemNumber: 1,
          itemAttemptNumber: 2,
          score: 0,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 4",
    score: 0.2,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 2,
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0.4,
        state: "Item 1 state 3",
      },
      {
        itemNumber: 1,
        shuffledItemNumber: 2,
        itemAttemptNumber: 2,
        score: 0,
        state: null,
      },
    ],
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);

  // now we can no longer save state to attempt 1 of shuffled item 2
  await expect(
    saveScoreAndState({
      contentId: assignmentId,
      loggedInUserId: anonId,
      attemptNumber: 1,
      score: null,
      state: "assignment state 5",
      item: {
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0.8,
        state: "Item 2 state 2",
      },
      shuffledItemOrder,
      variant: 1,
    }),
  ).rejects.toThrow("non-maximal item attempt number");

  // We can save state to attempt 2 of shuffled item 2
  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 6",
    item: {
      shuffledItemNumber: 2,
      itemAttemptNumber: 2,
      score: 0.8,
      state: "Item 2 state 3",
    },
    shuffledItemOrder,
    variant: 1,
  });

  expectedScore = {
    calculatedScore: true,
    score: (0.6 + 0.8) / 2,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 2, score: 0.6, itemAttemptNumber: 1 },
      { itemNumber: 1, score: 0.8, itemAttemptNumber: 2 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: (0.4 + 0.8) / 2,
      itemScores: [
        {
          itemNumber: 2,
          itemAttemptNumber: 2,
          score: 0.4,
        },
        {
          itemNumber: 1,
          itemAttemptNumber: 2,
          score: 0.8,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 6",
    score: (0.4 + 0.8) / 2,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 2,
        shuffledItemNumber: 1,
        itemAttemptNumber: 2,
        score: 0.4,
        state: "Item 1 state 3",
      },
      {
        itemNumber: 1,
        shuffledItemNumber: 2,
        itemAttemptNumber: 2,
        score: 0.8,
        state: "Item 2 state 3",
      },
    ],
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);
});

test("New item attempt does not affect other item", async () => {
  const { userId: ownerId } = await createTestUser();

  // create sequence of two items
  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });
  const { contentId: docId1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });
  const { contentId: docId2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });

  // The information we'll need about the two items
  const shuffledItemOrder = [
    {
      shuffledItemNumber: 1,
      docId: docId1,
      variant: 11,
    },
    {
      shuffledItemNumber: 2,
      docId: docId2,
      variant: 21,
    },
  ];

  // Since we are doing item attempts, we are creating data in line with the formative mode.
  // (Set the mode to stress the fact even though it is the default)
  await updateAssignmentSettings({
    contentId,
    loggedInUserId: ownerId,
    mode: "formative",
  });

  // set max attempts to unlimited
  await updateAssignmentMaxAttempts({
    contentId,
    loggedInUserId: ownerId,
    maxAttempts: 0,
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: anonId,
    variant: 1,
    shuffledItemOrder,
    state: null,
  });

  // save state for items 1 amd 2
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 1",
    item: {
      itemNumber: 1,
      itemAttemptNumber: 1,
      score: 0.8,
      state: "Item 1 state 1",
    },
    shuffledItemOrder,
    variant: 1,
  });

  let retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 1",
    item: {
      itemNumber: 2,
      itemAttemptNumber: 1,
      score: 1,
      state: "Item 2 state 1",
    },
    shuffledItemOrder,
    variant: 1,
  });

  let expectedScore = {
    calculatedScore: true,
    score: (0.8 + 1) / 2,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.8, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 1, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: (0.8 + 1) / 2,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0.8,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 1,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  let retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 1",
    score: 0.9,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 1,
        score: 0.8,
        state: "Item 1 state 1",
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 1,
        state: "Item 2 state 1",
      },
    ],
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls(expectedScore);

  // Creating new attempt of item 2 locks in that score,
  // but does not lock in the score of item 1
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    itemNumber: 2,
    state: "assignment state 2",
  });

  // save state with lower scores for items 1 amd 2
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 2",
    item: {
      itemNumber: 1,
      itemAttemptNumber: 1,
      score: 0.4,
      state: "Item 1 state 2",
    },
    shuffledItemOrder,
    variant: 1,
  });

  retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 2",
    item: {
      itemNumber: 2,
      itemAttemptNumber: 2,
      score: 0.2,
      state: "Item 2 state 2",
    },
    shuffledItemOrder,
    variant: 1,
  });

  expectedScore = {
    calculatedScore: true,
    score: (0.4 + 1) / 2,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 1, score: 0.4, itemAttemptNumber: 1 },
      { itemNumber: 2, score: 1, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: (0.4 + 0.2) / 2,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0.4,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 2,
          score: 0.2,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  // loading state gets lower score for both
  retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
  });
  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 2",
    score: (0.4 + 0.2) / 2,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 1,
        score: 0.4,
        state: "Item 1 state 2",
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 2,
        score: 0.2,
        state: "Item 2 state 2",
      },
    ],
  });

  // loading item state get lower score for both
  let retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    itemNumber: 1,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 1,
    score: 0.4,
    state: "Item 1 state 2",
  });

  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    itemNumber: 2,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 2,
    contentAttemptNumber: 1,
    itemAttemptNumber: 2,
    score: 0.2,
    state: "Item 2 state 2",
  });

  // However, getting score retrieves higher score for item 2 but not item 1
  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });
  expect(retrievedScore).eqls(expectedScore);
});

test("Using both itemNumber and shuffledItemNumber, two shuffled items", async () => {
  const { userId: ownerId } = await createTestUser();

  // create sequence of two items
  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });
  const { contentId: docId1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });
  const { contentId: docId2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });

  // The information we'll need about the two items, imagine they were shuffled
  const shuffledItemOrder = [
    {
      shuffledItemNumber: 2,
      docId: docId1,
      variant: 11,
    },
    {
      shuffledItemNumber: 1,
      docId: docId2,
      variant: 21,
    },
  ];

  // set max attempts to unlimited
  await updateAssignmentMaxAttempts({
    contentId,
    loggedInUserId: ownerId,
    maxAttempts: 0,
  });

  // Since we are doing item attempts, we are creating data in line with the formative mode.
  // (Set the mode to stress the fact even though it is the default)
  await updateAssignmentSettings({
    contentId,
    loggedInUserId: ownerId,
    mode: "formative",
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  await createNewAttempt({
    contentId: assignmentId,
    loggedInUserId: anonId,
    variant: 1,
    shuffledItemOrder,
    state: null,
  });

  // save state for item number 1 (which is shuffled item number 2)
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 1",
    item: {
      itemNumber: 1,
      itemAttemptNumber: 1,
      score: 0.6,
      state: "Item 2 state 1",
    },
    shuffledItemOrder,
    variant: 1,
  });

  // save state for shuffled item number 1 (which is item number 2)
  let retrievedScore = await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 1",
    item: {
      shuffledItemNumber: 1,
      itemAttemptNumber: 1,
      score: 0.8,
      state: "Item 1 state 1",
    },
    shuffledItemOrder,
    variant: 1,
  });

  const expectedScore = {
    calculatedScore: true,
    score: (0.6 + 0.8) / 2,
    bestAttemptNumber: 1,
    itemScores: [
      { itemNumber: 2, score: 0.8, itemAttemptNumber: 1 },
      { itemNumber: 1, score: 0.6, itemAttemptNumber: 1 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: (0.8 + 0.6) / 2,
      itemScores: [
        {
          itemNumber: 2,
          itemAttemptNumber: 1,
          score: 0.8,
        },
        {
          itemNumber: 1,
          itemAttemptNumber: 1,
          score: 0.6,
        },
      ],
    },
  };
  expect(retrievedScore).eqls(expectedScore);

  const retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 1",
    score: (0.6 + 0.8) / 2,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 2,
        shuffledItemNumber: 1,
        itemAttemptNumber: 1,
        score: 0.8,
        state: "Item 1 state 1",
      },
      {
        itemNumber: 1,
        shuffledItemNumber: 2,
        itemAttemptNumber: 1,
        score: 0.6,
        state: "Item 2 state 1",
      },
    ],
  });

  retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls(expectedScore);

  // specifying neither itemNumber nor shuffledItemNumber when saving state throws an error
  await expect(
    saveScoreAndState({
      contentId: assignmentId,
      loggedInUserId: anonId,
      attemptNumber: 1,
      score: null,
      state: "assignment state 1",
      item: {
        itemAttemptNumber: 1,
        score: 1,
        state: "Which item?",
      },
      shuffledItemOrder,
      variant: 1,
    }),
  ).rejects.toThrow(
    "A valid itemNumber or shuffledItemNumber must be supplied",
  );

  // omitting shuffledItemOrder when creating new item items throws an error
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 1,
      loggedInUserId: anonId,
      shuffledItemNumber: 2,
      state: "assignment state 2",
    }),
  ).rejects.toThrow(
    "Cannot create attempts of formative assessments without specifying shuffledItemOrder",
  );
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 1,
      loggedInUserId: anonId,
      itemNumber: 2,
      state: "assignment state 3",
    }),
  ).rejects.toThrow(
    "Cannot create attempts of formative assessments without specifying shuffledItemOrder",
  );

  // create a new attempt for shuffled item 2 (item number 1)
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    shuffledItemNumber: 2,
    state: "assignment state 4",
  });

  // create a new attempt for item 2 (shuffled item number 1)
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    itemNumber: 2,
    state: "assignment state 5",
  });

  // load shuffled item one state, specifying no item number, gives first item number
  let retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 2,
    contentAttemptNumber: 1,
    itemAttemptNumber: 2,
    score: 0,
    state: null,
  });

  // load shuffled item 2 state
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    shuffledItemNumber: 2,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 1,
    shuffledItemNumber: 2,
    contentAttemptNumber: 1,
    itemAttemptNumber: 2,
    score: 0,
    state: null,
  });

  // load item 2 state
  retrievedItemState = await loadItemState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    itemNumber: 2,
  });
  expect(retrievedItemState).toMatchObject({
    loadedState: true,
    itemNumber: 2,
    shuffledItemNumber: 1,
    contentAttemptNumber: 1,
    itemAttemptNumber: 2,
    score: 0,
    state: null,
  });
});

test("Cannot create activity-wide attempt on formative assessment", async () => {
  const { userId: ownerId } = await createTestUser();

  // Note: wouldn't get two items without adding children to the sequence,
  // but we aren't testing that part
  const [psetId, doc1Id, doc2Id] = await setupTestContent(ownerId, {
    "problem set": pset({ doc1: doc(""), doc2: doc("") }),
  });

  // Since we are doing item attempts, we are creating data in line with the formative mode.
  // (Set the mode to stress the fact even though it is the default)
  await updateAssignmentSettings({
    contentId: psetId,
    loggedInUserId: ownerId,
    mode: "formative",
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId: psetId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  const shuffledItemOrder = [
    {
      shuffledItemNumber: 2,
      docId: doc1Id,
      variant: 11,
    },
    {
      shuffledItemNumber: 1,
      docId: doc2Id,
      variant: 21,
    },
  ];

  // create initial attempt
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    state: "assignment state 1",
    shuffledItemOrder,
  });

  // cannot create another attempt of whole activity
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 1,
      loggedInUserId: anonId,
      state: "assignment state 2",
      shuffledItemOrder,
    }),
  ).rejects.toThrow(
    "Formative assessments do not support creating new attempts of entire activity",
  );
});

test("Cannot create item attempt on summative assessment", async () => {
  const { userId: ownerId } = await createTestUser();

  // create sequence of two items
  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });
  const { contentId: docId1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });
  const { contentId: docId2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });

  // The information we'll need about the two items
  const shuffledItemOrder = [
    {
      shuffledItemNumber: 1,
      docId: docId1,
      variant: 11,
    },
    {
      shuffledItemNumber: 2,
      docId: docId2,
      variant: 21,
    },
  ];

  // Since we are doing item attempts, we are creating data in line with the formative mode.
  // (Set the mode to stress the fact even though it is the default)
  await updateAssignmentSettings({
    contentId,
    loggedInUserId: ownerId,
    mode: "summative",
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  // create initial attempt
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    state: "assignment state 1",
    shuffledItemOrder,
  });

  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 1,
      loggedInUserId: anonId,
      itemNumber: 1,
      shuffledItemOrder,
      state: "assignment state 2",
    }),
  ).rejects.toThrow(
    "Summative assessments and single documents do not support creating new attempts of single items",
  );
});

test("Setting maximum number of attempts, no items", async () => {
  const { userId: ownerId } = await createTestUser();

  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  // create initial attempt
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    state: "document state 1",
  });

  // can save state
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: 0.5,
    state: "document state 2",
    variant: 1,
  });

  // cannot create new attempt
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 2,
      loggedInUserId: anonId,
      state: "document state 3",
    }),
  ).rejects.toThrow(
    "Cannot create new attempt; maximum number of attempts exceeded",
  );

  // set max attempts to 2
  await updateAssignmentMaxAttempts({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    maxAttempts: 2,
  });

  // create a new attempt, attempt 2
  await createNewAttempt({
    contentId: assignmentId,
    variant: 2,
    loggedInUserId: anonId,
    state: "document state 4",
  });

  // can save state
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 2,
    score: 0.6,
    state: "document state 5",
    variant: 2,
  });

  // cannot create new attempt
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 3,
      loggedInUserId: anonId,
      state: "document state 6",
    }),
  ).rejects.toThrow(
    "Cannot create new attempt; maximum number of attempts exceeded",
  );

  // set max attempts to 3
  await updateAssignmentMaxAttempts({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    maxAttempts: 3,
  });

  // create a new attempt, attempt 3
  await createNewAttempt({
    contentId: assignmentId,
    variant: 3,
    loggedInUserId: anonId,
    state: "document state 7",
  });

  // bring max attempts back down to 2
  await updateAssignmentMaxAttempts({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    maxAttempts: 2,
  });

  // can still save state
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 3,
    score: 0.7,
    state: "document state 8",
    variant: 3,
  });

  // cannot save state to attempt 2
  await expect(
    saveScoreAndState({
      contentId: assignmentId,
      loggedInUserId: anonId,
      attemptNumber: 2,
      score: 0.8,
      state: "document state 9",
      variant: 2,
    }),
  ).rejects.toThrow(
    "Cannot save score and state to non-maximal attempt number",
  );

  // can retrieve score and state from third attempt
  const retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedState).eqls({
    loadedState: true,
    state: "document state 8",
    score: 0.7,
    attemptNumber: 3,
    variant: 3,
    items: [],
  });

  // retrieved score reflects third attempt
  const retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls({
    calculatedScore: true,
    score: 0.7,
    bestAttemptNumber: 3,
    itemScores: [],
    latestAttempt: {
      attemptNumber: 3,
      score: 0.7,
      itemScores: [],
    },
  });
});

test("Setting maximum number of attempts, new item attempts", async () => {
  const { userId: ownerId } = await createTestUser();

  // create sequence of two items
  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "sequence",
    parentId: null,
  });
  const { contentId: docId1 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });
  const { contentId: docId2 } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: contentId,
  });

  // The information we'll need about the two items
  const shuffledItemOrder = [
    {
      shuffledItemNumber: 1,
      docId: docId1,
      variant: 11,
    },
    {
      shuffledItemNumber: 2,
      docId: docId2,
      variant: 21,
    },
  ];

  // Since we are doing item attempts, we are creating data in line with the formative mode.
  // (Set the mode to stress the fact even though it is the default)
  await updateAssignmentSettings({
    contentId,
    loggedInUserId: ownerId,
    mode: "formative",
  });

  // open assignment generates code
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });

  // create new anonymous user
  const { userId: anonId } = await createTestAnonymousUser();

  // create initial attempt
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    state: "assignment state 1",
    shuffledItemOrder,
  });

  // save state for attempt 1 of item 1
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 2",
    item: {
      itemNumber: 1,
      itemAttemptNumber: 1,
      score: 0.6,
      state: "Item 1 state 1",
    },
    shuffledItemOrder,
    variant: 1,
  });

  // cannot create a new attempt for item 1 or item 2
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 1,
      loggedInUserId: anonId,
      shuffledItemOrder,
      itemNumber: 1,
      state: "assignment state 3",
    }),
  ).rejects.toThrow(
    "Cannot create new attempt of item; maximum number of attempts exceeded",
  );

  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 1,
      loggedInUserId: anonId,
      shuffledItemOrder,
      itemNumber: 2,
      state: "assignment state 4",
    }),
  ).rejects.toThrow(
    "Cannot create new attempt of item; maximum number of attempts exceeded",
  );

  // set max attempts to 2
  await updateAssignmentMaxAttempts({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    maxAttempts: 2,
  });

  // create a new attempt for item 1, attempt 2
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    itemNumber: 1,
    state: "assignment state 5",
  });

  // save state for attempt 2 of item 1
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 6",
    item: {
      itemNumber: 1,
      itemAttemptNumber: 2,
      score: 0.8,
      state: "Item 1 state 2",
    },
    shuffledItemOrder,
    variant: 1,
  });

  // cannot create a new attempt for item 1
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 1,
      loggedInUserId: anonId,
      shuffledItemOrder,
      itemNumber: 1,
      state: "assignment state 7",
    }),
  ).rejects.toThrow(
    "Cannot create new attempt of item; maximum number of attempts exceeded",
  );

  // set max attempts to 3
  await updateAssignmentMaxAttempts({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    maxAttempts: 3,
  });

  // create a new attempt for item 1, attempt 3
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    itemNumber: 1,
    state: "assignment state 8",
  });

  // set max attempts back down to 2
  await updateAssignmentMaxAttempts({
    contentId: assignmentId,
    loggedInUserId: ownerId,
    maxAttempts: 2,
  });

  // can still save state for attempt 3 of item 1
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 9",
    item: {
      itemNumber: 1,
      itemAttemptNumber: 3,
      score: 1,
      state: "Item 1 state 3",
    },
    shuffledItemOrder,
    variant: 1,
  });

  // can no longer save state for attempt 2 of item 1
  await expect(
    saveScoreAndState({
      contentId: assignmentId,
      loggedInUserId: anonId,
      attemptNumber: 1,
      score: null,
      state: "assignment state 10",
      item: {
        itemNumber: 1,
        itemAttemptNumber: 2,
        score: 0.2,
        state: "Item 1 state 4",
      },
      shuffledItemOrder,
      variant: 1,
    }),
  ).rejects.toThrow(
    "Cannot save score and state to non-maximal item attempt number",
  );

  // create a new attempt for item 2, attempt 2
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: anonId,
    shuffledItemOrder,
    itemNumber: 2,
    state: "assignment state 11",
  });

  // cannot create a third attempt for item 2
  await expect(
    createNewAttempt({
      contentId: assignmentId,
      variant: 1,
      loggedInUserId: anonId,
      shuffledItemOrder,
      itemNumber: 2,
      state: "assignment state 12",
    }),
  ).rejects.toThrow(
    "Cannot create new attempt of item; maximum number of attempts exceeded",
  );

  // can  save state for attempt 2 of item 1
  await saveScoreAndState({
    contentId: assignmentId,
    loggedInUserId: anonId,
    attemptNumber: 1,
    score: null,
    state: "assignment state 13",
    item: {
      itemNumber: 2,
      itemAttemptNumber: 2,
      score: 0.4,
      state: "Item 2 state 1",
    },
    shuffledItemOrder,
    variant: 1,
  });

  // retrieved state reflects attempt 3 for item 1 and attempt 2 for item 2
  const retrievedState = await loadState({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedState).toMatchObject({
    loadedState: true,
    state: "assignment state 13",
    score: (1 + 0.4) / 2,
    attemptNumber: 1,
    items: [
      {
        itemNumber: 1,
        shuffledItemNumber: 1,
        itemAttemptNumber: 3,
        score: 1,
        state: "Item 1 state 3",
      },
      {
        itemNumber: 2,
        shuffledItemNumber: 2,
        itemAttemptNumber: 2,
        score: 0.4,
        state: "Item 2 state 1",
      },
    ],
  });

  // retrieved score reflects attempt 3 for item 1 and attempt 2 for item 2
  const retrievedScore = await getScore({
    contentId: assignmentId,
    loggedInUserId: anonId,
  });

  expect(retrievedScore).eqls({
    calculatedScore: true,
    bestAttemptNumber: 1,
    score: (1 + 0.4) / 2,
    itemScores: [
      { itemNumber: 1, score: 1, itemAttemptNumber: 3 },
      { itemNumber: 2, score: 0.4, itemAttemptNumber: 2 },
    ],
    latestAttempt: {
      attemptNumber: 1,
      score: (1 + 0.4) / 2,
      itemScores: [
        {
          itemNumber: 1,
          itemAttemptNumber: 3,
          score: 1,
        },
        {
          itemNumber: 2,
          itemAttemptNumber: 2,
          score: 0.4,
        },
      ],
    },
  });
});

test("getScoresOfAllStudents should not provide emails", async () => {
  const { userId: ownerId } = await createTestPremiumUser();
  const { contentId } = await createContent({
    loggedInUserId: ownerId,
    contentType: "singleDoc",
    parentId: null,
  });
  const closedOn = DateTime.now().plus({ days: 1 });
  const { assignmentId } = await createAssignment({
    contentId,
    closedOn: closedOn,
    loggedInUserId: ownerId,
    destinationParentId: null,
  });
  const { userId: studentId } = await createTestUser();
  await createNewAttempt({
    contentId: assignmentId,
    variant: 1,
    loggedInUserId: studentId,
    state: "document state 1",
  });

  const results = await getScoresOfAllStudents({
    contentId: assignmentId,
    loggedInUserId: ownerId,
  });
  expect(results.scores.length).eqls(1);
  expect(results.scores[0].user).not.toHaveProperty("email");
});
