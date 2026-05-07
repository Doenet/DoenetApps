import { Prisma } from "@prisma/client";
import { prisma } from "../model";
import { DoenetmlVersion, UserInfoWithEmail, ContentRevision } from "../types";
import { getCidV1FromString } from "@doenet-tools/shared";
import {
  compileActivityFromContent,
  returnClassificationListSelect,
  processClassifications,
  processSharedWith,
  processAssignmentStatus,
} from "../utils/contentStructure";
import {
  filterEditableActivity,
  filterEditableContent,
  filterViewableActivity,
  getIsEditor,
} from "../utils/permissions";
import { ActivitySource } from "@doenet-tools/shared";
import { getContent } from "./activity_edit_view";
import { recordRecentContent } from "./recent";
import { getAllDoenetmlVersions, getContentSource } from "./activity";
import {
  InvalidRequestError,
  PermissionDeniedRedirectError,
} from "../utils/error";
import { StatusCodes } from "http-status-codes";

/**
 * Gets the general metadata relevant to editing for an activity.
 * Needed for the header bars on `/documentEditor` and `/compoundEditor` pages.
 */
export async function getEditor({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId?: Uint8Array;
}) {
  if (!loggedInUserId) {
    // Check whether this activity is viewable for non-logged in user
    const isViewable = await prisma.content.findUnique({
      where: {
        id: contentId,
        ...filterViewableActivity(loggedInUserId, false),
      },
      select: {
        type: true,
      },
    });
    if (isViewable) {
      throw new PermissionDeniedRedirectError("Content not editable by you");
    } else {
      throw new InvalidRequestError(
        "Cannot find activity",
        StatusCodes.NOT_FOUND,
      );
    }
  }

  const isEditor = await getIsEditor(loggedInUserId);

  try {
    const {
      id,
      name,
      type,
      owner,
      isAssignmentRoot,
      assignmentClosedOn,
      parent,
      isPublic,
      visibility,
    } = await prisma.content.findUniqueOrThrow({
      where: {
        id: contentId,
        ...filterEditableActivity(loggedInUserId, isEditor),
      },
      select: {
        id: true,
        name: true,
        type: true,
        isPublic: true,
        visibility: true,
        owner: {
          select: {
            isLibrary: true,
          },
        },
        isAssignmentRoot: true,
        classCode: true,
        assignmentClosedOn: true,
        parent: {
          select: {
            isAssignmentRoot: true,
            classCode: true,
            assignmentClosedOn: true,
          },
        },
      },
    });

    let assignment;
    if (isAssignmentRoot && assignmentClosedOn !== null) {
      assignment = {
        assignmentStatus: processAssignmentStatus({ assignmentClosedOn }),
      };
    } else if (parent?.isAssignmentRoot && parent.assignmentClosedOn !== null) {
      assignment = {
        assignmentStatus: processAssignmentStatus({
          assignmentClosedOn: parent.assignmentClosedOn,
        }),
      };
    } else {
      assignment = {
        assignmentStatus: "Unassigned",
      };
    }

    await recordRecentContent(loggedInUserId, "edit", contentId);

    const remixSourceHasChanged = await checkRemixSourceChange({
      contentId,
      loggedInUserId,
      isEditor,
    });

    return {
      contentId: id,
      contentName: name,
      contentType: type,
      isPublic,
      visibility,
      ...assignment,
      remixSourceHasChanged,
      inLibrary: owner.isLibrary,
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      // Check whether this activity is viewable even if it's not editable
      const isViewable = await prisma.content.findUnique({
        where: {
          id: contentId,
          ...filterViewableActivity(loggedInUserId, isEditor),
        },
        select: {
          type: true,
        },
      });
      if (isViewable) {
        throw new PermissionDeniedRedirectError("Content not editable by you");
      }
    }

    throw e;
  }
}

/**
 * Get the settings for this activity.
 * Needed for `/documentEditor/[id]/settings` and `/compoundEditor/[id]/settings` pages
 */
export async function getEditorSettings({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  const isEditor = await getIsEditor(loggedInUserId);

  const { isPublic, _count, classifications, ...other } =
    await prisma.content.findUniqueOrThrow({
      where: {
        id: contentId,
        ...filterEditableActivity(loggedInUserId, isEditor),
      },
      select: {
        isPublic: true,
        doenetmlVersionId: true,
        licenseCode: true,
        maxAttempts: true,
        individualizeByStudent: true,
        mode: true,
        _count: {
          select: {
            sharedWith: true,
          },
        },
        categories: {
          select: {
            code: true,
          },
        },
        classifications: {
          select: {
            classification: {
              select: returnClassificationListSelect(),
            },
          },
        },
      },
    });

  return {
    ...other,
    licenseIsEditable: !isPublic && _count.sharedWith === 0,
    classifications: processClassifications({ classifications }),
  };
}

/**
 * Get the doenetML and the doenetmlVersion for a document editable by `loggedInUser`.
 */
export async function getDocEditorDoenetML({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}): Promise<{
  source: string;
  doenetmlVersion: DoenetmlVersion;
}> {
  const content = await getContentSource({
    contentId,
    loggedInUserId,
    useVersionIds: true,
  });

  const { allDoenetmlVersions } = await getAllDoenetmlVersions();
  const version: DoenetmlVersion = allDoenetmlVersions.find(
    (v) => v.id === parseInt(content.doenetMLVersion!),
  )!;

  return {
    source: content.source!,
    doenetmlVersion: version,
  };
}

/**
 * Get the doenetMLs for a compound activity, compiled into 1 json string of the format expected by the `assignment-viewer` dependency
 * Needed for `compoundEditor/[id]/view` page
 */
export async function getCompoundEditorView({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}): Promise<
  | {
      source: ActivitySource;
      paginate: boolean;
      activityLevelAttempts: boolean;
      itemLevelAttempts: boolean;
      maxAttemptsAllowed: number | undefined;
    }
  | { notCompound: true }
> {
  const isEditor = await getIsEditor(loggedInUserId);
  const { type } = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ...filterEditableActivity(loggedInUserId, isEditor),
    },
    select: {
      type: true,
    },
  });

  if (type !== "select" && type !== "sequence") {
    return { notCompound: true };
  }

  const content = await getContent({
    contentId,
    loggedInUserId,
    isEditor,
    skipPermissionCheck: true,
    includeAssignInfo: true,
    includeRepeatInProblemSet: true,
  });

  return {
    source: compileActivityFromContent(content),
    paginate: content.type === "sequence" ? content.paginate : false,
    activityLevelAttempts: content.assignmentInfo?.mode === "summative",
    itemLevelAttempts: content.assignmentInfo?.mode === "formative",
    maxAttemptsAllowed: content.assignmentInfo?.maxAttempts,
  };
}

