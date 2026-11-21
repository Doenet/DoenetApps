import { describe, expect, test } from "vitest";
import { DateTime } from "luxon";
import { createTestUser } from "./utils";
import {
  createContent,
  getContentDetails,
  updateDescription,
} from "../query/activity";
import { setContentIsPublic } from "../query/share";
import { createAssignment } from "../query/assign";
import { copyContent } from "../query/copy_move";
import { updateDescriptionOperation } from "../schemas/contentDetailsContract";

async function createDoc(userId: Uint8Array) {
  const { contentId } = await createContent({
    loggedInUserId: userId,
    contentType: "singleDoc",
    parentId: null,
  });
  return contentId;
}

describe("Content description", () => {
  test("new content has no description", async () => {
    const { userId } = await createTestUser();
    const contentId = await createDoc(userId);

    const details = await getContentDetails({
      contentId,
      loggedInUserId: userId,
    });
    expect(details).eqls({ description: null });
  });

  test("owner can set, trim, update, and clear the description", async () => {
    const { userId } = await createTestUser();
    const contentId = await createDoc(userId);

    await updateDescription({
      contentId,
      loggedInUserId: userId,
      description: "  Practice with the quadratic formula.\nTwo parts.  ",
    });
    expect(
      (await getContentDetails({ contentId, loggedInUserId: userId }))
        .description,
    ).eq("Practice with the quadratic formula.\nTwo parts.");

    await updateDescription({
      contentId,
      loggedInUserId: userId,
      description: "Updated",
    });
    expect(
      (await getContentDetails({ contentId, loggedInUserId: userId }))
        .description,
    ).eq("Updated");

    await updateDescription({
      contentId,
      loggedInUserId: userId,
      description: "   ",
    });
    expect(
      (await getContentDetails({ contentId, loggedInUserId: userId }))
        .description,
    ).eq(null);
  });

  test("others cannot set the description", async () => {
    const { userId: ownerId } = await createTestUser();
    const { userId: otherId } = await createTestUser();
    const contentId = await createDoc(ownerId);

    await setContentIsPublic({
      contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    await expect(
      updateDescription({
        contentId,
        loggedInUserId: otherId,
        description: "Not mine",
      }),
    ).rejects.toThrow("not found");

    expect(
      (await getContentDetails({ contentId, loggedInUserId: ownerId }))
        .description,
    ).eq(null);
  });

  test("description is visible only to those who can view the content", async () => {
    const { userId: ownerId } = await createTestUser();
    const { userId: otherId } = await createTestUser();
    const contentId = await createDoc(ownerId);

    await updateDescription({
      contentId,
      loggedInUserId: ownerId,
      description: "A description",
    });

    // Private: others (and anonymous visitors) can't read it
    await expect(
      getContentDetails({ contentId, loggedInUserId: otherId }),
    ).rejects.toThrow("not found");
    await expect(getContentDetails({ contentId })).rejects.toThrow("not found");

    // Public: anyone can read it
    await setContentIsPublic({
      contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
    expect(
      await getContentDetails({ contentId, loggedInUserId: otherId }),
    ).eqls({ description: "A description" });
    expect(await getContentDetails({ contentId })).eqls({
      description: "A description",
    });
  });

  test("description can be edited after the content is assigned", async () => {
    const { userId } = await createTestUser();
    const contentId = await createDoc(userId);

    const { assignmentId } = await createAssignment({
      contentId,
      loggedInUserId: userId,
      destinationParentId: null,
      closedOn: DateTime.now().plus({ days: 1 }),
    });

    await updateDescription({
      contentId: assignmentId,
      loggedInUserId: userId,
      description: "Assigned description",
    });
    expect(
      (
        await getContentDetails({
          contentId: assignmentId,
          loggedInUserId: userId,
        })
      ).description,
    ).eq("Assigned description");
  });

  test("description is copied along with the content", async () => {
    const { userId: ownerId } = await createTestUser();
    const { userId: otherId } = await createTestUser();
    const contentId = await createDoc(ownerId);

    await updateDescription({
      contentId,
      loggedInUserId: ownerId,
      description: "Copy me",
    });
    await setContentIsPublic({
      contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });

    const {
      newContentIds: [copyId],
    } = await copyContent({
      contentIds: [contentId],
      loggedInUserId: otherId,
      parentId: null,
    });

    expect(
      (await getContentDetails({ contentId: copyId, loggedInUserId: otherId }))
        .description,
    ).eq("Copy me");

    // The copy's description is independent of the original's
    await updateDescription({
      contentId: copyId,
      loggedInUserId: otherId,
      description: "Changed in copy",
    });
    expect(
      (await getContentDetails({ contentId, loggedInUserId: ownerId }))
        .description,
    ).eq("Copy me");
  });

  test("schema rejects descriptions over the length limit", () => {
    const contentId = "00000000-0000-0000-0000-000000000000";
    const result = updateDescriptionOperation.request!.safeParse({
      contentId,
      description: "a".repeat(5001),
    });
    expect(result.success).eq(false);
    expect(
      result.error?.issues.some((issue) => issue.path[0] === "description"),
    ).eq(true);
  });
});
