// How a Doenet activity gets submitted.
//
// There is no "Submit Assignment" button: a Doenet activity has no single
// end-of-page submission.  The viewer reports SPLICE.reportScoreAndState after
// every answer, carrying the whole document's score, so the grade is already
// correct at all times — the button only ever added completion_status and
// success_status on top of a score that was already in the gradebook.
//
// These tests pin that down: the grade must never depend on an explicit
// submission, and completion must land on page exit instead.

import { describe, it, expect } from "vitest";

import { launchSco, stateOfSize, tick } from "./helpers/sco.js";
import { makeLms } from "./helpers/lms.js";

describe("the grade does not depend on an explicit submission", () => {
  it("renders no submit button", async () => {
    const sco = launchSco();
    await tick();

    expect(
      sco.window.document.getElementById("ptx-scorm-submit-btn"),
    ).toBeNull();
    expect(
      sco.window.document.getElementById("ptx-scorm-submit-wrapper"),
    ).toBeNull();
    sco.close();
  });

  it("commits the score from the SPLICE report alone", async () => {
    const sco = launchSco();
    await tick();

    sco.report({ score: 0.6, state: stateOfSize(500) });
    await tick();

    expect(Number(sco.api.get("cmi.score.scaled"))).toBe(0.6);
    expect(sco.api.calls.some((c) => c.fn === "Commit")).toBe(true);
    sco.close();
  });

  it("tracks the latest report, since Doenet sends the running total", async () => {
    // Doenet's payload carries the whole document's score, not one question's,
    // so the newest report replaces the previous grade rather than adding to it.
    const sco = launchSco();
    await tick();

    sco.report({ score: 0.25, state: stateOfSize(500, 1) });
    await tick();
    expect(Number(sco.api.get("cmi.score.scaled"))).toBe(0.25);

    sco.report({ score: 1, state: stateOfSize(500, 2) });
    await tick();
    expect(Number(sco.api.get("cmi.score.scaled"))).toBe(1);
    sco.close();
  });
});

describe("completion is recorded when the student leaves", () => {
  it("stays incomplete while the student is working", async () => {
    const sco = launchSco();
    await tick();
    sco.report({ score: 0.5, state: stateOfSize(500) });
    await tick();

    // Marking it complete mid-session is what made Blackboard treat a
    // navigate-away as a finalized submission and lock the attempt.
    expect(sco.api.get("cmi.completion_status")).toBe("incomplete");
    sco.close();
  });

  it("marks completed on page exit, keeping the attempt resumable", async () => {
    const sco = launchSco();
    await tick();
    sco.report({ score: 0.75, state: stateOfSize(500) });
    await tick();

    sco.leave();

    expect(sco.api.get("cmi.completion_status")).toBe("completed");
    expect(sco.api.get("cmi.exit")).toBe("suspend");
    expect(Number(sco.api.get("cmi.score.scaled"))).toBe(0.75);
    expect(sco.api.terminated).toBe(true);
    sco.close();
  });

  it("does not mark completed if nothing was ever answered", async () => {
    // Opening an activity and closing it is not completing it.
    const sco = launchSco();
    await tick();

    sco.leave();

    expect(sco.api.get("cmi.completion_status")).toBe("incomplete");
    sco.close();
  });

  it("ignores a bfcache pagehide", async () => {
    const sco = launchSco();
    await tick();
    sco.report({ score: 1, state: stateOfSize(500) });
    await tick();

    sco.leave({ persisted: true });

    expect(sco.api.get("cmi.completion_status")).toBe("incomplete");
    expect(sco.api.terminated).toBe(false);
    sco.close();
  });

  it("leaves success_status to the LMS", async () => {
    // The removed button set it to "passed" unconditionally — a student who
    // scored 0 was recorded as passed.  Pass/fail belongs to the LMS and its
    // mastery score, which is what the per-answer path already says.
    const sco = launchSco();
    await tick();
    sco.report({ score: 0, state: stateOfSize(500) });
    await tick();
    sco.leave();

    expect(sco.api.writesTo("cmi.success_status")).toEqual([]);
    expect(Number(sco.api.get("cmi.score.scaled"))).toBe(0);
    expect(sco.api.get("cmi.completion_status")).toBe("completed");
    sco.close();
  });

  it("does not re-mark an attempt the LMS already shows as completed", async () => {
    const sco = launchSco({
      lmsOptions: {
        initial: { "cmi.completion_status": "completed" },
      },
    });
    await tick();
    sco.report({ score: 1, state: stateOfSize(500) });
    await tick();
    sco.leave();

    expect(sco.api.writesTo("cmi.completion_status")).toEqual([]);
    sco.close();
  });
});
