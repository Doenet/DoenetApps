import { execFileSync } from "child_process";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  buildOpenApiSpec,
  defineOperation,
  OperationContract,
} from "../../src/contract";
import { breakingChanges } from "./gate";

function oasdiffAvailable() {
  try {
    execFileSync(process.env.OASDIFF ?? "oasdiff", ["--version"], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

const save = (request: z.ZodObject) =>
  defineOperation({
    name: "save",
    method: "post",
    path: "/things/save",
    auth: "required",
    request,
  });

const load = (response: z.ZodType) =>
  defineOperation({
    name: "load",
    method: "get",
    path: "/things/load",
    auth: "required",
    response,
  });

const loadResponse = z.object({
  name: z.string(),
  kind: z.enum(["a", "b"]),
  note: z.string().optional(),
});

const ids = (base: OperationContract[], head: OperationContract[]) =>
  breakingChanges(buildOpenApiSpec(base), buildOpenApiSpec(head)).map(
    (c) => c.id,
  );

describe.skipIf(!oasdiffAvailable())("breaking-change check", () => {
  test("additions are not breaking", () => {
    expect(
      ids(
        [load(loadResponse)],
        [
          load(loadResponse.extend({ extra: z.number() })),
          save(z.object({ id: z.string(), maybe: z.string().optional() })),
        ],
      ),
    ).toEqual([]);
  });

  test("removing an operation is breaking", () => {
    expect(
      ids([load(loadResponse), save(z.object({}))], [save(z.object({}))]),
    ).toEqual(["api-path-removed-without-deprecation"]);
  });

  test("a new required request field is breaking", () => {
    expect(
      ids(
        [save(z.object({ id: z.string() }))],
        [save(z.object({ id: z.string(), mode: z.string() }))],
      ),
    ).toEqual(["new-required-request-property"]);
  });

  test("widening or removing response fields is breaking", () => {
    for (const changed of [
      loadResponse.extend({ kind: z.enum(["a", "b", "c"]) }),
      loadResponse.extend({ name: z.string().nullable() }),
      loadResponse.omit({ note: true }),
    ]) {
      expect(ids([load(loadResponse)], [load(changed)])).toHaveLength(1);
    }
  });
});