/**
 * Get this compound activity's contents, such as its children.
 * Needed for `/compoundEditor/[id]/edit` page
 *
 * TODO: Refine what we need for this page
 */
export async function getCompoundEditorEdit({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  const isEditor = await getIsEditor(loggedInUserId);
  const { type } = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ...filterEditableActivity(loggedInUserId, isEditor),
    },
    select: {
      type: true,
    },
  });

  if (type !== "select" && type !== "sequence") {
    return { notCompound: true };
  }

  const content = await getContent({
    contentId,
    loggedInUserId,
    isEditor,
    skipPermissionCheck: true,
    includeRepeatInProblemSet: true,
  });

  return { content };
}

/**
 * TODO: FIXME: This function should not be specific to the editor. We're also using it for folders.
 *
 * Get the share status of an activity. This included whether it is public, who it has been shared with, and which of these
 * were inherited from the parent.
 * Needed for the `Share content` modal in the editor.
 */
export async function getEditorShareStatus({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  const results = await prisma.content.findUniqueOrThrow({
    where: {
      id: contentId,
      ...filterEditableContent(loggedInUserId, false),
    },
    select: {
      isPublic: true,
      visibility: true,
      sharedWith: {
        select: {
          user: {
            select: {
              userId: true,
              firstNames: true,
              lastNames: true,
              email: true,
            },
          },
        },
      },
      parent: {
        select: {
          isPublic: true,
          visibility: true,
          sharedWith: {
            select: {
              user: {
                select: {
                  userId: true,
                  firstNames: true,
                  lastNames: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const sharedWith = processSharedWith(results.sharedWith).sharedWith;
  let parentSharedWith: UserInfoWithEmail[] = [];
  if (results.parent) {
    parentSharedWith = processSharedWith(results.parent.sharedWith).sharedWith;
  }

  return {
    isPublic: results.isPublic,
    visibility: results.visibility,
    parentIsPublic: results.parent?.isPublic ?? false,
    parentVisibility: results.parent?.visibility ?? "private",
    sharedWith,
    parentSharedWith,
  };
}

/**
 * Get the current doenetML source & version, as well as the previous revisions of this document.
 * Needed for `documentEditor/[id]/history` page
 */
export async function getDocEditorHistory({
  contentId,
  loggedInUserId,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
}) {
  const isEditor = await getIsEditor(loggedInUserId);
  const { source, doenetmlVersion } = await getDocEditorDoenetML({
    contentId,
    loggedInUserId,
  });

  const revisionsUnformatted = await prisma.contentRevisions.findMany({
    where: {
      content: {
        id: contentId,
        ...filterEditableActivity(loggedInUserId, isEditor),
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      revisionNum: true,
      revisionName: true,
      note: true,
      source: true,
      doenetmlVersion: { select: { fullVersion: true } },
      cid: true,
      createdAt: true,
    },
  });

  const revisions: ContentRevision[] = revisionsUnformatted.map((rev) => {
    const { doenetmlVersion, note, ...other } = rev;
    return {
      ...other,
      note: note ?? "",
      doenetmlVersion: doenetmlVersion?.fullVersion ?? null,
    };
  });

  return {
    revisions,
    doenetML: source,
    doenetmlVersion,
  };
}

/**
 * Check for any new changes in the remix sources. Returns `true` if any of them have changed.
 *
 * This function is useful for displaying a notification dot when something has changed.
 * A change is considered new if the owner hasn't taken an action on those changes yet, such as pulling the changes or choosing to ignore them.
 */
async function checkRemixSourceChange({
  contentId,
  loggedInUserId,
  isEditor,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
  isEditor: boolean;
}) {
  const sources = await prisma.contributorHistory.findMany({
    where: {
      remixContent: {
        content: {
          id: contentId,
          ...filterViewableActivity(loggedInUserId, isEditor),
        },
      },
      originContent: {
        content: {
          ...filterViewableActivity(loggedInUserId, isEditor),
        },
      },
    },
    orderBy: { timestampOriginContent: "desc" },
    select: {
      originContent: {
        select: {
          cid: true,
          contentId: true,
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

  let hasChanged = false;

  for (const source of sources) {
    const cidAtLastUpdate = source.originContent.cid;
    const originCurrentSource = source.originContent.content.source!;
    const originCurrentVersion = source.originContent.content.doenetmlVersionId;

    const currentCid = await getCidV1FromString(
      originCurrentVersion + "|" + originCurrentSource,
    );

    hasChanged = currentCid !== cidAtLastUpdate;
    if (hasChanged) {
      break;
    }
  }

  return hasChanged;
}
