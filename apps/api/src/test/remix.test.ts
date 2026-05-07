import { describe, expect, test } from "vitest";
import {
  createContentRevision,
  createContent,
  getAllDoenetmlVersions,
  updateContent,
} from "../query/activity";
import { modifyContentSharedWith, setContentIsPublic } from "../query/share";
import { getContent } from "../query/activity_edit_view";
import { copyContent } from "../query/copy_move";
import { createTestUser } from "./utils";
import {
  getRemixSources,
  getRemixes,
  updateOriginContentToRemix,
  updateRemixedContentToOrigin,
} from "../query/remix";
import { setContentLicense } from "../query/license";
import { getDocEditorDoenetML, getDocEditorHistory } from "../query/editor";

describe("Remix tests", () => {
  test("remix sources and remixes show only activities user can view", async () => {
    const ownerId1 = (await createTestUser()).userId;
    const ownerId2 = (await createTestUser()).userId;
    const ownerId3 = (await createTestUser()).userId;

    // create public activity 1 by owner 1
    const { contentId: contentId1 } = await createContent({
      loggedInUserId: ownerId1,
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentId1,
      loggedInUserId: ownerId1,
      isPublic: true,
    });

    // owner 2 copies activity 1 to activity 2 and shares it with owner 3
    const {
      newContentIds: [contentId2],
    } = await copyContent({
      contentIds: [contentId1],
      loggedInUserId: ownerId2,
      parentId: null,
    });
    await setContentLicense({
      contentId: contentId2,
      loggedInUserId: ownerId2,
      licenseCode: "CCBYSA",
    });
    await modifyContentSharedWith({
      action: "share",
      contentId: contentId2,
      loggedInUserId: ownerId2,
      users: [ownerId3],
    });

    // owner 3 copies activity 2 to activity 3, and then copies that to public activity 4
    const {
      newContentIds: [contentId3],
    } = await copyContent({
      contentIds: [contentId2],
      loggedInUserId: ownerId3,
      parentId: null,
    });
    const {
      newContentIds: [contentId4],
    } = await copyContent({
      contentIds: [contentId3],
      loggedInUserId: ownerId3,
      parentId: null,
    });
    await setContentIsPublic({
      contentId: contentId4,
      loggedInUserId: ownerId3,
      isPublic: true,
    });

    // owner 3 copies activity 1 to activity 5 and shares it with owner 1
    const {
      newContentIds: [contentId5],
    } = await copyContent({
      contentIds: [contentId1],
      loggedInUserId: ownerId3,
      parentId: null,
    });
    await setContentLicense({
      contentId: contentId5,
      loggedInUserId: ownerId3,
      licenseCode: "CCBYNCSA",
    });
    await modifyContentSharedWith({
      action: "share",
      contentId: contentId5,
      loggedInUserId: ownerId3,
      users: [ownerId1],
    });

    // owner1 just sees activity 1 in remix sources of activity 4
    let remixSources = (
      await getRemixSources({
        contentId: contentId4,
        loggedInUserId: ownerId1,
      })
    ).remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentId1);
    expect(remixSources[0].withLicenseCode).eq("CCDUAL");

    // owner 1 just sees activity 4 and 5 in remixes of activity 1
    let activityRemixes = (
      await getRemixes({
        contentId: contentId1,
        loggedInUserId: ownerId1,
      })
    ).remixes;
    expect(activityRemixes.length).eq(2);
    expect(activityRemixes[0].remixContent.contentId).eqls(contentId5);
    expect(activityRemixes[0].withLicenseCode).eq("CCDUAL");
    expect(activityRemixes[1].remixContent.contentId).eqls(contentId4);
    expect(activityRemixes[1].withLicenseCode).eq("CCDUAL");

    // // owner 1 just sees direct remix from activity 1 into activity 5
    // activityRemixes = (
    //   await getRemixes({
    //     contentId: contentId1,
    //     loggedInUserId: ownerId1,
    //     directRemixesOnly: true,
    //   })
    // ).remixes;
    // expect(activityRemixes.length).eq(1);
    // expect(activityRemixes[0].remixContent.contentId).eqls(contentId5);
    // expect(activityRemixes[0].withLicenseCode).eq("CCDUAL");

    // owner2 just sees activity 1 and 2 in remix sources of activity 4
    remixSources = (
      await getRemixSources({
        contentId: contentId4,
        loggedInUserId: ownerId2,
      })
    ).remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentId2);
    expect(remixSources[0].withLicenseCode).eq("CCBYSA");
    expect(remixSources[1].originContent.contentId).eqls(contentId1);
    expect(remixSources[1].withLicenseCode).eq("CCDUAL");

    // owner 2 just sees activity 4 and 2 in remixes of activity 1
    activityRemixes = (
      await getRemixes({
        contentId: contentId1,
        loggedInUserId: ownerId2,
      })
    ).remixes;
    expect(activityRemixes.length).eq(2);
    expect(activityRemixes[0].remixContent.contentId).eqls(contentId4);
    expect(activityRemixes[0].withLicenseCode).eq("CCDUAL");
    expect(activityRemixes[1].remixContent.contentId).eqls(contentId2);
    expect(activityRemixes[1].withLicenseCode).eq("CCDUAL");

    // // owner 2 sees direct remix of activity 1 into 2
    // activityRemixes = (
    //   await getRemixes({
    //     contentId: contentId1,
    //     loggedInUserId: ownerId2,
    //     directRemixesOnly: true,
    //   })
    // ).remixes;
    // expect(activityRemixes.length).eq(1);
    // expect(activityRemixes[0].contentId).eqls(contentId2);
    // expect(activityRemixes[0].withLicenseCode).eq("CCDUAL");

    // owner3 sees activity 1, 2 and 3 in remix sources of activity 4
    remixSources = (
      await getRemixSources({
        contentId: contentId4,
        loggedInUserId: ownerId3,
      })
    ).remixSources;
    expect(remixSources.length).eq(3);
    expect(remixSources[0].originContent.contentId).eqls(contentId3);
    expect(remixSources[0].withLicenseCode).eq("CCBYSA");
    expect(remixSources[1].originContent.contentId).eqls(contentId2);
    expect(remixSources[1].withLicenseCode).eq("CCBYSA");
    expect(remixSources[2].originContent.contentId).eqls(contentId1);
    expect(remixSources[2].withLicenseCode).eq("CCDUAL");

    // owner 3 sees activity 5, 4, 3 and 2 in remixes of activity 1
    activityRemixes = (
      await getRemixes({
        contentId: contentId1,
        loggedInUserId: ownerId3,
      })
    ).remixes;
    expect(activityRemixes.length).eq(4);
    expect(activityRemixes[0].remixContent.contentId).eqls(contentId5);
    expect(activityRemixes[0].withLicenseCode).eq("CCDUAL");
    expect(activityRemixes[1].remixContent.contentId).eqls(contentId4);
    expect(activityRemixes[1].withLicenseCode).eq("CCDUAL");
    expect(activityRemixes[2].remixContent.contentId).eqls(contentId3);
    expect(activityRemixes[2].withLicenseCode).eq("CCDUAL");
    expect(activityRemixes[3].remixContent.contentId).eqls(contentId2);
    expect(activityRemixes[3].withLicenseCode).eq("CCDUAL");

    // // owner 3 sees direct remixes of activity 1 into 2 and 5
    // activityRemixes = (
    //   await getRemixes({
    //     contentId: contentId1,
    //     loggedInUserId: ownerId3,
    //     directRemixesOnly: true,
    //   })
    // ).remixes;
    // expect(activityRemixes.length).eq(2);
    // expect(activityRemixes[0].contentId).eqls(contentId5);
    // expect(activityRemixes[0].withLicenseCode).eq("CCDUAL");
    // expect(activityRemixes[1].contentId).eqls(contentId2);
    // expect(activityRemixes[1].withLicenseCode).eq("CCDUAL");
  });

  test("remixing a compound activity also adds contributor history to sub activities", async () => {
    const ownerId1 = (await createTestUser()).userId;
    const ownerId2 = (await createTestUser()).userId;
    const ownerId3 = (await createTestUser()).userId;
    const ownerId4 = (await createTestUser()).userId;

    // create public problem set by owner 1
    const { contentId: sequenceId1 } = await createContent({
      loggedInUserId: ownerId1,
      contentType: "sequence",
      parentId: null,
    });
    const { contentId: docId1 } = await createContent({
      loggedInUserId: ownerId1,
      contentType: "singleDoc",
      parentId: sequenceId1,
    });
    await setContentIsPublic({
      contentId: sequenceId1,
      loggedInUserId: ownerId1,
      isPublic: true,
    });

    // add more after already public
    const { contentId: selectId1 } = await createContent({
      loggedInUserId: ownerId1,
      contentType: "select",
      parentId: sequenceId1,
    });
    const { contentId: docId2 } = await createContent({
      loggedInUserId: ownerId1,
      contentType: "singleDoc",
      parentId: selectId1,
    });
    const { contentId: docId3 } = await createContent({
      loggedInUserId: ownerId1,
      contentType: "singleDoc",
      parentId: selectId1,
    });

    // owner 2 copies problem set 1 to problem set 2 and makes it public
    const {
      newContentIds: [sequenceId2],
    } = await copyContent({
      contentIds: [sequenceId1],
      loggedInUserId: ownerId2,
      parentId: null,
    });
    await setContentIsPublic({
      contentId: sequenceId2,
      loggedInUserId: ownerId2,
      isPublic: true,
    });

    // owner 3 copies question bank 2 to question bank 3 and makes it public

    const sequence2 = await getContent({
      contentId: sequenceId2,
      loggedInUserId: ownerId3,
    });
    if (sequence2.type !== "sequence") {
      throw Error("Shouldn't happen");
    }

    const selectId2 = sequence2.children[1].contentId;

    const {
      newContentIds: [selectId3],
    } = await copyContent({
      contentIds: [selectId2],
      loggedInUserId: ownerId3,
      parentId: null,
    });

    await setContentIsPublic({
      contentId: selectId3,
      loggedInUserId: ownerId3,
      isPublic: true,
    });

    // owner 4 copies first problem of question bank 3 (call it document 4) to document 5

    const select3 = await getContent({
      contentId: selectId3,
      loggedInUserId: ownerId4,
    });
    if (select3.type !== "select") {
      throw Error("Shouldn't happen");
    }

    const docId4 = select3.children[0].contentId;

    const {
      newContentIds: [docId5],
    } = await copyContent({
      contentIds: [docId4],
      loggedInUserId: ownerId4,
      parentId: null,
    });
    await setContentIsPublic({
      contentId: docId5,
      loggedInUserId: ownerId4,
      isPublic: true,
    });

    // problem set 2 is only remix of problem set 1
    let remixes = (await getRemixes({ contentId: sequenceId1 })).remixes;
    expect(remixes.length).eq(1);
    expect(remixes[0].remixContent.contentId).eqls(sequenceId2);

    // question bank 2 and 3 are remixes of question bank 1
    remixes = (await getRemixes({ contentId: selectId1 })).remixes;
    expect(remixes.length).eq(2);
    expect(remixes[0].remixContent.contentId).eqls(selectId3);
    expect(remixes[1].remixContent.contentId).eqls(selectId2);

    // document 1 has one remix
    remixes = (
      await getRemixes({
        contentId: docId1,
      })
    ).remixes;
    expect(remixes.length).eq(1);

    // document 2 has three remixes, the most recent being doc 5 and doc 4
    remixes = (await getRemixes({ contentId: docId2 })).remixes;
    expect(remixes.length).eq(3);
    expect(remixes[0].remixContent.contentId).eqls(docId5);
    expect(remixes[1].remixContent.contentId).eqls(docId4);

    // document 3 has two remixes
    remixes = (
      await getRemixes({
        contentId: docId3,
      })
    ).remixes;
    expect(remixes.length).eq(2);

    // doc5 is remixed from 3, including doc 4 and doc 2
    let remixSources = (
      await getRemixSources({
        contentId: docId5,
      })
    ).remixSources;
    expect(remixSources.length).eq(3);
    expect(remixSources[0].originContent.contentId).eqls(docId4);
    expect(remixSources[2].originContent.contentId).eqls(docId2);

    // question bank 3 is remixed from question banks 2 and 1
    remixSources = (
      await getRemixSources({
        contentId: selectId3,
      })
    ).remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(selectId2);
    expect(remixSources[1].originContent.contentId).eqls(selectId1);
  });

  async function createRemixChainOfThree(ownerIds: Uint8Array[]) {
    const contentIds: Uint8Array[] = [];

    for (const idx of [0, 1, 2]) {
      if (idx === 0) {
        // create public activity 0 by owner 0
        contentIds.push(
          (
            await createContent({
              loggedInUserId: ownerIds[idx],
              contentType: "singleDoc",
              parentId: null,
            })
          ).contentId,
        );

        await updateContent({
          contentId: contentIds[0],
          source: "Initial content",
          loggedInUserId: ownerIds[0],
        });
      } else {
        // create activity idx that copies activity idx-1
        contentIds.push(
          ...(
            await copyContent({
              contentIds: [contentIds[idx - 1]],
              loggedInUserId: ownerIds[idx],
              parentId: null,
            })
          ).newContentIds,
        );
      }

      await setContentIsPublic({
        contentId: contentIds[idx],
        loggedInUserId: ownerIds[idx],
        isPublic: true,
      });
    }

    return contentIds;
  }

  const checkRemix = function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    remix: any,
    from: number,
    to: number,
    contentIds: Uint8Array[],
    updatedIndices: number[],
  ) {
    const fromChanged = updatedIndices.includes(from);
    const toChanged = updatedIndices.includes(to);

    // if both to and from were changed, then the link should be updated to match their second revisions
    const revisionNum = fromChanged && toChanged ? 2 : 1;

    expect(remix.originContent.contentId).eqls(contentIds[from]);
    expect(remix.originContent.changed).eq(fromChanged && !toChanged);
    expect(remix.originContent.revisionNum).eq(revisionNum);
    expect(remix.remixContent.contentId).eqls(contentIds[to]);
    expect(remix.remixContent.changed).eq(toChanged && !fromChanged);
    expect(remix.remixContent.revisionNum).eq(revisionNum);
  };

  const checkAllRemixesAmongThree = async function (
    contentIds: Uint8Array[],
    updatedIndices: number[],
  ) {
    // remix sources and remixes show change
    let remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    checkRemix(remixSources[0], 0, 1, contentIds, updatedIndices);

    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    checkRemix(remixSources[0], 1, 2, contentIds, updatedIndices);
    checkRemix(remixSources[1], 0, 2, contentIds, updatedIndices);

    let remixes = (await getRemixes({ contentId: contentIds[0] })).remixes;
    expect(remixes.length).eq(2);
    checkRemix(remixes[0], 0, 2, contentIds, updatedIndices);
    checkRemix(remixes[1], 0, 1, contentIds, updatedIndices);

    remixes = (await getRemixes({ contentId: contentIds[1] })).remixes;
    expect(remixes.length).eq(1);
    checkRemix(remixes[0], 1, 2, contentIds, updatedIndices);
  };

  test("Change in origin source detected in remixSources", async () => {
    const ownerIds = [
      (await createTestUser()).userId,
      (await createTestUser()).userId,
      (await createTestUser()).userId,
    ];

    const contentIds = await createRemixChainOfThree(ownerIds);

    const updatedIndices: number[] = [];

    // no changes in remix sources at first
    await checkAllRemixesAmongThree(contentIds, updatedIndices);

    // change activity 1 source, detected in remix sources
    await updateContent({
      contentId: contentIds[0],
      source: "Changed content",
      loggedInUserId: ownerIds[0],
    });
    updatedIndices.push(0);

    await checkAllRemixesAmongThree(contentIds, updatedIndices);

    // Changing content back to original shows no longer changed
    await updateContent({
      contentId: contentIds[0],
      source: "Initial content",
      loggedInUserId: ownerIds[0],
    });

    updatedIndices.pop();
    await checkAllRemixesAmongThree(contentIds, updatedIndices);
  });

  test("Change in origin doenetML version detected in remixSources", async () => {
    const ownerIds = [
      (await createTestUser()).userId,
      (await createTestUser()).userId,
      (await createTestUser()).userId,
    ];

    const contentIds = await createRemixChainOfThree(ownerIds);

    const updatedIndices: number[] = [];

    // no changes in remix sources at first
    await checkAllRemixesAmongThree(contentIds, updatedIndices);

    const { allDoenetmlVersions: allVersions } = await getAllDoenetmlVersions();
    const oldVersion = allVersions.find(
      (v) => v.displayedVersion === "0.6",
    )!.id;

    // change activity 1 DoenetML version, detected in remix sources
    await updateContent({
      contentId: contentIds[0],
      doenetmlVersionId: oldVersion,
      loggedInUserId: ownerIds[0],
    });
    updatedIndices.push(0);

    await checkAllRemixesAmongThree(contentIds, updatedIndices);

    // Changing DoenetML version back to original shows no longer changed
    const defaultVersion = allVersions.find((v) => v.default)!.id;

    await updateContent({
      contentId: contentIds[0],
      doenetmlVersionId: defaultVersion,
      loggedInUserId: ownerIds[0],
    });

    updatedIndices.pop();
    await checkAllRemixesAmongThree(contentIds, updatedIndices);
  });

  test("Change in remix detected in remixes", async () => {
    const ownerIds = [
      (await createTestUser()).userId,
      (await createTestUser()).userId,
      (await createTestUser()).userId,
    ];

    const contentIds = await createRemixChainOfThree(ownerIds);

    const updatedIndices: number[] = [];

    // no changes in remixes at first
    await checkAllRemixesAmongThree(contentIds, updatedIndices);

    // change activity 2 source, detected in remixes
    await updateContent({
      contentId: contentIds[2],
      source: "Changed content",
      loggedInUserId: ownerIds[2],
    });

    updatedIndices.push(2);
    await checkAllRemixesAmongThree(contentIds, updatedIndices);

    // change content back to original shows no change
    await updateContent({
      contentId: contentIds[2],
      source: "Initial content",
      loggedInUserId: ownerIds[2],
    });
    updatedIndices.pop();
    await checkAllRemixesAmongThree(contentIds, updatedIndices);
  });

  async function testUpdatingRemixChainOfThree({
    firstUpdated,
    secondUpdated,
    thirdUpdated,
    inSeries,
  }: {
    firstUpdated: number;
    secondUpdated: number;
    thirdUpdated: number;
    inSeries: boolean;
  }) {
    const ownerIds = [
      (await createTestUser()).userId,
      (await createTestUser()).userId,
      (await createTestUser()).userId,
    ];

    const contentIds = await createRemixChainOfThree(ownerIds);

    // change activity firstUpdated
    await updateContent({
      contentId: contentIds[firstUpdated],
      source: "Updated content",
      loggedInUserId: ownerIds[firstUpdated],
    });

    const updatedIndices = [firstUpdated];

    await checkAllRemixesAmongThree(contentIds, updatedIndices);

    // update activity secondUpdated from current state of activity firstUpdated
    if (secondUpdated > firstUpdated) {
      await updateRemixedContentToOrigin({
        originContentId: contentIds[firstUpdated],
        remixContentId: contentIds[secondUpdated],
        loggedInUserId: ownerIds[secondUpdated],
      });
    } else {
      await updateOriginContentToRemix({
        originContentId: contentIds[secondUpdated],
        remixContentId: contentIds[firstUpdated],
        loggedInUserId: ownerIds[secondUpdated],
      });
    }

    let newContent = await getDocEditorDoenetML({
      contentId: contentIds[secondUpdated],
      loggedInUserId: ownerIds[secondUpdated],
    });
    expect(newContent.source).eq("Updated content");

    updatedIndices.push(secondUpdated);
    await checkAllRemixesAmongThree(contentIds, updatedIndices);

    // update activity thirdUpdated. Update it from secondUpdate if inSeries, else from firstUpdated
    const copiedId = inSeries ? secondUpdated : firstUpdated;

    if (copiedId < thirdUpdated) {
      await updateRemixedContentToOrigin({
        originContentId: contentIds[copiedId],
        remixContentId: contentIds[thirdUpdated],
        loggedInUserId: ownerIds[thirdUpdated],
      });
    } else {
      await updateOriginContentToRemix({
        originContentId: contentIds[thirdUpdated],
        remixContentId: contentIds[copiedId],
        loggedInUserId: ownerIds[thirdUpdated],
      });
    }

    newContent = await getDocEditorDoenetML({
      contentId: contentIds[thirdUpdated],
      loggedInUserId: ownerIds[thirdUpdated],
    });
    expect(newContent.source).eq("Updated content");

    updatedIndices.push(thirdUpdated);
    await checkAllRemixesAmongThree(contentIds, updatedIndices);
  }

  test(
    "Update remixed chain of three to changed content, test all 12 orders",
    { timeout: 50000 },
    async () => {
      for (let firstUpdated = 0; firstUpdated < 3; firstUpdated++) {
        for (let secondUpdated = 0; secondUpdated < 3; secondUpdated++) {
          if (secondUpdated === firstUpdated) {
            continue;
          }
          for (let thirdUpdated = 0; thirdUpdated < 3; thirdUpdated++) {
            if (
              thirdUpdated === firstUpdated ||
              thirdUpdated === secondUpdated
            ) {
              continue;
            }
            for (const inSeries of [true, false]) {
              await testUpdatingRemixChainOfThree({
                firstUpdated,
                secondUpdated,
                thirdUpdated,
                inSeries,
              });
            }
          }
        }
      }
    },
  );

  test("Update remixed to previous revision of origin", async () => {
    const ownerIds = [
      (await createTestUser()).userId,
      (await createTestUser()).userId,
      (await createTestUser()).userId,
    ];

    const contentIds = await createRemixChainOfThree(ownerIds);

    // change activity 0 source, create revision, then change again
    await updateContent({
      contentId: contentIds[0],
      source: "Changed content 1",
      loggedInUserId: ownerIds[0],
    });

    await createContentRevision({
      contentId: contentIds[0],
      loggedInUserId: ownerIds[0],
      revisionName: "a revision",
    });

    await updateContent({
      contentId: contentIds[0],
      source: "Changed content 2",
      loggedInUserId: ownerIds[0],
    });

    // show we have a change in 0
    let remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(true);
    expect(remixSources[1].originContent.revisionNum).eq(1);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(1);

    // update 1 to a revision of 0 that isn't the current state
    await updateRemixedContentToOrigin({
      originContentId: contentIds[0],
      originRevisionNum: 2,
      remixContentId: contentIds[1],
      loggedInUserId: ownerIds[1],
    });

    // remix sources has updated for 1, but shows still changed
    remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(2);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(2);

    // 2 sees that 1 changed
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(true);
    expect(remixSources[1].originContent.revisionNum).eq(1);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(1);

    // 1 content at first update
    let newContent = await getDocEditorDoenetML({
      contentId: contentIds[1],
      loggedInUserId: ownerIds[1],
    });
    expect(newContent.source).eq("Changed content 1");

    // update 2 to 1
    await updateRemixedContentToOrigin({
      originContentId: contentIds[1],
      remixContentId: contentIds[2],
      loggedInUserId: ownerIds[2],
    });

    // same as before for 1
    remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(2);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(2);

    // everything updated to revision 2, even though see 0 is still changed
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(2);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(2);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(true);
    expect(remixSources[1].originContent.revisionNum).eq(2);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(2);

    // 2 is also at first update
    newContent = await getDocEditorDoenetML({
      contentId: contentIds[2],
      loggedInUserId: ownerIds[2],
    });
    expect(newContent.source).eq("Changed content 1");

    // 0 is at second update
    newContent = await getDocEditorDoenetML({
      contentId: contentIds[0],
      loggedInUserId: ownerIds[0],
    });
    expect(newContent.source).eq("Changed content 2");

    // content 1 and 2 should have revisions before and after updating
    for (let idx = 1; idx <= 2; idx++) {
      const { revisions: allManualRevisions } = await getDocEditorHistory({
        contentId: contentIds[idx],
        loggedInUserId: ownerIds[idx],
      });

      expect(allManualRevisions).toMatchObject([
        {
          revisionNum: 2,
          revisionName: "After update",
          source: "Changed content 1",
        },
        {
          revisionNum: 1,
          // Note: both activities 1 and 2 had manual revisions "Initial save point" when created from remixing, which weren't overwritten
          revisionName: "Initial save point",
          source: "Initial content",
        },
      ]);
    }
  });

  test("Update origin to previous revision of remixed", async () => {
    const ownerIds = [
      (await createTestUser()).userId,
      (await createTestUser()).userId,
      (await createTestUser()).userId,
    ];

    const contentIds = await createRemixChainOfThree(ownerIds);

    // change activity 1 source, create revision, then change again
    await updateContent({
      contentId: contentIds[1],
      source: "Changed content 1",
      loggedInUserId: ownerIds[1],
    });

    await createContentRevision({
      contentId: contentIds[1],
      loggedInUserId: ownerIds[1],
      revisionName: "a revision",
    });

    await updateContent({
      contentId: contentIds[1],
      source: "Changed content 2",
      loggedInUserId: ownerIds[1],
    });

    // show we have a change in 1
    let remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(true);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(false);
    expect(remixSources[1].originContent.revisionNum).eq(1);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(1);

    // update 0 to a revision of 1 that isn't the current state
    await updateOriginContentToRemix({
      originContentId: contentIds[0],
      remixContentId: contentIds[1],
      remixRevisionNum: 2,
      loggedInUserId: ownerIds[0],
    });

    // remix sources has updated for 1, but shows still changed
    remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(2);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(true);
    expect(remixSources[0].remixContent.revisionNum).eq(2);

    // 2 sees that 0 changed
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(true);
    expect(remixSources[1].originContent.revisionNum).eq(1);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(1);

    // 9 content at first update
    let newContent = await getDocEditorDoenetML({
      contentId: contentIds[0],
      loggedInUserId: ownerIds[0],
    });
    expect(newContent.source).eq("Changed content 1");

    // update 2 to 0
    await updateRemixedContentToOrigin({
      originContentId: contentIds[0],
      remixContentId: contentIds[2],
      loggedInUserId: ownerIds[2],
    });

    // same as before for 1
    remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(2);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(true);
    expect(remixSources[0].remixContent.revisionNum).eq(2);

    // everything updated to revision 2, even though see 1 is still changed
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(2);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(2);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(false);
    expect(remixSources[1].originContent.revisionNum).eq(2);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(2);

    // 2 is also at first update
    newContent = await getDocEditorDoenetML({
      contentId: contentIds[2],
      loggedInUserId: ownerIds[2],
    });
    expect(newContent.source).eq("Changed content 1");

    // 1 is at second update
    newContent = await getDocEditorDoenetML({
      contentId: contentIds[1],
      loggedInUserId: ownerIds[1],
    });
    expect(newContent.source).eq("Changed content 2");

    // content 0 and 2 should have revisions before and after updating
    for (let idx = 0; idx <= 2; idx += 2) {
      const { revisions: allManualRevisions } = await getDocEditorHistory({
        contentId: contentIds[idx],
        loggedInUserId: ownerIds[idx],
      });

      expect(allManualRevisions).toMatchObject([
        {
          revisionNum: 2,
          revisionName: "After update",
          source: "Changed content 1",
        },
        {
          revisionNum: 1,
          // Note: activity 0 did not have any manual revisions before the update, so its revision is named from the update.
          // Activity 1, however, had a manual revision "Initial save point", when it was created by remixing, which doesn't get overwritten.
          revisionName: idx === 0 ? "Before update" : "Initial save point",
          source: "Initial content",
        },
      ]);
    }
  });

  test("Remixed/origin ignores updates to origin/remix", async () => {
    const ownerIds = [
      (await createTestUser()).userId,
      (await createTestUser()).userId,
      (await createTestUser()).userId,
    ];

    const contentIds = await createRemixChainOfThree(ownerIds);

    // change activity 1 source
    await updateContent({
      contentId: contentIds[1],
      source: "Changed content",
      loggedInUserId: ownerIds[1],
    });

    // show we have a change in 1
    let remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(true);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(false);
    expect(remixSources[1].originContent.revisionNum).eq(1);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(1);

    // 0 ignores that update in 1
    await updateOriginContentToRemix({
      originContentId: contentIds[0],
      remixContentId: contentIds[1],
      loggedInUserId: ownerIds[0],
      onlyMarkUnchanged: true,
    });

    // remixSources now shows no change from 0 to 1, updating only the revision of 1
    remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(2);

    // 2 sees only that 1 changed
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(false);
    expect(remixSources[1].originContent.revisionNum).eq(1);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(1);

    // 2 ignores change to 1
    await updateRemixedContentToOrigin({
      originContentId: contentIds[1],
      remixContentId: contentIds[2],
      loggedInUserId: ownerIds[2],
      onlyMarkUnchanged: true,
    });

    // same as before for 1
    remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(2);

    // now show no changes, even though only 1 is updated to revision 2
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(2);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(false);
    expect(remixSources[1].originContent.revisionNum).eq(1);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(1);

    // 0 and 2 are at original content
    let newContent = await getDocEditorDoenetML({
      contentId: contentIds[0],
      loggedInUserId: ownerIds[0],
    });
    expect(newContent.source).eq("Initial content");
    newContent = await getDocEditorDoenetML({
      contentId: contentIds[2],
      loggedInUserId: ownerIds[2],
    });
    expect(newContent.source).eq("Initial content");

    // 1 is updated
    newContent = await getDocEditorDoenetML({
      contentId: contentIds[1],
      loggedInUserId: ownerIds[1],
    });
    expect(newContent.source).eq("Changed content");
  });

  test("When ignore change to origin also ignore matched change to remix", async () => {
    const ownerIds = [
      (await createTestUser()).userId,
      (await createTestUser()).userId,
      (await createTestUser()).userId,
    ];

    const contentIds = await createRemixChainOfThree(ownerIds);

    // change activity 0 source
    await updateContent({
      contentId: contentIds[0],
      source: "Changed content",
      loggedInUserId: ownerIds[0],
    });

    // show we have a change in 0
    let remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(true);
    expect(remixSources[1].originContent.revisionNum).eq(1);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(1);

    // 2 updates to the change to 0
    await updateRemixedContentToOrigin({
      originContentId: contentIds[0],
      remixContentId: contentIds[2],
      loggedInUserId: ownerIds[2],
    });

    // same as before for 1-0 relationship
    remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(true);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);

    // 2 matched to 0, both at revision 2
    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(true);
    expect(remixSources[0].remixContent.revisionNum).eq(1);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(false);
    expect(remixSources[1].originContent.revisionNum).eq(2);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(2);

    // 1 ignores change to 0
    await updateRemixedContentToOrigin({
      originContentId: contentIds[0],
      remixContentId: contentIds[1],
      loggedInUserId: ownerIds[1],
      onlyMarkUnchanged: true,
    });

    // no changes, everyone to revision 2 except 1
    remixSources = (await getRemixSources({ contentId: contentIds[1] }))
      .remixSources;
    expect(remixSources.length).eq(1);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(2);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(1);

    remixSources = (await getRemixSources({ contentId: contentIds[2] }))
      .remixSources;
    expect(remixSources.length).eq(2);
    expect(remixSources[0].originContent.contentId).eqls(contentIds[1]);
    expect(remixSources[0].originContent.changed).eq(false);
    expect(remixSources[0].originContent.revisionNum).eq(1);
    expect(remixSources[0].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[0].remixContent.changed).eq(false);
    expect(remixSources[0].remixContent.revisionNum).eq(2);
    expect(remixSources[1].originContent.contentId).eqls(contentIds[0]);
    expect(remixSources[1].originContent.changed).eq(false);
    expect(remixSources[1].originContent.revisionNum).eq(2);
    expect(remixSources[1].remixContent.contentId).eqls(contentIds[2]);
    expect(remixSources[1].remixContent.changed).eq(false);
    expect(remixSources[1].remixContent.revisionNum).eq(2);

    // 1 is at original content
    let newContent = await getDocEditorDoenetML({
      contentId: contentIds[1],
      loggedInUserId: ownerIds[1],
    });
    expect(newContent.source).eq("Initial content");

    // 0 and 2 are updated
    newContent = await getDocEditorDoenetML({
      contentId: contentIds[0],
      loggedInUserId: ownerIds[0],
    });
    expect(newContent.source).eq("Changed content");
    newContent = await getDocEditorDoenetML({
      contentId: contentIds[2],
      loggedInUserId: ownerIds[2],
    });
    expect(newContent.source).eq("Changed content");
  });
});
