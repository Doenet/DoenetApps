import { expect, test } from "vitest";
import { createTestUser, doc, setupTestContent } from "./utils";
import { setContentIsPublic } from "../query/share";
import { browseSharedContent, searchSharedContent } from "../query/explore";

test("Explore content lists return at most one page of 24", async () => {
  const { userId: ownerId } = await createTestUser();
  const { userId: viewerId } = await createTestUser();
  const code = Date.now().toString();

  const contents: Record<string, ReturnType<typeof doc>> = {};
  for (let i = 0; i < 26; i++) {
    contents[`page${code}${i}`] = doc(`page${code}`);
  }
  const contentIds = await setupTestContent(ownerId, contents);
  for (const contentId of contentIds) {
    await setContentIsPublic({
      contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
  }

  const browseResults = await browseSharedContent({
    isCurated: false,
    loggedInUserId: viewerId,
    ownerId,
  });
  expect(browseResults.length).eq(24);

  const searchResults = await searchSharedContent({
    query: `page${code}`,
    isCurated: false,
    loggedInUserId: viewerId,
  });
  expect(searchResults.length).eq(24);
});
