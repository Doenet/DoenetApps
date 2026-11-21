import { expect, test } from "vitest";
import { createTestUser, doc, setupTestContent } from "./utils";
import { fromUUID } from "../utils/uuid";
import { setContentIsPublic } from "../query/share";
import { updateCategories } from "../query/activity";
import { browseExplore, searchExplore } from "../query/explore";

test("browseExplore and searchExplore ignore non-category names in categories and return all categories", async () => {
  const { userId: ownerId } = await createTestUser();
  const { userId: viewerId } = await createTestUser();
  const code = Date.now().toString();

  const [interactiveId, videoId] = await setupTestContent(ownerId, {
    [`names${code}1`]: doc(`names${code}`),
    [`names${code}2`]: doc(`names${code}`),
  });
  for (const contentId of [interactiveId, videoId]) {
    await setContentIsPublic({
      contentId,
      loggedInUserId: ownerId,
      isPublic: true,
    });
  }
  await updateCategories({
    contentId: interactiveId,
    loggedInUserId: ownerId,
    categories: { isInteractive: true },
  });
  await updateCategories({
    contentId: videoId,
    loggedInUserId: ownerId,
    categories: { containsVideo: true },
  });

  // URL search parameter names, only one of which is a category code
  const categories = new Set(["q", "author", "addTo", "isInteractive"]);

  const browseResults = await browseExplore({
    loggedInUserId: viewerId,
    ownerId,
    categories,
  });
  expect(browseResults.recentContent.map((c) => fromUUID(c.contentId))).eqls([
    fromUUID(interactiveId),
  ]);
  expect(browseResults.totalCount.numCommunity).eq(1);

  const searchResults = await searchExplore({
    query: `names${code}`,
    loggedInUserId: viewerId,
    categories,
  });
  expect(searchResults.content.map((c) => fromUUID(c.contentId))).eqls([
    fromUUID(interactiveId),
  ]);

  for (const results of [browseResults, searchResults]) {
    const codes = results.allCategories.flatMap((group) =>
      group.categories.map((category) => category.code),
    );
    expect(codes).toContain("isInteractive");
    expect(codes).toContain("containsVideo");
  }
});
