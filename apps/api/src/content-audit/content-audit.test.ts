import { describe, expect, test } from "vitest";
import {
  createContent,
  createContentRevision,
  revertToRevision,
  saveSyntaxUpdate,
  updateContent,
} from "../query/activity";
import {
  contentAuditPasses,
  getContentAuditIssues,
  maintainContentAuditFields,
  resetContentAuditFields,
  updateContentAudit,
} from "./content-audit";
import { prisma } from "../model";
import { createTestUser } from "../test/utils";

describe("content audit helpers", () => {
  test("returns both issues for single documents missing both confirmations", () => {
    const content = {
      type: "singleDoc" as const,
      noErrorsConfirmed: false,
      accessibilityConfirmed: false,
    };

    expect(getContentAuditIssues(content)).toEqual([
      "documentErrors",
      "level1AccessibilityViolations",
    ]);
    expect(contentAuditPasses(content)).toBe(false);
  });

  test("returns only remaining issues for partially confirmed single documents", () => {
    const content = {
      type: "singleDoc" as const,
      noErrorsConfirmed: true,
      accessibilityConfirmed: false,
    };

    expect(getContentAuditIssues(content)).toEqual([
      "level1AccessibilityViolations",
    ]);
    expect(contentAuditPasses(content)).toBe(false);
  });

  test("ignores audit confirmations for non-document content", () => {
    const content = {
      type: "sequence" as const,
      noErrorsConfirmed: false,
      accessibilityConfirmed: false,
    };

    expect(getContentAuditIssues(content)).toEqual([]);
    expect(contentAuditPasses(content)).toBe(true);
  });

  test("resets cached confirmations only when the source changes", () => {
    expect(maintainContentAuditFields(undefined)).toEqual({});
    expect(maintainContentAuditFields("<document />")).toEqual(
      resetContentAuditFields,
    );
  });
});

describe("content audit updates", () => {
  test("updateContentAudit stores confirmations on editable docs", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: "<document><text>Initial</text></document>",
    });

    const result = await updateContentAudit({
      contentId,
      loggedInUserId: user.userId,
      noErrorsConfirmed: true,
      accessibilityConfirmed: true,
    });

    expect(result).toMatchObject({
      type: "singleDoc",
      noErrorsConfirmed: true,
      accessibilityConfirmed: true,
    });

    const content = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: {
        noErrorsConfirmed: true,
        accessibilityConfirmed: true,
      },
    });

    expect(content).toEqual({
      noErrorsConfirmed: true,
      accessibilityConfirmed: true,
    });
  });

  test("updateContent resets audit confirmations when source changes", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: "<document><text>Initial</text></document>",
    });

    await updateContentAudit({
      contentId,
      loggedInUserId: user.userId,
      noErrorsConfirmed: true,
      accessibilityConfirmed: true,
    });

    await updateContent({
      contentId,
      loggedInUserId: user.userId,
      source: "<document><text>Changed</text></document>",
    });

    const content = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: {
        source: true,
        noErrorsConfirmed: true,
        accessibilityConfirmed: true,
      },
    });

    expect(content).toEqual({
      source: "<document><text>Changed</text></document>",
      noErrorsConfirmed: false,
      accessibilityConfirmed: false,
    });
  });

  test("revertToRevision resets audit confirmations when source changes", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: "<document><text>Initial</text></document>",
    });

    const revision = await createContentRevision({
      contentId,
      loggedInUserId: user.userId,
      revisionName: "Initial save point",
    });

    await updateContent({
      contentId,
      loggedInUserId: user.userId,
      source: "<document><text>Changed</text></document>",
    });

    await updateContentAudit({
      contentId,
      loggedInUserId: user.userId,
      noErrorsConfirmed: true,
      accessibilityConfirmed: true,
    });

    await revertToRevision({
      contentId,
      loggedInUserId: user.userId,
      revisionNum: revision.revisionNum,
    });

    const content = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: {
        source: true,
        noErrorsConfirmed: true,
        accessibilityConfirmed: true,
      },
    });

    expect(content).toEqual({
      source: "<document><text>Initial</text></document>",
      noErrorsConfirmed: false,
      accessibilityConfirmed: false,
    });
  }, 30000);

  test("saveSyntaxUpdate resets audit confirmations when source changes", async () => {
    const user = await createTestUser();
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: "<document><text>Initial</text></document>",
    });

    await updateContentAudit({
      contentId,
      loggedInUserId: user.userId,
      noErrorsConfirmed: true,
      accessibilityConfirmed: true,
    });

    const { doenetmlVersionId } = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: { doenetmlVersionId: true },
    });

    if (doenetmlVersionId === null) {
      throw new Error("Document should have a DoenetML version");
    }

    await saveSyntaxUpdate({
      contentId,
      loggedInUserId: user.userId,
      updatedDoenetmlVersionId: doenetmlVersionId,
      updatedSource: "<document><text>Updated</text></document>",
    });

    const content = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: {
        source: true,
        noErrorsConfirmed: true,
        accessibilityConfirmed: true,
      },
    });

    expect(content).toEqual({
      source: "<document><text>Updated</text></document>",
      noErrorsConfirmed: false,
      accessibilityConfirmed: false,
    });
  });
});
