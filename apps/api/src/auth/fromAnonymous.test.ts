import { describe, expect, test, vi, afterEach } from "vitest";
import { parseFromAnonymous } from "./fromAnonymous";
import { fromUUID, newUUID } from "../utils/uuid";

describe("parseFromAnonymous", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("reads a short-form user id", () => {
    const userId = newUUID();

    expect(parseFromAnonymous(fromUUID(userId))).toStrictEqual(userId);
  });

  test("treats the magic-link placeholder as no anonymous account", () => {
    // passport-magic-link requires the field, so the login route sends `" "`
    // when there is no anonymous account.
    expect(parseFromAnonymous(" ")).eq(undefined);
    expect(parseFromAnonymous("")).eq(undefined);
    expect(parseFromAnonymous(undefined)).eq(undefined);
  });

  test("ignores an unparsable id rather than failing the login", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseFromAnonymous("not-a-uuid")).eq(undefined);
    expect(warn).toHaveBeenCalled();
  });
});
