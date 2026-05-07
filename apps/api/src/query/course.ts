import { prisma } from "../model";
import { InvalidRequestError } from "../utils/error";
import { filterEditableContent } from "../utils/permissions";
import { getDescendantIds } from "./activity";
import { generateClassCode } from "./assign";

export async function markFolderAsCourse({
  loggedInUserId,
  folderId,
}: {
  loggedInUserId: Uint8Array;
  folderId: Uint8Array;
}): Promise<{ classCode: number }> {
  // Make sure 1) content is owned by user and 2) content is a folder
  const folder = await prisma.content.findUniqueOrThrow({
    where: {
      id: folderId,
      ...filterEditableContent(loggedInUserId),
      type: "folder",
    },
    select: { id: true, courseRootId: true, classCode: true },
  });

  if (folder.courseRootId) {
    throw new InvalidRequestError("Folder is already part of a course.");
  }

  const descendantIds = await getDescendantIds(folderId);
  const courseInsideMe = await prisma.content.findFirst({
    where: {
      id: { in: descendantIds },
      courseRootId: { not: null },
    },
    select: { id: true },
  });

  if (courseInsideMe) {
    throw new InvalidRequestError("A subfolder is already a course.");
  }

  const actions = [];
  let classCode = folder.classCode;

  actions.push(
    prisma.content.updateMany({
      where: { id: { in: [folderId, ...descendantIds] } },
      data: {
        courseRootId: folderId,
      },
    }),
  );

  if (classCode === null) {
    classCode = await generateClassCode();
    actions.push(
      prisma.content.update({
        where: { id: folderId },
        data: {
          classCode,
        },
      }),
    );
  }

  await prisma.$transaction(actions);

  return { classCode };
}
