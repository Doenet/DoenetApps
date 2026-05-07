import { prisma } from "../model";
import { LicenseCode } from "../types";
import { processLicense } from "../utils/contentStructure";
import { filterEditableContent } from "../utils/permissions";

/**
 * Get the full data on every license we support.
 * See `License` type for the structure.
 */
export async function getAllLicenses() {
  const preliminary_licenses = await prisma.licenses.findMany({
    include: {
      composedOf: {
        select: { composedOf: true },
        orderBy: { composedOf: { sortIndex: "asc" } },
      },
    },
    orderBy: { sortIndex: "asc" },
  });

  const allLicenses = preliminary_licenses.map(processLicense);
  return { allLicenses };
}

export async function getLicense(code: string) {
  const preliminary_license = await prisma.licenses.findUniqueOrThrow({
    where: { code },
    include: {
      composedOf: {
        select: { composedOf: true },
        orderBy: { composedOf: { sortIndex: "asc" } },
      },
    },
  });

  const license = processLicense(preliminary_license);
  return { license };
}

export async function setContentLicense({
  contentId,
  loggedInUserId,
  licenseCode,
}: {
  contentId: Uint8Array;
  loggedInUserId: Uint8Array;
  licenseCode: LicenseCode;
}) {
  // NOTE: editors cannot change license
  await prisma.content.update({
    where: {
      id: contentId,
      ...filterEditableContent(loggedInUserId),
    },
    data: { licenseCode },
  });
}
