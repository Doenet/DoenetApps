import { describe, expect, test } from "vitest";
import { repeatCountInProblemSet } from "./problemSetItems.js";

describe("repeatCountInProblemSet", () => {
  test("a document with no settings appears once", () => {
    expect(repeatCountInProblemSet({})).eqls(1);
    expect(repeatCountInProblemSet({ numVariants: 5 })).eqls(1);
  });

  test("a repeated document appears that many times", () => {
    expect(
      repeatCountInProblemSet({ repeatInProblemSet: 3, numVariants: 5 }),
    ).eqls(3);
  });

  test("the repeat is capped by the number of variants", () => {
    expect(
      repeatCountInProblemSet({ repeatInProblemSet: 3, numVariants: 2 }),
    ).eqls(2);
    expect(
      repeatCountInProblemSet({ repeatInProblemSet: 3, numVariants: 1 }),
    ).eqls(1);
  });

  test("the repeat is at least one", () => {
    expect(
      repeatCountInProblemSet({ repeatInProblemSet: 0, numVariants: 5 }),
    ).eqls(1);
  });
});
