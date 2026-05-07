import { DateTime } from "luxon";
import { describe, expect, test } from "vitest";
import {
  getWeeklyContentCreated,
  getWeeklyContentSharedPublicly,
  getWeeklyUsersJoined,
} from "../query/metrics";
import { createTestUser } from "./utils";
import { createContent } from "../query/activity";
import { setContentIsPublic } from "../query/share";

// TODO: more meaningful tests for metrics
// In order to do this, we would need to spin up a fresh testing container
// so that we can get verifiable metrics data.

describe("getWeeklyUsersJoined()", () => {
  test("picks up on new user", async () => {
    const start = DateTime.now().minus({ days: 5 });
    const end = start.plus({ days: 10 });

    const before = await getWeeklyUsersJoined({
      start: start.toJSDate(),
      end: end.toJSDate(),
    });

    await createTestUser();

    const after = await getWeeklyUsersJoined({
      start: start.toJSDate(),
      end: end.toJSDate(),
    });

    expect(after.data.length).toBeGreaterThan(0);
    expect(after.data.length).toBe(before.data.length);
    // Expect there to be at least one week where the user count increased
    expect(
      after.data.some((entry, i) => entry.count > before.data[i].count),
    ).toBe(true);
  });
});

describe("getWeeklyContentCreated()", () => {
  test("picks up on new content", async () => {
    const start = DateTime.now().minus({ days: 5 });
    const end = start.plus({ days: 10 });

    const before = await getWeeklyContentCreated({
      start: start.toJSDate(),
      end: end.toJSDate(),
    });

    const { userId } = await createTestUser();
    await createContent({
      loggedInUserId: userId,
      name: "Test Content",
      contentType: "singleDoc",
      parentId: null,
    });
    const after = await getWeeklyContentCreated({
      start: start.toJSDate(),
      end: end.toJSDate(),
    });
    expect(after.data.length).toBeGreaterThan(0);
    expect(after.data.length).toBe(before.data.length);
    // Expect there to be at least one week where the content count increased
    expect(
      after.data.some((entry, i) => entry.count > before.data[i].count),
    ).toBe(true);
  });
});

describe("getWeeklyContentSharedPublicly()", () => {
  test("picks up on newly shared public content", async () => {
    const start = DateTime.now().minus({ days: 5 });
    const end = start.plus({ days: 10 });

    const before = await getWeeklyContentSharedPublicly({
      start: start.toJSDate(),
      end: end.toJSDate(),
    });

    const { userId } = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: userId,
      name: "Test Content",
      contentType: "singleDoc",
      parentId: null,
    });
    await setContentIsPublic({
      loggedInUserId: userId,
      contentId: contentId,
      isPublic: true,
    });

    const after = await getWeeklyContentSharedPublicly({
      start: start.toJSDate(),
      end: end.toJSDate(),
    });
    expect(after.data.length).toBeGreaterThan(0);
    expect(after.data.length).toBe(before.data.length);
    // Expect there to be at least one week where the public share count increased
    expect(
      after.data.some((entry, i) => entry.count > before.data[i].count),
    ).toBe(true);
  });
});
