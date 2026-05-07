import { prisma } from "../model";
import { ActivityRemixItem, LicenseCode, RemixContent } from "../types";
import { getCidV1FromString } from "@doenet-tools/shared";
import { compileActivityFromContent } from "../utils/contentStructure";
import { createFullName } from "../utils/names";
import {
  filterEditableActivity,
  filterViewableActivity,
  filterViewableContent,
  getIsEditor,
} from "../utils/permissions";
import { createContentRevision } from "./activity";
import { getContent } from "./activity_edit_view";
import { maskLibraryUserInfo } from "./curate";

/**
 * Get the `source` and, if a Doc, `doenetMLVersion`, from the content with `contentId` viewable by `loggedInUserId`.
 * The behavior depends on whether or not `fromRevisionNum` is specified.
 *
 * ### `fromRevision` is not specified
 *
 * For Docs, return the `source` database field from the `content` table.
 * Otherwise compile the activity json and stringify that for the source
 *
 * For Docs, also return the full doenetml version, unless `useVersionId` is `true`,
 * in which case, return the doenetmlVersionId.
 *
 * If not a Doc and `useVersionId` is `true`, then compile the activity json where use doenetmlVersionId
 * rather than the full doenetml version. Useful for generating a cid from the source
 * that won't change if we upgrade the minor version for all documents (though it does not
 * produce a valid source for viewing the activity).
 *
 * ### `fromRevision` is specified
 *
 * Return the `source` and, if a Doc, full doenetml version from the `contentRevisions` table
 * with `contentId` and revisionNum equal to `fromRevisionNum`.
 *
 * When `fromRevisionNum` is specified, `useVersionIds` is ignored, given that the source (for non Docs) stored in `contentRevisions`
 * includes full doenetml versions.
 *
 * In addition to returning `source` and, if Doc, the full `doenetmlVersion`, also return additional fields
 * from `contentRevision`: revisionNum, revisionName, and note,
 */
async function getContentSource({
  contentId,
  loggedInUserId = new Uint8Array(16),
  useVersionIds = false,
  fromRevisionNum,
}: {
  contentId: Uint8Array;
  loggedInUserId?: Uint8Array;
  useVersionIds?: boolean;
  fromRevisionNum?: number;
}) {
  const isEditor = await getIsEditor(loggedInUserId);

  if (fromRevisionNum === undefined) {
    const content = await getContent({ contentId, loggedInUserId, isEditor });
    let source: string;
    let doenetMLVersion: string | null = null;

    if (content.type === "singleDoc") {
      source = content.doenetML;
      doenetMLVersion = useVersionIds
        ? content.doenetmlVersion.id.toString()
        : content.doenetmlVersion.fullVersion;
    } else {
      source = JSON.stringify(
        compileActivityFromContent(content, useVersionIds),
      );
    }

    return { source, doenetMLVersion };
  } else {
    const revisionPrelim = await prisma.contentRevisions.findUniqueOrThrow({
      where: {
        contentId_revisionNum: { contentId, revisionNum: fromRevisionNum },
        content: filterViewableContent(loggedInUserId, isEditor),
      },
      select: {
        source: true,
        doenetmlVersion: { select: { fullVersion: true } },
        revisionNum: true,
        revisionName: true,
        note: true,
      },
    });

    const { doenetmlVersion, ...revision } = revisionPrelim;

    return {
      ...revision,
      doenetMLVersion: doenetmlVersion?.fullVersion ?? null,
    };
  }
}

