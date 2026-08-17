// The LMS side of the tests.
//
// The runtime is a real SCORM 2004 API implementation — scorm-again (MIT), the
// same library LMS vendors and course authors use as their API adapter — rather
// than a mock of the protocol written here.  That matters: a mock only tests
// the parts of the spec whoever wrote it happened to remember, and it will
// agree with the content under test by construction.  scorm-again enforces the
// real data model: vocabularies, read-only elements, undefined elements, and
// the string SPMs, returning the spec's error codes.
//
// In particular it REJECTS a cmi.suspend_data write over the 64,000-char SPM
// (error 406) and keeps the previous value, which is the spec-correct
// behaviour.  Real players are not uniform here, so `truncateAt` adds the other
// common behaviour — silently storing a prefix — on top.  Both are worth
// testing against; neither is worth reimplementing.

import { Scorm2004API } from "scorm-again/scorm2004";

export const SUSPEND_DATA_SPM_2004 = 64000;
export const SUSPEND_DATA_SPM_12 = 4096;

/**
 * @param {object}  options
 * @param {Window}  options.window     JSDOM window the API should run against.
 * @param {object}  [options.initial]  Flattened CMI to seed, as a returning
 *   launch would see (e.g. { "cmi.suspend_data": "..." }).
 * @param {number}  [options.truncateAt]  Emulate a player that silently stores
 *   only a prefix of suspend_data instead of rejecting the write.
 */
export function makeLms({ window, initial = {}, truncateAt = null } = {}) {
  // scorm-again reads browser globals as it initializes, so point them at this
  // test's window for the duration of construction.
  const savedWindow = globalThis.window;
  const savedDocument = globalThis.document;
  const savedStorage = globalThis.localStorage;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;

  let api;
  try {
    api = new Scorm2004API({
      autocommit: false,
      logLevel: 5, // NONE
      // No commit URL: nothing to POST to, and Commit() still succeeds, which
      // is what a player that persists locally looks like to content.
    });
    api.loadFromFlattenedJSON({
      "cmi.learner_id": "student-1",
      "cmi.learner_name": "Test Student",
      ...initial,
    });
  } finally {
    globalThis.window = savedWindow;
    globalThis.document = savedDocument;
    globalThis.localStorage = savedStorage;
  }

  const calls = [];
  // The SCORM data model is unreadable once the session is terminated (the API
  // returns "" with a "retrieve after termination" error), which is correct but
  // unhelpful for a test asserting on what the page left behind.  Mirror every
  // accepted write so assertions still work after a page-exit.
  const written = new Map(Object.entries(initial));
  let terminated = false;

  const wrap = (name) => {
    const original = api[name].bind(api);
    api[name] = (...args) => {
      const result = original(...args);
      calls.push({
        fn: name,
        key: args[0] ?? null,
        value: args[1] ?? null,
        result,
        error: api.GetLastError(),
      });
      return result;
    };
  };
  for (const name of ["Initialize", "Terminate", "GetValue", "Commit"]) {
    wrap(name);
  }

  // SetValue is wrapped separately so the truncating-player variant can sit in
  // front of the real implementation.
  const realSetValue = api.SetValue.bind(api);
  api.SetValue = (key, value) => {
    let stored = String(value);
    if (
      truncateAt !== null &&
      key === "cmi.suspend_data" &&
      stored.length > truncateAt
    ) {
      stored = stored.slice(0, truncateAt);
    }
    const result = realSetValue(key, stored);
    if (result === "true") written.set(key, stored);
    calls.push({
      fn: "SetValue",
      key,
      value: String(value),
      stored,
      result,
      error: api.GetLastError(),
    });
    return result;
  };

  const wrappedTerminate = api.Terminate.bind(api);
  api.Terminate = (...args) => {
    const result = wrappedTerminate(...args);
    terminated = true;
    return result;
  };

  api.calls = calls;
  /** Every value the content offered for a key, oldest first. */
  api.writesTo = (key) =>
    calls
      .filter((c) => c.fn === "SetValue" && c.key === key)
      .map((c) => c.value);
  /** Whether the content closed the session. */
  Object.defineProperty(api, "terminated", { get: () => terminated });
  /** What the data model holds — or last held, if the session is closed. */
  api.get = (key) => {
    if (terminated) return written.get(key) ?? "";
    const value = api.GetValue(key);
    calls.pop(); // a test's own read is not part of what the content said
    return value;
  };
  /** Writes the API rejected, with their SCORM error codes. */
  api.rejectedWrites = () =>
    calls.filter((c) => c.fn === "SetValue" && c.result === "false");

  return api;
}
