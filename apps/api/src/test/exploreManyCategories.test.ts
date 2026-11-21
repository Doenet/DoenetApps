import { expect, test } from "vitest";
import { createTestUser, doc, setupTestContent } from "./utils";
import { fromUUID } from "../utils/uuid";
import { setContentIsPublic } from "../query/share";
import { updateCategories } from "../query/activity";
import {
  browseExplore,
  resolveCategoryCodes,
  searchExplore,
} from "../query/explore";
import { browseExploreSchema } from "../schemas/exploreSchema";
import { getAllCategories } from "../categories";

test("browseExplore and searchExplore filter by many categories without exceeding the join limit", async () => {
  const { userId: ownerId } = await createTestUser();
  const { userId: viewerId } = await createTestUser();
  const code = Date.now().toString();

  const [contentId] = await setupTestContent(ownerId, {
    [`many${code}`]: doc(`many${code}`),
  });
  await setContentIsPublic({
    contentId,
    loggedInUserId: ownerId,
    isPublic: true,
  });
  await updateCategories({
    contentId,
    loggedInUserId: ownerId,
    categories: { isInteractive: true, containsVideo: true },
  });

  // Each category used to add two joins to each explore query, so 26 or more
  // could exceed MySQL's limit of 61 tables in a join
  const unknownCodes = Array.from({ length: 40 }, (_, i) => `unknown${i}`);

  for (const categories of [
    new Set(["isInteractive", "containsVideo"]),
    new Set(["isInteractive", "containsVideo", ...unknownCodes]),
  ]) {
    const expected = categories.size === 2 ? [fromUUID(contentId)] : [];

    const browseResults = await browseExplore({
      loggedInUserId: viewerId,
      ownerId,
      categories,
    });
    expect(browseResults.recentContent.map((c) => fromUUID(c.contentId))).eqls(
      expected,
    );

    const searchResults = await searchExplore({
      query: `many${code}`,
      loggedInUserId: viewerId,
      categories,
    });
    expect(searchResults.content.map((c) => fromUUID(c.contentId))).eqls(
      expected,
    );
  }
});

test("explore category codes that differ only in letter case name the same category", async () => {
  const { userId: ownerId } = await createTestUser();
  const { userId: viewerId } = await createTestUser();
  const code = Date.now().toString();

  const [contentId] = await setupTestContent(ownerId, {
    [`case${code}`]: doc(`case${code}`),
  });
  await setContentIsPublic({
    contentId,
    loggedInUserId: ownerId,
    isPublic: true,
  });
  await updateCategories({
    contentId,
    loggedInUserId: ownerId,
    categories: { isInteractive: true },
  });

  // The codes are compared with the column's case-insensitive collation, so
  // both codes name isInteractive, as when each code was joined on
  const categories = new Set(["isInteractive", "ISINTERACTIVE"]);

  // They resolve to the one id that isInteractive alone resolves to, so the
  // filter probes that category once
  const isInteractiveOnly = await resolveCategoryCodes(
    new Set(["isInteractive"]),
  );
  expect(isInteractiveOnly?.ids).toHaveLength(1);
  expect(await resolveCategoryCodes(categories)).eqls(isInteractiveOnly);

  const browseResults = await browseExplore({
    loggedInUserId: viewerId,
    ownerId,
    categories,
  });
  for (const list of [
    browseResults.recentContent,
    browseResults.trendingContent,
  ]) {
    expect(list.map((c) => fromUUID(c.contentId))).eqls([fromUUID(contentId)]);
  }
  expect(browseResults.totalCount).eqls({ numCommunity: 1, numCurated: 0 });
  expect(browseResults.countByCategory.isInteractive).eqls({
    numCommunity: 1,
    numCurated: 0,
  });

  const searchResults = await searchExplore({
    query: `case${code}`,
    loggedInUserId: viewerId,
    categories,
  });
  expect(searchResults.content.map((c) => fromUUID(c.contentId))).eqls([
    fromUUID(contentId),
  ]);
});

test("explore with an unknown category code finds nothing and counts zero for every category", async () => {
  const { userId: ownerId } = await createTestUser();
  const code = Date.now().toString();

  const [contentId] = await setupTestContent(ownerId, {
    [`unknown${code}`]: doc(`unknown${code}`),
  });
  await setContentIsPublic({
    contentId,
    loggedInUserId: ownerId,
    isPublic: true,
  });
  await updateCategories({
    contentId,
    loggedInUserId: ownerId,
    categories: { isInteractive: true },
  });

  const categories = new Set(["isInteractive", `unknown${code}`]);

  // Other test files create and delete categories concurrently, so check the
  // codes that exist both before and after the request
  const allCodes = async () =>
    (await getAllCategories()).allCategories.flatMap((g) =>
      g.categories.map((c) => c.code),
    );
  const codesBefore = await allCodes();
  const browseResults = await browseExplore({ ownerId, categories });
  const codesAfter = await allCodes();
  expect(browseResults.recentContent).eqls([]);
  expect(browseResults.trendingContent).eqls([]);
  expect(browseResults.totalCount).eqls({ numCommunity: 0, numCurated: 0 });
  const stableCodes = codesBefore.filter((c) => codesAfter.includes(c));
  expect(stableCodes).toContain("isInteractive");
  expect(Object.keys(browseResults.countByCategory)).toEqual(
    expect.arrayContaining(stableCodes),
  );
  for (const counts of Object.values(browseResults.countByCategory)) {
    expect(counts).eqls({ numCommunity: 0, numCurated: 0 });
  }

  const searchResults = await searchExplore({
    query: `unknown${code}`,
    categories,
  });
  expect(searchResults.content).eqls([]);
  expect(searchResults.totalCount).eqls({ numCommunity: 0, numCurated: 0 });
});

test("browseExploreSchema caps the number of category codes", () => {
  const codes = (n: number) => Array.from({ length: n }, (_, i) => `code${i}`);

  expect(
    browseExploreSchema.safeParse({ categories: codes(100) }).success,
  ).toBe(true);
  expect(
    browseExploreSchema.safeParse({ categories: codes(101) }).success,
  ).toBe(false);
});

test("browseExploreSchema caps the length of each category code", () => {
  expect(
    browseExploreSchema.safeParse({ categories: ["x".repeat(400)] }).success,
  ).toBe(true);
  expect(
    browseExploreSchema.safeParse({ categories: ["x".repeat(401)] }).success,
  ).toBe(false);
});
