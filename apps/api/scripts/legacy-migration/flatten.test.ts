import { describe, expect, it } from "vitest";
import {
  classifyShape,
  entriesFromJsonDefinition,
  flattenEntries,
  scanImageCids,
} from "./flatten";
import { rewriteImageSources } from "./rewriteImages";

describe("entriesFromJsonDefinition", () => {
  it("reads the content array of an activity", () => {
    const def = {
      type: "activity",
      isSinglePage: true,
      content: ["_page1"],
      assignedCid: null,
    };
    expect(entriesFromJsonDefinition(def, "activity")).toEqual(["_page1"]);
  });

  it("reads the pages array of a bank", () => {
    const def = { type: "bank", pages: ["_p1", "_p2"] };
    expect(entriesFromJsonDefinition(def, "bank")).toEqual(["_p1", "_p2"]);
  });

  it("accepts a JSON string", () => {
    expect(
      entriesFromJsonDefinition(
        '{"type":"activity","content":["_a"]}',
        "activity",
      ),
    ).toEqual(["_a"]);
  });

  it("returns [] when the array is absent", () => {
    expect(entriesFromJsonDefinition({ type: "activity" }, "activity")).toEqual(
      [],
    );
  });

  it("returns null for malformed definitions", () => {
    expect(entriesFromJsonDefinition("not json", "activity")).toBeNull();
    expect(entriesFromJsonDefinition(42, "activity")).toBeNull();
    expect(
      entriesFromJsonDefinition(
        { type: "activity", content: "_a" },
        "activity",
      ),
    ).toBeNull();
  });
});

describe("flattenEntries", () => {
  it("keeps plain page order", () => {
    expect(flattenEntries(["_a", "_b", "_c"])).toEqual(["_a", "_b", "_c"]);
  });

  it("recurses through orders in document order", () => {
    const entries = [
      "_a",
      {
        type: "order",
        behavior: "select",
        numberToSelect: 1,
        content: [
          "_b",
          { type: "order", behavior: "shuffle", content: ["_c"] },
        ],
      },
      "_d",
    ];
    expect(flattenEntries(entries)).toEqual(["_a", "_b", "_c", "_d"]);
  });

  it("handles orders that use a pages array", () => {
    const entries = [{ type: "order", pages: ["_x", "_y"] }];
    expect(flattenEntries(entries)).toEqual(["_x", "_y"]);
  });
});

describe("classifyShape", () => {
  it("classifies a single lone string as singleDoc", () => {
    expect(classifyShape(["_a"])).toBe("singleDoc");
  });

  it("classifies multiple strings as sequence", () => {
    expect(classifyShape(["_a", "_b"])).toBe("sequence");
  });

  it("classifies a lone order object as sequence, even with one page", () => {
    expect(classifyShape([{ type: "order", content: ["_a"] }])).toBe(
      "sequence",
    );
  });

  it("classifies an empty array as empty", () => {
    expect(classifyShape([])).toBe("empty");
  });
});

describe("scanImageCids", () => {
  it("finds and dedupes cids", () => {
    const source = `
      <image source='doenet:cid=bafkreiaaa' description='one' />
      <image source="doenet:cid=bafkreibbb" />
      <image source='doenet:cid=bafkreiaaa' />
    `;
    expect(scanImageCids(source).sort()).toEqual(["bafkreiaaa", "bafkreibbb"]);
  });

  it("returns nothing for sources without references", () => {
    expect(scanImageCids("<p>hello</p>")).toEqual([]);
  });
});

describe("rewriteImageSources", () => {
  it("replaces resolvable references and reports them", () => {
    const source = `<image source='doenet:cid=bafkreiaaa' width='50px' />`;
    const result = rewriteImageSources(source, (cid) =>
      cid === "bafkreiaaa" ? "doenet:NewId123" : null,
    );
    expect(result.source).toBe(
      `<image source='doenet:NewId123' width='50px' />`,
    );
    expect(result.rewritten).toEqual(["bafkreiaaa"]);
    expect(result.unresolved).toEqual([]);
  });

  it("leaves unresolvable references untouched", () => {
    const source = `<image source='doenet:cid=bafkreiccc' />`;
    const result = rewriteImageSources(source, () => null);
    expect(result.source).toBe(source);
    expect(result.unresolved).toEqual(["bafkreiccc"]);
  });

  it("rewrites multiple references in one source", () => {
    const source = `a doenet:cid=bafkreiaaa b doenet:cid=bafkreibbb c doenet:cid=bafkreiaaa`;
    const result = rewriteImageSources(
      source,
      (cid) => `doenet:X${cid.slice(-3)}`,
    );
    expect(result.source).toBe(`a doenet:Xaaa b doenet:Xbbb c doenet:Xaaa`);
    expect(result.rewritten.sort()).toEqual(["bafkreiaaa", "bafkreibbb"]);
  });
});
