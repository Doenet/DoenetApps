import { describe, expect, test, vi } from "vitest";
import { generateHandle, generateUnusedHandle } from "../utils/names";

describe("generateHandle", () => {
  test("returns a non-empty string", () => {
    const handle = generateHandle({});
    expect(typeof handle).toBe("string");
    expect(handle.length).toBeGreaterThan(0);
  });

  test("returns a handle with no digits when appendRandomDigits is not set", () => {
    // Run many times to guard against random collisions
    for (let i = 0; i < 20; i++) {
      const handle = generateHandle({});
      expect(handle.split("").every((c) => isNaN(Number(c)))).toBe(true);
    }
  });

  test("appends the correct number of random digits", () => {
    for (const numDigits of [1, 2, 3, 4]) {
      const handle = generateHandle({ appendRandomDigits: numDigits });
      const trailingDigits = handle.slice(-numDigits);
      expect(trailingDigits).toMatch(/^\d+$/);
      // The non-digit prefix should be all letters
      const prefix = handle.slice(0, -numDigits);
      expect(prefix.split("").every((c) => isNaN(Number(c)))).toBe(true);
    }
  });

  test("zero-pads digits when the random number has fewer digits than requested", () => {
    // Force Math.random to return 0 so the digit portion is all zeros
    vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const handle = generateHandle({ appendRandomDigits: 3 });
      expect(handle.endsWith("000")).toBe(true);
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe("generateUnusedHandle", () => {
  test("returns a handle when no existing set", () => {
    const handle = generateUnusedHandle(new Set());
    expect(typeof handle).toBe("string");
    expect(handle.length).toBeGreaterThan(0);
  });

  test("returns a handle that is not already in a populated set", () => {
    const existingHandles = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const handle = generateUnusedHandle(existingHandles);
      expect(existingHandles.has(handle)).toBe(false);
      existingHandles.add(handle);
    }
  });

  test("throws after too many collisions", () => {
    // Use a Proxy whose `has()` always returns true, simulating a set that
    // contains every possible handle so every attempt collides.
    const alwaysCollides = new Proxy(new Set<string>(), {
      get(target, prop) {
        if (prop === "has") return () => true;
        return Reflect.get(target, prop, target);
      },
    });
    expect(() => generateUnusedHandle(alwaysCollides)).toThrow(
      "Failed to generate a unique handle.",
    );
  });
});
