import { prisma } from "../model";

type ClassificationByNames = {
  systemShortName: string;
  category: string;
  subCategory: string;
  code: string;
};

export async function addClassificationsByNames({
  contentId,
  classifications,
}: {
  contentId: Uint8Array;
  classifications: ClassificationByNames[];
}) {
  for (const classification of classifications) {
    const classificationId = (
      await prisma.classifications.findFirstOrThrow({
        select: {
          id: true,
        },
        where: {
          code: classification.code,
          descriptions: {
            some: {
              subCategory: {
                subCategory: classification.subCategory,
                category: {
                  category: classification.category,
                  system: {
                    shortName: classification.systemShortName,
                  },
                },
              },
            },
          },
        },
      })
    ).id;

    await prisma.contentClassifications.create({
      data: {
        contentId: contentId,
        classificationId,
      },
    });
  }
}

export async function getActivityIdFromSourceId(sourceId: Uint8Array) {
  const result = await prisma.libraryActivityInfos.findUniqueOrThrow({
    where: {
      sourceId,
    },
    select: {
      contentId: true,
    },
  });

  return result.contentId;
}

export async function getAssignmentNonRootIds(rootAssignmentId: Uint8Array) {
  const ids = await prisma.content.findMany({
    where: {
      parentId: rootAssignmentId,
    },
    select: {
      id: true,
    },
  });
  return ids.map((v) => v.id);
}
