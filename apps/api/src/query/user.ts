import { prisma } from "../model";
import { Prisma } from "@prisma/client";
import { UserInfo, UserInfoWithEmail } from "../types";
import { generateHandle, generateUnusedHandle } from "../utils/names";
import { filterEditableContent } from "../utils/permissions";
import { fromUUID } from "../utils/uuid";
import bcrypt from "bcryptjs";

export async function findOrCreateUser({
  email,
  firstNames,
  lastNames,
  isEditor = false,
  isAuthor = false,
  isAnonymous = false,
  isPremium,
}: {
  email: string;
  firstNames: string | null;
  lastNames: string;
  isEditor?: boolean;
  isAuthor?: boolean;
  isAnonymous?: boolean;
  isPremium?: boolean;
}): Promise<UserInfoWithEmail> {
  // For now, make any non-anonymous user a premium user
  // We'll change this once we have the UI for non-premium users working
  // by deleting this line and by defaulting isPremium to false in the function signature
  isPremium = isPremium ?? !isAnonymous;

  const username = email;

  let user = await prisma.users.upsert({
    where: { email },
    update: {},
    create: {
      email,
      firstNames,
      lastNames,
      username,
      isEditor,
      isAnonymous,
      isPremium,
      isAuthor,
    },
  });

  if (lastNames !== "" && user.lastNames == "") {
    user = await prisma.users.update({
      where: { email },
      data: { firstNames, lastNames },
    });
  }

  return {
    userId: user.userId,
    email: user.email,
    firstNames: user.firstNames,
    lastNames: user.lastNames,
    isAnonymous: user.isAnonymous,
    isAuthor: user.isAuthor,
    isEditor: user.isEditor,
  };
}

export function getUserInfoIfLoggedIn({
  loggedInUserId,
}: {
  loggedInUserId?: Uint8Array;
}) {
  if (!loggedInUserId) {
    return;
  }

  return getMyUserInfo({ loggedInUserId });
}

export async function getMyUserInfo({
  loggedInUserId,
}: {
  loggedInUserId: Uint8Array;
}) {
  const user = await prisma.users.findUniqueOrThrow({
    where: { userId: loggedInUserId },
    select: {
      userId: true,
      firstNames: true,
      lastNames: true,
      isAnonymous: true,
      isEditor: true,
      isAuthor: true,
    },
  });
  return { user };
}

export async function getUser({ userId }: { userId: Uint8Array }) {
  return getAuthorInfo(userId);
}

export async function getAuthorInfo(userId: Uint8Array): Promise<UserInfo> {
  return await prisma.users.findUniqueOrThrow({
    where: { userId },
    select: {
      userId: true,
      firstNames: true,
      lastNames: true,
    },
  });
}

export async function getUserInfoFromEmail(
  email: string,
): Promise<UserInfoWithEmail> {
  const user = await prisma.users.findUniqueOrThrow({
    where: { email },
    select: {
      userId: true,
      email: true,
      firstNames: true,
      lastNames: true,
      isAnonymous: true,
      isEditor: true,
    },
  });
  return user;
}

export async function upgradeAnonymousUser({
  userId,
  email,
}: {
  userId: Uint8Array;
  email: string;
}) {
  const user = await prisma.users.update({
    where: { userId, isAnonymous: true },
    data: { isAnonymous: false, email },
  });

  return user;
}

export async function updateUser({
  loggedInUserId,
  firstNames,
  lastNames,
}: {
  loggedInUserId: Uint8Array;
  firstNames?: string;
  lastNames?: string;
}): Promise<UserInfoWithEmail> {
  const { isAnonymous } = await prisma.users.findUniqueOrThrow({
    where: { userId: loggedInUserId },
    select: { isAnonymous: true },
  });
  if (isAnonymous && (firstNames !== "" || lastNames !== "")) {
    throw new Error("Anonymous users cannot set name.");
  }

  const user = await prisma.users.update({
    where: { userId: loggedInUserId },
    data: { firstNames, lastNames },
  });
  return {
    userId: user.userId,
    email: user.email,
    firstNames: user.firstNames,
    lastNames: user.lastNames,
    isAnonymous: user.isAnonymous,
    isAuthor: user.isAuthor,
    isEditor: user.isEditor,
  };
}

export async function setIsAuthor({
  loggedInUserId,
  isAuthor,
}: {
  loggedInUserId: Uint8Array;
  isAuthor: boolean;
}) {
  await prisma.users.update({
    where: { userId: loggedInUserId },
    data: { isAuthor },
  });
}

export async function createStudentHandleAccounts({
  loggedInUserId,
  folderId,
  numAccounts,
}: {
  loggedInUserId: Uint8Array;
  folderId: Uint8Array;
  numAccounts: number;
}) {
  // Make sure content is a course owned by `loggedInUserId`
  await prisma.content.findUniqueOrThrow({
    where: {
      id: folderId,
      courseRootId: folderId,
      ...filterEditableContent(loggedInUserId),
    },
    select: { id: true },
  });

  const existingHandles: Set<string> = await prisma.users
    .findMany({
      where: {
        scopedToClassId: folderId,
      },
      select: {
        lastNames: true,
      },
    })
    .then((users) => new Set(users.map((u) => u.lastNames)));

  // `accountsDb` - what we will insert into the database
  // `accountMeta` - a mapping to let us join the db-generated and non-db info together
  const accountsDb: Prisma.usersCreateManyInput[] = [];
  const accountMeta = new Map<string, { handle: string; password: string }>();

  for (let i = 0; i < numAccounts; i++) {
    const handle = generateUnusedHandle(existingHandles);
    existingHandles.add(handle);

    const username = `${fromUUID(folderId)}:${handle}`;
    const password = generateHandle({ appendRandomDigits: 3 });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    accountsDb.push({
      username,
      firstNames: "",
      lastNames: handle,
      scopedToClassId: folderId,
      passwordHash,
    });
    accountMeta.set(username, { handle, password });
  }

  // Actually add users to database
  await prisma.users.createMany({
    data: accountsDb,
  });

  // Fetch new userIds
  const newUsers = await prisma.users.findMany({
    where: {
      scopedToClassId: folderId,
      username: { in: accountsDb.map((account) => account.username) },
    },
    select: { userId: true, username: true },
  });

  // Merge all the info together
  const accounts: { userId: Uint8Array; handle: string; password: string }[] =
    newUsers.map((user) => {
      const meta = accountMeta.get(user.username)!;

      return {
        userId: user.userId,
        handle: meta.handle,
        password: meta.password,
      };
    });

  accounts.sort((a, b) => (a.handle < b.handle ? -1 : 1));

  return { accounts };
}
