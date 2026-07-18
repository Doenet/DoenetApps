import { afterEach, describe, expect, test, vi } from "vitest";
import crypto from "crypto";
import axios from "axios";
import { prisma } from "../model";
import { updateTrackedDoenetmlVersion } from "../query/doenetmlVersion";
import { updateTrackedDoenetmlVersionSchema } from "../schemas/doenetmlVersionSchemas";

vi.mock("axios");

// Track rows created during the test so they can be cleaned up, keeping the
// shared seeded "latest"/"dev" rows untouched.
const createdTagIds: number[] = [];

async function createTrackingRow(tag: string, fullVersion: string) {
  const row = await prisma.doenetmlVersions.create({
    data: {
      displayedVersion: `test-${crypto.randomUUID()}`,
      fullVersion,
      trackingNpmTag: tag,
    },
  });
  createdTagIds.push(row.id);
  return row;
}

afterEach(async () => {
  vi.mocked(axios.get).mockReset();
  if (createdTagIds.length > 0) {
    await prisma.doenetmlVersions.deleteMany({
      where: { id: { in: createdTagIds.splice(0) } },
    });
  }
});

describe("updateTrackedDoenetmlVersionSchema", () => {
  test("accepts release and dev versions across dev-version schemes", () => {
    for (const version of [
      "0.7.21",
      "0.7.21-dev.343",
      // Older DoenetML dev scheme: -dev.<timestamp>.<shorthash>
      "0.7.21-dev.20260718120000.abc1234",
    ]) {
      expect(
        updateTrackedDoenetmlVersionSchema.safeParse({ tag: "dev", version })
          .success,
      ).toBe(true);
    }
  });

  test("allows omitting the version", () => {
    expect(
      updateTrackedDoenetmlVersionSchema.safeParse({ tag: "latest" }).success,
    ).toBe(true);
  });

  test("rejects an unknown tag", () => {
    expect(
      updateTrackedDoenetmlVersionSchema.safeParse({
        tag: "beta",
        version: "0.7.21",
      }).success,
    ).toBe(false);
  });

  test("rejects malformed / injection-prone versions", () => {
    for (const version of [
      "latest",
      "0.7",
      "0.7.21/../evil",
      "0.7.21/style.css",
      "0.7.21 ",
      "0.7.21-", // empty prerelease
      "0.7.21-dev/../x",
    ]) {
      expect(
        updateTrackedDoenetmlVersionSchema.safeParse({ tag: "latest", version })
          .success,
      ).toBe(false);
    }
  });
});

describe("updateTrackedDoenetmlVersion()", () => {
  test("pins the tracked row to an explicit version and is idempotent", async () => {
    const tag = `test-${crypto.randomUUID()}`;
    await createTrackingRow(tag, "0.0.1");

    const first = await updateTrackedDoenetmlVersion({
      tag,
      version: "0.7.21",
    });
    expect(first).toMatchObject({
      tag,
      previousVersion: "0.0.1",
      version: "0.7.21",
      changed: true,
    });

    const row = await prisma.doenetmlVersions.findUnique({
      where: { trackingNpmTag: tag },
    });
    expect(row?.fullVersion).toBe("0.7.21");

    // Re-running with the same version is a no-op.
    const second = await updateTrackedDoenetmlVersion({
      tag,
      version: "0.7.21",
    });
    expect(second.changed).toBe(false);
    expect(second.previousVersion).toBe("0.7.21");
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("resolves the version from npm when none is provided", async () => {
    const tag = `test-${crypto.randomUUID()}`;
    await createTrackingRow(tag, "0.0.1");

    vi.mocked(axios.get).mockResolvedValue({
      data: { latest: "1.2.3", dev: "1.2.3-dev.9", [tag]: "0.7.22" },
    });

    const result = await updateTrackedDoenetmlVersion({ tag });
    expect(axios.get).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ version: "0.7.22", changed: true });

    const row = await prisma.doenetmlVersions.findUnique({
      where: { trackingNpmTag: tag },
    });
    expect(row?.fullVersion).toBe("0.7.22");
  });

  test("rejects a malformed version resolved from npm", async () => {
    const tag = `test-${crypto.randomUUID()}`;
    await createTrackingRow(tag, "0.0.1");

    vi.mocked(axios.get).mockResolvedValue({
      data: { [tag]: "0.7.21/../evil" },
    });

    await expect(updateTrackedDoenetmlVersion({ tag })).rejects.toThrow(
      /invalid version/,
    );

    // The bad value must not have been written to the tracked row.
    const row = await prisma.doenetmlVersions.findUnique({
      where: { trackingNpmTag: tag },
    });
    expect(row?.fullVersion).toBe("0.0.1");
  });

  test("throws when no row tracks the tag", async () => {
    await expect(
      updateTrackedDoenetmlVersion({
        tag: `test-missing-${crypto.randomUUID()}`,
        version: "0.7.21",
      }),
    ).rejects.toThrow();
  });
});
