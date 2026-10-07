import { describe, expect, it } from "vitest";
import { rewriteActivityRefs } from "./rewriteRefs";

const MAP: Record<string, string> = {
  _legacyAbc: "NewShort123",
  _legacyDef: "NewShort456",
};
const resolve = (id: string) => MAP[id] ?? null;

describe("rewriteActivityRefs", () => {
  it("rewrites activityId refs", () => {
    const source = `<p>See <ref uri="doenet:activityId=_legacyAbc">this</ref>.</p>`;
    const result = rewriteActivityRefs(source, resolve);
    expect(result.source).toBe(
      `<p>See <ref uri="doenet:activityId=NewShort123">this</ref>.</p>`,
    );
    expect(result.rewritten).toEqual(["_legacyAbc"]);
    expect(result.unresolved).toEqual([]);
  });

  it("rewrites the deprecated doenetId form and preserves the param name", () => {
    const source = `<ref uri='doenet:doenetId=_legacyDef'>link</ref>`;
    const result = rewriteActivityRefs(source, resolve);
    expect(result.source).toBe(
      `<ref uri='doenet:doenetId=NewShort456'>link</ref>`,
    );
  });

  it("preserves extra uri params and hashes", () => {
    const source = `<ref uri="doenet:activityId=_legacyAbc&page=2#frag">x</ref>`;
    const result = rewriteActivityRefs(source, resolve);
    expect(result.source).toBe(
      `<ref uri="doenet:activityId=NewShort123&page=2#frag">x</ref>`,
    );
  });

  it("leaves unresolvable ids untouched and reports them", () => {
    const source = `<ref uri="doenet:activityId=_unknown1">x</ref>`;
    const result = rewriteActivityRefs(source, resolve);
    expect(result.source).toBe(source);
    expect(result.unresolved).toEqual(["_unknown1"]);
  });

  it("does not touch copy transclusions, but counts them", () => {
    const source =
      `<copy uri="doenet:doenetId=_legacyAbc" />` +
      `<copy uri='doenet:cid=bafkreiaaa' />` +
      `<ref uri="doenet:activityId=_legacyAbc">x</ref>`;
    const result = rewriteActivityRefs(source, resolve);
    expect(result.source).toContain(
      `<copy uri="doenet:doenetId=_legacyAbc" />`,
    );
    expect(result.source).toContain(`<copy uri='doenet:cid=bafkreiaaa' />`);
    expect(result.source).toContain(`doenet:activityId=NewShort123`);
    expect(result.copyRefs).toBe(2);
  });

  it("ignores refs without a doenet: uri and plain-url refs", () => {
    const source =
      `<ref uri="https://example.com?activityId=_legacyAbc">x</ref>` +
      `<ref target="p1">y</ref>`;
    const result = rewriteActivityRefs(source, resolve);
    expect(result.source).toBe(source);
    expect(result.rewritten).toEqual([]);
  });

  it("handles multiple refs and case-insensitive tags", () => {
    const source =
      `<Ref uri="doenet:activityId=_legacyAbc">a</Ref>\n` +
      `<ref uri="doenet:activityId=_legacyDef">b</ref>`;
    const result = rewriteActivityRefs(source, resolve);
    expect(result.source).toContain("NewShort123");
    expect(result.source).toContain("NewShort456");
    expect(result.rewritten.sort()).toEqual(["_legacyAbc", "_legacyDef"]);
  });

  it("is a no-op on a re-run (new ids resolve to nothing)", () => {
    const first = rewriteActivityRefs(
      `<ref uri="doenet:activityId=_legacyAbc">x</ref>`,
      resolve,
    );
    const second = rewriteActivityRefs(first.source, resolve);
    expect(second.source).toBe(first.source);
    expect(second.rewritten).toEqual([]);
    expect(second.unresolved).toEqual(["NewShort123"]);
  });
});