export async function getRemixSources({
  contentId,
  loggedInUserId = new Uint8Array(16),
  isEditor,
  includeSource = false,
}: {
  contentId: Uint8Array;
  loggedInUserId?: Uint8Array;
  isEditor?: boolean;
  includeSource?: boolean;
}): Promise<{ remixSources: ActivityRemixItem[] }> {
  if (isEditor === undefined) {
    isEditor = await getIsEditor(loggedInUserId);
  }

  const prelimRemixSources = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ...filterViewableActivity(loggedInUserId, isEditor),
    },
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          userId: true,
          firstNames: true,
          lastNames: true,
        },
      },
      contentRevisions: {
        select: {
          revisionNum: true,
          cid: true,
          contributorHistoryAsRemix: {
            where: {
              originContent: {
                content: {
                  ...filterViewableActivity(loggedInUserId, isEditor),
                },
              },
            },
            orderBy: { timestampOriginContent: "desc" },
            select: {
              withLicenseCode: true,
              timestampRemixContent: true,
              timestampOriginContent: true,
              directCopy: true,
              originContent: {
                select: {
                  revisionNum: true,
                  cid: true,
                  content: {
                    select: {
                      id: true,
                      name: true,
                      owner: {
                        select: {
                          userId: true,
                          firstNames: true,
                          lastNames: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const remixSources: ActivityRemixItem[] = [];

  const remixBaseInfo = {
    contentId: prelimRemixSources.id,
    name: prelimRemixSources.name,
    owner: prelimRemixSources.owner,
  };

  const remixCurrentSource = await getContentSource({
    contentId: prelimRemixSources.id,
    loggedInUserId,
    useVersionIds: true,
  });

  let remixCurrentCid;
  if (remixCurrentSource.doenetMLVersion) {
    remixCurrentCid = await getCidV1FromString(
      remixCurrentSource.doenetMLVersion + "|" + remixCurrentSource.source,
    );
  } else {
    remixCurrentCid = await getCidV1FromString(remixCurrentSource.source);
  }

  for (const revision of prelimRemixSources.contentRevisions) {
    const remixRevisionInfo = {
      ...remixBaseInfo,
      revisionNum: revision.revisionNum,
      cidAtLastUpdate: revision.cid,
      currentCid: remixCurrentCid,
      changed: remixCurrentCid != revision.cid,
    };
    for (const historyItem of revision.contributorHistoryAsRemix) {
      const remixContent: RemixContent = {
        ...remixRevisionInfo,
        timestamp: historyItem.timestampRemixContent,
      };

      const originRevisionContent = historyItem.originContent;

      const originCidAtLastUpdate = originRevisionContent.cid;

      const originCurrentSource = await getContentSource({
        contentId: originRevisionContent.content.id,
        loggedInUserId,
        useVersionIds: true,
      });

      let originCurrentCid;
      if (originCurrentSource.doenetMLVersion) {
        originCurrentCid = await getCidV1FromString(
          originCurrentSource.doenetMLVersion +
            "|" +
            originCurrentSource.source,
        );
      } else {
        originCurrentCid = await getCidV1FromString(originCurrentSource.source);
      }

      const originContent: RemixContent = {
        contentId: originRevisionContent.content.id,
        revisionNum: originRevisionContent.revisionNum,
        timestamp: historyItem.timestampOriginContent,
        name: originRevisionContent.content.name,
        owner: originRevisionContent.content.owner,
        cidAtLastUpdate: originCidAtLastUpdate,
        currentCid: originCurrentCid,
        changed: originCurrentCid !== originCidAtLastUpdate,
      };

      if (includeSource) {
        // get source again, this time without using versionIds
        const originCurrentSource2 = await getContentSource({
          contentId: originRevisionContent.content.id,
          loggedInUserId,
        });
        originContent.source = originCurrentSource2.source;
        originContent.doenetmlVersion =
          originCurrentSource2.doenetMLVersion ?? undefined;
      }

      remixSources.push({
        originContent,
        remixContent,
        withLicenseCode: historyItem.withLicenseCode
          ? (historyItem.withLicenseCode as LicenseCode)
          : null,
        directCopy: historyItem.directCopy,
      });
    }
  }

  // re-sort according to originContent.timestamp, descending,
  // since could have different revision numbers
  remixSources.sort(
    (a, b) =>
      b.originContent.timestamp.getTime() - a.originContent.timestamp.getTime(),
  );

  // Replace library owner info with source owner info
  const curatedUsers = await Promise.all(
    remixSources.map(
      async (remix) =>
        await maskLibraryUserInfo({
          contentId: remix.originContent.contentId,
          owner: remix.originContent.owner,
        }),
    ),
  );
  for (let i = 0; i < remixSources.length; i++) {
    remixSources[i].originContent.owner = curatedUsers[i];
  }

  return { remixSources };
}

export async function getRemixes({
  contentId,
  loggedInUserId = new Uint8Array(16),
  includeSource = false,
  // directRemixesOnly = false,
}: {
  contentId: Uint8Array;
  loggedInUserId?: Uint8Array;
  includeSource?: boolean;
  // directRemixesOnly?: boolean;
}): Promise<{ remixes: ActivityRemixItem[] }> {
  const isEditor = await getIsEditor(loggedInUserId);

  // const directFilter = directRemixesOnly
  //   ? {
  //       directCopy: true,
  //     }
  //   : {};

  const prelimRemixes = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ...filterViewableActivity(loggedInUserId, isEditor),
    },
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          userId: true,
          firstNames: true,
          lastNames: true,
        },
      },
      contentRevisions: {
        select: {
          revisionNum: true,
          cid: true,
          contributorHistoryAsOrigin: {
            where: {
              remixContent: {
                content: {
                  ...filterViewableActivity(loggedInUserId, isEditor),
                },
              },
              // ...directFilter,
            },
            orderBy: { timestampRemixContent: "desc" },
            select: {
              withLicenseCode: true,
              timestampRemixContent: true,
              timestampOriginContent: true,
              directCopy: true,
              remixContent: {
                select: {
                  revisionNum: true,
                  cid: true,
                  content: {
                    select: {
                      id: true,
                      name: true,
                      owner: {
                        select: {
                          userId: true,
                          firstNames: true,
                          lastNames: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const remixes: ActivityRemixItem[] = [];

  const originBaseInfo = {
    contentId: prelimRemixes.id,
    name: prelimRemixes.name,
    owner: prelimRemixes.owner,
  };

  const originCurrentSource = await getContentSource({
    contentId: prelimRemixes.id,
    loggedInUserId,
    useVersionIds: true,
  });

  let originCurrentCid;
  if (originCurrentSource.doenetMLVersion) {
    originCurrentCid = await getCidV1FromString(
      originCurrentSource.doenetMLVersion + "|" + originCurrentSource.source,
    );
  } else {
    originCurrentCid = await getCidV1FromString(originCurrentSource.source);
  }

  for (const revision of prelimRemixes.contentRevisions) {
    const originRevisionInfo = {
      ...originBaseInfo,
      revisionNum: revision.revisionNum,
      cidAtLastUpdate: revision.cid,
      currentCid: originCurrentCid,
      changed: originCurrentCid != revision.cid,
    };
    for (const historyItem of revision.contributorHistoryAsOrigin) {
      const originContent: RemixContent = {
        ...originRevisionInfo,
        timestamp: historyItem.timestampOriginContent,
      };

      const remixRevisionContent = historyItem.remixContent;

      const remixCidAtRemix = remixRevisionContent.cid;

      const remixCurrentSource = await getContentSource({
        contentId: remixRevisionContent.content.id,
        loggedInUserId,
        useVersionIds: true,
      });

      let remixCurrentCid;
      if (remixCurrentSource.doenetMLVersion) {
        remixCurrentCid = await getCidV1FromString(
          remixCurrentSource.doenetMLVersion + "|" + remixCurrentSource.source,
        );
      } else {
        remixCurrentCid = await getCidV1FromString(remixCurrentSource.source);
      }

      const remixContent: RemixContent = {
        contentId: remixRevisionContent.content.id,
        revisionNum: remixRevisionContent.revisionNum,
        timestamp: historyItem.timestampRemixContent,
        name: remixRevisionContent.content.name,
        owner: remixRevisionContent.content.owner,
        cidAtLastUpdate: remixCidAtRemix,
        currentCid: remixCurrentCid,
        changed: remixCurrentCid !== remixCidAtRemix,
      };

      if (includeSource) {
        // get source again, this time without using versionIds
        const remixCurrentSource2 = await getContentSource({
          contentId: remixRevisionContent.content.id,
          loggedInUserId,
        });
        remixContent.source = remixCurrentSource2.source;
        remixContent.doenetmlVersion =
          remixCurrentSource2.doenetMLVersion ?? undefined;
      }

      remixes.push({
        originContent,
        remixContent,
        withLicenseCode: historyItem.withLicenseCode
          ? (historyItem.withLicenseCode as LicenseCode)
          : null,
        directCopy: historyItem.directCopy,
      });
    }
  }

  // re-sort according to remixContent.timestamp, descending,
  // since could have different revision numbers
  remixes.sort(
    (a, b) =>
      b.remixContent.timestamp.getTime() - a.remixContent.timestamp.getTime(),
  );

  // Replace library owner info with source owner info
  const curatedUsers = await Promise.all(
    remixes.map(
      async (remix) =>
        await maskLibraryUserInfo({
          contentId: remix.remixContent.contentId,
          owner: remix.remixContent.owner,
        }),
    ),
  );
  for (let i = 0; i < remixes.length; i++) {
    remixes[i].remixContent.owner = curatedUsers[i];
  }

  return { remixes };
}

/**
 * Update `remixContentId` by `loggedInUserId` to match `originRevisionNum` of `originContentId`,
 * where `remixContentId` must have been remixed (possibly indirectly) from `originContentId`.
 * Update contributor history to link the new revision of `remixContentId` to `originRevisionNum`
 * of `originContentId` so the change in both of them is no longer identified.
 *
 * If `onlyMarkUnchanged` is `true`, however, then don't actually update `remixContentId`,
 * but only update contributor history to link the unchanged revision of `remixContentId`
 * to `originRevisionNum` of `originContentId`.
 *
 * If `originRevisionNum` is not specified, then create a new revision of `originContentId`
 * from its current content and use that revision number.
 *
 * In addition look for other content that `remixContentId` was remixed from
 * or that were remixed from `remixContentId`.
 * If any of them have already incorporated that change of `originRevisionNum` of `originContentId`,
 * then also update the contributor history between `remixContentId` and that activity
 * (updating the revision number of `remixContentId` only if `onlyMarkedChange` is `false`.)
 *
 * Note: currently implemented only for Docs.
 */
export async function updateRemixedContentToOrigin({
  originContentId,
  originRevisionNum,
  remixContentId,
  loggedInUserId,
  onlyMarkUnchanged = false,
}: {
  originContentId: Uint8Array;
  originRevisionNum?: number;
  remixContentId: Uint8Array;
  loggedInUserId: Uint8Array;
  onlyMarkUnchanged?: boolean;
}) {
  // verify relation exists and logged in userId has edit access to the remix and view access to the origin
  await prisma.contributorHistory.findUniqueOrThrow({
    where: {
      remixContentId_originContentId: { originContentId, remixContentId },
      originContent: {
        content: {
          ...filterViewableActivity(loggedInUserId),
          type: "singleDoc",
        },
      },
      remixContent: {
        content: {
          ...filterEditableActivity(loggedInUserId),
          type: "singleDoc",
        },
      },
    },
  });

  // if originRevisionNum is not supplied, it means update from the current content,
  // so create (or find) a revision corresponding to the current content
  if (originRevisionNum === undefined) {
    const originContentRevision = await createContentRevision({
      contentId: originContentId,
      loggedInUserId,
      revisionName: "Created due to being remixed",
      autoGenerated: true,
    });
    originRevisionNum = originContentRevision.revisionNum;
  }

  const revisionToCopy = await prisma.contentRevisions.findUniqueOrThrow({
    where: {
      contentId_revisionNum: {
        contentId: originContentId,
        revisionNum: originRevisionNum,
      },
    },
    select: {
      source: true,
      doenetmlVersionId: true,
      cid: true,
      content: {
        select: {
          name: true,
          owner: true,
        },
      },
    },
  });

  const newSource = revisionToCopy.source;
  const newDoenetmlVersionId = revisionToCopy.doenetmlVersionId;

  const originContent = revisionToCopy.content;

  let remixRevisionNum: number | undefined;

  if (!onlyMarkUnchanged) {
    // If remixed content has changed since it was originally remixed,
    // create a revision as a save point.
    // It is a manual revision, as it would be expected in revision list.
    // But, set `renameMatching` to `false` to not rename if there already was a matching manual revision.
    await createContentRevision({
      contentId: remixContentId,
      loggedInUserId,
      revisionName: "Before update",
      note: `Save point before updating to: ${originContent.name} by ${createFullName(originContent.owner)}`,
      renameMatching: false,
    });

    // update remixed content (already checked permissions)
    await prisma.content.update({
      where: { id: remixContentId },
      data: { source: newSource, doenetmlVersionId: newDoenetmlVersionId },
    });

    // The second revision is also manual, as it would be expected in revision list.
    // But, set `renameMatching` to `false` to not rename if there already was a matching manual revision.
    ({ revisionNum: remixRevisionNum } = await createContentRevision({
      contentId: remixContentId,
      loggedInUserId,
      revisionName: "After update",
      note: `Updated to: ${originContent.name} by ${createFullName(originContent.owner)}`,
      renameMatching: false,
    }));
  }

  // Update content history to show that remixed from originRevisionNum to remixRevisionNum,
  // (or, if onlyMarkUnchanged, then remixRevisionNum is undefined, and we're just
  // changing the history so show that we remixed from originRevisionNum).
  // Note: we currently don't update timestamps so they show the original remix time.
  // Should we have another update timestamp?
  await prisma.contributorHistory.update({
    where: {
      remixContentId_originContentId: { remixContentId, originContentId },
    },
    data: {
      remixContentRevisionNum: remixRevisionNum,
      originContentRevisionNum: originRevisionNum,
    },
  });

  await updateOtherMatchingContributorHistory({
    copiedContentId: originContentId,
    updatedContentId: remixContentId,
    updatedRevisionNum: remixRevisionNum,
    newCid: revisionToCopy.cid,
  });

  if (onlyMarkUnchanged) {
    return { updated: false };
  } else {
    return { updated: true, newSource };
  }
}

/**
 * Update `originContentId` by `loggedInUserId` to match `remixRevisionNum` of `remixContentId`,
 * where `remixContentId` must have been remixed (possibly indirectly) from `originContentId`.
 * Update contributor history to link the new revision of `originContentId` to `remixRevisionNum`
 * of `remixContentId` so the change in both of them is no longer identified.
 *
 * If `onlyMarkUnchanged` is `true`, however, then don't actually update `originContentId`,
 * but only update contributor history to link the unchanged revision of `originContentId`
 * to `remixRevisionNum` of `remixContentId`.
 *
 * If `remixRevisionNum` is not specified, then create a new revision of `remixContentId`
 * from its current content and use that revision number.
 *
 * In addition, look for other content that `originContentId` was remixed from
 * or that were remixed from `originContentId`.
 * If any of them have already incorporated that change of `remixRevisionNum` of `remixContentId`,
 * then also update the contributor history between `originContentId` and that activity
 * (updating the revision number of `originContentId` only if `onlyMarkedChange` is `false`.)
 *
 * Note: currently implemented only for Docs.
 */
export async function updateOriginContentToRemix({
  remixContentId,
  remixRevisionNum,
  originContentId,
  loggedInUserId,
  onlyMarkUnchanged = false,
}: {
  remixContentId: Uint8Array;
  remixRevisionNum?: number;
  originContentId: Uint8Array;
  loggedInUserId: Uint8Array;
  onlyMarkUnchanged?: boolean;
}) {
  // verify relation exists and logged in userId has edit access to the origin and view access to the remix
  await prisma.contributorHistory.findUniqueOrThrow({
    where: {
      remixContentId_originContentId: { originContentId, remixContentId },
      originContent: {
        content: {
          ...filterEditableActivity(loggedInUserId),
          type: "singleDoc",
        },
      },
      remixContent: {
        content: {
          ...filterViewableActivity(loggedInUserId),
          type: "singleDoc",
        },
      },
    },
  });

  // if remixRevisionNum is not supplied, it means update from the current content,
  // so create (or find) a revision corresponding to the current content
  if (remixRevisionNum === undefined) {
    const remixContentRevision = await createContentRevision({
      contentId: remixContentId,
      loggedInUserId,
      revisionName: "Created due to being remixed",
      autoGenerated: true,
    });
    remixRevisionNum = remixContentRevision.revisionNum;
  }

  const revisionToCopy = await prisma.contentRevisions.findUniqueOrThrow({
    where: {
      contentId_revisionNum: {
        contentId: remixContentId,
        revisionNum: remixRevisionNum,
      },
    },
    select: {
      source: true,
      doenetmlVersionId: true,
      cid: true,
      content: {
        select: {
          name: true,
          owner: true,
        },
      },
    },
  });

  const newSource = revisionToCopy.source;
  const newDoenetmlVersionId = revisionToCopy.doenetmlVersionId;

  const remixContent = revisionToCopy.content;

  let originRevisionNum: number | undefined;

  if (!onlyMarkUnchanged) {
    // If origin content has changed since it was originally remixed,
    // create a revision as a save point.
    // It is a manual revision, as it would be expected in revision list.
    // But, set `renameMatching` to `false` to not rename if there already was a matching manual revision.
    await createContentRevision({
      contentId: originContentId,
      loggedInUserId,
      revisionName: "Before update",
      note: `Save point before updating to: ${remixContent.name} by ${createFullName(remixContent.owner)}`,
      renameMatching: false,
    });

    // update origin content (already checked permissions)
    await prisma.content.update({
      where: { id: originContentId },
      data: { source: newSource, doenetmlVersionId: newDoenetmlVersionId },
    });

    // The second revision is also manual, as it would be expected in revision list.
    // But, set `renameMatching` to `false` to not rename if there already was a matching manual revision.
    ({ revisionNum: originRevisionNum } = await createContentRevision({
      contentId: originContentId,
      loggedInUserId,
      revisionName: "After update",
      note: `Updated to: ${remixContent.name} by ${createFullName(remixContent.owner)}`,
      renameMatching: false,
    }));
  }

  // Update content history to show that remixed from originRevisionNum to remixRevisionNum,
  // (or, if onlyMarkUnchanged, then originRevisionNum is undefined, and we're just
  // changing the history so show that we remixed to remixRevisionNum).
  // Note: we currently don't update timestamps so they show the original remix time.
  // Should we have another update timestamp?
  await prisma.contributorHistory.update({
    where: {
      remixContentId_originContentId: { remixContentId, originContentId },
    },
    data: {
      remixContentRevisionNum: remixRevisionNum,
      originContentRevisionNum: originRevisionNum,
    },
  });

  await updateOtherMatchingContributorHistory({
    copiedContentId: remixContentId,
    updatedContentId: originContentId,
    updatedRevisionNum: originRevisionNum,
    newCid: revisionToCopy.cid,
  });

  if (onlyMarkUnchanged) {
    return { updated: false };
  } else {
    return { updated: true, newSource };
  }
}

/**
 * Call this function after either
 * - updating `updatedContentId` to revision `updatedRevisionNum` to match
 *   a revision of `copiedContentId` with cid `newCid`, or
 * - ignoring the change to `copiedContentId` that changed it to the revision with cid `newCid`,
 *   in which case `updatedContentId` was unchanged and `updatedRevisionNum` is undefined.
 *
 * This function looks for other content that `updatedContentId` was remixed from
 * or that was remixed from `updatedContentId`,
 * where that other content has a revision with cid matching `newCid`.
 * If found, updated the contributor history so that it links `updatedContentId`
 * with that found revision of the other content.
 * If `updatedRevisionNum` is defined (meaning `updatedContentId` was actually changed),
 * then also change the link to match `updatedRevisionNum`.
 *
 * Note: we don't worry if logged in user has view access of those activities (or even if they are deleted).
 * We still update the data to keep it current.
 */
async function updateOtherMatchingContributorHistory({
  copiedContentId,
  updatedContentId,
  updatedRevisionNum,
  newCid,
}: {
  copiedContentId: Uint8Array;
  updatedContentId: Uint8Array;
  updatedRevisionNum?: number;
  newCid: string;
}) {
  const originContentAtNewCid = await prisma.content.findMany({
    where: {
      id: { not: copiedContentId },
      contentRevisions: {
        some: {
          contributorHistoryAsOrigin: {
            some: { remixContentId: updatedContentId },
          },
        },
      },
    },
    select: {
      contentRevisions: {
        distinct: ["cid"],
        where: { cid: newCid },
        orderBy: { createdAt: "desc" },
        select: { contentId: true, revisionNum: true },
      },
    },
  });

  for (const originObj of originContentAtNewCid) {
    if (originObj.contentRevisions.length === 1) {
      const originInfo = originObj.contentRevisions[0];

      // check if they are currently marked changed
      const currentHistory = await prisma.contributorHistory.findUniqueOrThrow({
        where: {
          remixContentId_originContentId: {
            remixContentId: updatedContentId,
            originContentId: originInfo.contentId,
          },
        },
        select: {
          originContent: {
            select: {
              cid: true,
              content: {
                select: {
                  source: true,
                  doenetmlVersionId: true,
                },
              },
            },
          },
        },
      });

      const currentOrigin = currentHistory.originContent.content;

      const currentCid = await getCidV1FromString(
        currentOrigin.doenetmlVersionId?.toString() +
          "|" +
          currentOrigin.source,
      );

      const currentlyMarkedAsChanged =
        currentCid !== currentHistory.originContent.cid;

      if (currentlyMarkedAsChanged) {
        await prisma.contributorHistory.update({
          where: {
            remixContentId_originContentId: {
              remixContentId: updatedContentId,
              originContentId: originInfo.contentId,
            },
          },
          data: {
            originContentRevisionNum: originInfo.revisionNum,
            remixContentRevisionNum: updatedRevisionNum,
          },
        });
      }
    }
  }

  const remixContentAtNewCid = await prisma.content.findMany({
    where: {
      id: { not: copiedContentId },
      contentRevisions: {
        some: {
          contributorHistoryAsRemix: {
            some: { originContentId: updatedContentId },
          },
        },
      },
    },
    select: {
      contentRevisions: {
        distinct: ["cid"],
        where: { cid: newCid },
        orderBy: { createdAt: "desc" },
        select: { contentId: true, revisionNum: true },
      },
    },
  });

  for (const remixObj of remixContentAtNewCid) {
    if (remixObj.contentRevisions.length === 1) {
      const remixInfo = remixObj.contentRevisions[0];

      // check if they are currently marked changed
      const currentHistory = await prisma.contributorHistory.findUniqueOrThrow({
        where: {
          remixContentId_originContentId: {
            remixContentId: remixInfo.contentId,
            originContentId: updatedContentId,
          },
        },
        select: {
          remixContent: {
            select: {
              cid: true,
              content: {
                select: {
                  source: true,
                  doenetmlVersionId: true,
                },
              },
            },
          },
        },
      });

      const currentRemix = currentHistory.remixContent.content;

      const currentCid = await getCidV1FromString(
        currentRemix.doenetmlVersionId?.toString() + "|" + currentRemix.source,
      );

      const currentlyMarkedAsChanged =
        currentCid !== currentHistory.remixContent.cid;

      if (currentlyMarkedAsChanged) {
        await prisma.contributorHistory.update({
          where: {
            remixContentId_originContentId: {
              remixContentId: remixInfo.contentId,
              originContentId: updatedContentId,
            },
          },
          data: {
            originContentRevisionNum: updatedRevisionNum,
            remixContentRevisionNum: remixInfo.revisionNum,
          },
        });
      }
    }
  }
}
