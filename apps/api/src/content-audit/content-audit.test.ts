import { AuditState } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { describe, expect, test } from "vitest";
import {
  createContent,
  createContentRevision,
  getAllDoenetmlVersions,
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
import { InvalidRequestError } from "../utils/error";

describe("content audit helpers", () => {
  test("returns pending issues for single documents missing both confirmations", () => {
    const content = {
      type: "singleDoc" as const,
      errorsCheck: AuditState.unchecked,
      accessibilityCheck: AuditState.unchecked,
    };

    expect(getContentAuditIssues(content)).toEqual([
      "errorsCheckPending",
      "accessibilityCheckPending",
    ]);
    expect(contentAuditPasses(content)).toBe(false);
  });

  test("returns only remaining issues for partially confirmed single documents", () => {
    const content = {
      type: "singleDoc" as const,
      errorsCheck: AuditState.pass,
      accessibilityCheck: AuditState.fail,
    };

    expect(getContentAuditIssues(content)).toEqual(["accessibilityCheck"]);
    expect(contentAuditPasses(content)).toBe(false);
  });

  test("ignores audit confirmations for non-document content", () => {
    const content = {
      type: "sequence" as const,
      errorsCheck: AuditState.unchecked,
      accessibilityCheck: AuditState.unchecked,
    };

    expect(getContentAuditIssues(content)).toEqual([]);
    expect(contentAuditPasses(content)).toBe(true);
  });

  test("resets cached confirmations when source or version changes", () => {
    expect(
      maintainContentAuditFields({
        source: undefined,
        doenetmlVersionId: undefined,
      }),
    ).toEqual({});
    expect(maintainContentAuditFields({ source: "<document />" })).toEqual(
      resetContentAuditFields,
    );
    expect(maintainContentAuditFields({ doenetmlVersionId: 2 })).toEqual(
      resetContentAuditFields,
    );
  });
});

describe("content audit updates", () => {
  test("updateContentAudit stores pass/fail states on editable docs", async () => {
    const user = await createTestUser();
    const source = "<document><text>Initial</text></document>";
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: source,
    });

    const { doenetmlVersionId } = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: { doenetmlVersionId: true },
    });

    const result = await updateContentAudit({
      contentId,
      loggedInUserId: user.userId,
      source,
      doenetmlVersionId,
      errorsCheckPasses: true,
      accessibilityCheckPasses: false,
    });

    expect(result).toMatchObject({
      type: "singleDoc",
      errorsCheck: AuditState.pass,
      accessibilityCheck: AuditState.fail,
    });

    const content = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: {
        errorsCheck: true,
        accessibilityCheck: true,
      },
    });

    expect(content).toEqual({
      errorsCheck: AuditState.pass,
      accessibilityCheck: AuditState.fail,
    });
  });

  test("updateContentAudit rejects stale source without changing audit state", async () => {
    const user = await createTestUser();
    const source = "<document><text>Initial</text></document>";
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: source,
    });

    const { doenetmlVersionId } = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: { doenetmlVersionId: true },
    });

    try {
      await updateContentAudit({
        contentId,
        loggedInUserId: user.userId,
        source: "<document><text>Outdated</text></document>",
        doenetmlVersionId,
        errorsCheckPasses: true,
        accessibilityCheckPasses: true,
      });
      expect.fail("Expected InvalidRequestError");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidRequestError);
      expect((error as InvalidRequestError).errorCode).toBe(
        StatusCodes.CONFLICT,
      );
      expect((error as InvalidRequestError).message).toBe(
        "Content source or DoenetML version is out of date",
      );
    }

    const content = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: {
        errorsCheck: true,
        accessibilityCheck: true,
      },
    });

    expect(content).toEqual({
      errorsCheck: AuditState.unchecked,
      accessibilityCheck: AuditState.unchecked,
    });
  });

  test("updateContent resets audit confirmations when source changes", async () => {
    const user = await createTestUser();
    const source = "<document><text>Initial</text></document>";
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: source,
    });

    const { doenetmlVersionId } = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: { doenetmlVersionId: true },
    });

    await updateContentAudit({
      contentId,
      loggedInUserId: user.userId,
      source,
      doenetmlVersionId,
      errorsCheckPasses: true,
      accessibilityCheckPasses: true,
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
        errorsCheck: true,
        accessibilityCheck: true,
      },
    });

    expect(content).toEqual({
      source: "<document><text>Changed</text></document>",
      errorsCheck: AuditState.unchecked,
      accessibilityCheck: AuditState.unchecked,
    });
  });

  test("revertToRevision resets audit confirmations when source changes", async () => {
    const user = await createTestUser();
    const source = "<document><text>Initial</text></document>";
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: source,
    });

    const revision = await createContentRevision({
      contentId,
      loggedInUserId: user.userId,
      revisionName: "Initial save point",
    });

    const { doenetmlVersionId } = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: { doenetmlVersionId: true },
    });

    await updateContent({
      contentId,
      loggedInUserId: user.userId,
      source: "<document><text>Changed</text></document>",
    });

    await updateContentAudit({
      contentId,
      loggedInUserId: user.userId,
      source: "<document><text>Changed</text></document>",
      doenetmlVersionId,
      errorsCheckPasses: true,
      accessibilityCheckPasses: true,
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
        errorsCheck: true,
        accessibilityCheck: true,
      },
    });

    expect(content).toEqual({
      source: "<document><text>Initial</text></document>",
      errorsCheck: AuditState.unchecked,
      accessibilityCheck: AuditState.unchecked,
    });
  }, 30000);

  test("saveSyntaxUpdate resets audit confirmations when source changes", async () => {
    const user = await createTestUser();
    const source = "<document><text>Initial</text></document>";
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: source,
    });

    const { doenetmlVersionId } = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: { doenetmlVersionId: true },
    });

    if (doenetmlVersionId === null) {
      throw new Error("Document should have a DoenetML version");
    }

    await updateContentAudit({
      contentId,
      loggedInUserId: user.userId,
      source,
      doenetmlVersionId,
      errorsCheckPasses: true,
      accessibilityCheckPasses: true,
    });

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
        errorsCheck: true,
        accessibilityCheck: true,
      },
    });

    expect(content).toEqual({
      source: "<document><text>Updated</text></document>",
      errorsCheck: AuditState.unchecked,
      accessibilityCheck: AuditState.unchecked,
    });
  });

  test("updateContent resets audit confirmations when only doenetmlVersionId changes", async () => {
    const user = await createTestUser();
    const source = "<document><text>Initial</text></document>";
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: source,
    });

    const { doenetmlVersionId } = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: { doenetmlVersionId: true },
    });

    if (doenetmlVersionId === null) {
      throw new Error("Document should have a DoenetML version");
    }

    await updateContentAudit({
      contentId,
      loggedInUserId: user.userId,
      source,
      doenetmlVersionId,
      errorsCheckPasses: true,
      accessibilityCheckPasses: true,
    });

    const { allDoenetmlVersions } = await getAllDoenetmlVersions();
    const nextVersion = allDoenetmlVersions.find(
      (version) => version.id !== doenetmlVersionId,
    );

    if (!nextVersion) {
      throw new Error("Expected a second DoenetML version in seeded data");
    }

    await updateContent({
      contentId,
      loggedInUserId: user.userId,
      doenetmlVersionId: nextVersion.id,
    });

    const content = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: {
        doenetmlVersionId: true,
        errorsCheck: true,
        accessibilityCheck: true,
      },
    });

    expect(content).toEqual({
      doenetmlVersionId: nextVersion.id,
      errorsCheck: AuditState.unchecked,
      accessibilityCheck: AuditState.unchecked,
    });
  });

  test("updateContentAudit rejects stale doenetmlVersionId without changing audit state", async () => {
    const user = await createTestUser();
    const source = "<document><text>Initial</text></document>";
    const { contentId } = await createContent({
      loggedInUserId: user.userId,
      contentType: "singleDoc",
      parentId: null,
      doenetml: source,
    });

    const { doenetmlVersionId } = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: { doenetmlVersionId: true },
    });

    if (doenetmlVersionId === null) {
      throw new Error("Document should have a DoenetML version");
    }

    const { allDoenetmlVersions } = await getAllDoenetmlVersions();
    const nextVersion = allDoenetmlVersions.find(
      (version) => version.id !== doenetmlVersionId,
    );

    if (!nextVersion) {
      throw new Error("Expected a second DoenetML version in seeded data");
    }

    await updateContent({
      contentId,
      loggedInUserId: user.userId,
      doenetmlVersionId: nextVersion.id,
    });

    try {
      await updateContentAudit({
        contentId,
        loggedInUserId: user.userId,
        source,
        doenetmlVersionId,
        errorsCheckPasses: true,
        accessibilityCheckPasses: true,
      });
      expect.fail("Expected InvalidRequestError");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidRequestError);
      expect((error as InvalidRequestError).errorCode).toBe(
        StatusCodes.CONFLICT,
      );
      expect((error as InvalidRequestError).message).toBe(
        "Content source or DoenetML version is out of date",
      );
    }

    const content = await prisma.content.findUniqueOrThrow({
      where: { id: contentId },
      select: {
        errorsCheck: true,
        accessibilityCheck: true,
      },
    });

    expect(content).toEqual({
      errorsCheck: AuditState.unchecked,
      accessibilityCheck: AuditState.unchecked,
    });
  });
});
