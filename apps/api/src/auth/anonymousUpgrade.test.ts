import { describe, expect, test } from "vitest";
import { upgradeAnonymousUser } from "../query/user";
import { prisma } from "../model";
import { createTestAnonymousUser, createTestUser } from "../test/utils";

// `upgradeAnonymousUser` runs from `serializeUser` when someone who has been
// browsing anonymously finishes a magic-link or Google login. The email they
// authenticated with may or may not already belong to a real account, so these
// tests pin both outcomes: the caller relies on a `null` return (not a throw)
// to fall back to `findOrCreateUser`.

function freshEmail(label: string) {
  const id =
    Date.now().toString() + Math.round(Math.random() * 100000).toString();
  return `${label}${id}@vitest.test`;
}

describe("upgradeAnonymousUser", () => {
  test("claims an unused email and keeps the same account", async () => {
    const anonUser = await createTestAnonymousUser();
    expect(anonUser.isAnonymous).eq(true);

    const email = freshEmail("upgrade");
    const upgraded = await upgradeAnonymousUser({
      userId: anonUser.userId,
      email,
    });

    expect(upgraded).not.eq(null);
    expect(upgraded!.isAnonymous).eq(false);
    expect(upgraded!.email).eq(email);
    // Same row, so the session and any content made while anonymous survive.
    expect(upgraded!.userId).toStrictEqual(anonUser.userId);
  });

  test("returns null when the email already belongs to another account", async () => {
    const existingUser = await createTestUser();
    const anonUser = await createTestAnonymousUser();

    const upgraded = await upgradeAnonymousUser({
      userId: anonUser.userId,
      email: existingUser.email!,
    });

    // The caller falls back to `findOrCreateUser`, which logs them in to
    // `existingUser`. This is an ordinary returning-user login, not an error.
    expect(upgraded).eq(null);
  });

  test("leaves both accounts untouched when the email is taken", async () => {
    const existingUser = await createTestUser();
    const anonUser = await createTestAnonymousUser();

    await upgradeAnonymousUser({
      userId: anonUser.userId,
      email: existingUser.email!,
    });

    const anonAfter = await prisma.users.findUniqueOrThrow({
      where: { userId: anonUser.userId },
      select: { email: true, isAnonymous: true },
    });
    expect(anonAfter.isAnonymous).eq(true);
    expect(anonAfter.email).eq(anonUser.email);

    const existingAfter = await prisma.users.findUniqueOrThrow({
      where: { userId: existingUser.userId },
      select: { email: true, isAnonymous: true, firstNames: true },
    });
    expect(existingAfter.email).eq(existingUser.email);
    expect(existingAfter.isAnonymous).eq(false);
    expect(existingAfter.firstNames).eq(existingUser.firstNames);
  });

  test("returns null when the account is not anonymous", async () => {
    const user = await createTestUser();

    // Re-running the upgrade (a second login from a stale `fromAnonymous`
    // cookie) must not re-stamp the email of an already-real account.
    const upgraded = await upgradeAnonymousUser({
      userId: user.userId,
      email: freshEmail("second"),
    });

    expect(upgraded).eq(null);

    const after = await prisma.users.findUniqueOrThrow({
      where: { userId: user.userId },
      select: { email: true },
    });
    expect(after.email).eq(user.email);
  });

  test("returns null when the user does not exist", async () => {
    const missingUserId = new Uint8Array(16).fill(0);

    const upgraded = await upgradeAnonymousUser({
      userId: missingUserId,
      email: freshEmail("missing"),
    });

    expect(upgraded).eq(null);
  });
});
