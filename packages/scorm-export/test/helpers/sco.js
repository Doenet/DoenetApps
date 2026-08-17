// Boot a real built SCORM package inside JSDOM, with a fake LMS API and a fake
// Doenet iframe.
//
// The point of testing here rather than end-to-end is that the bridge only
// touches two interfaces: the SCORM API object, and SPLICE postMessages from
// the activity iframe.  Faking both makes the state-size edge cases ordinary
// deterministic logic tests — we choose the exact size of the state blob,
// instead of hoping a real activity happens to produce one.
//
// What this therefore does NOT prove: that a real LMS behaves like the fake,
// that the CDN viewer emits the state shape we send, or that real Doenet state
// ever reaches these sizes.  See test/README.md.

import { JSDOM } from "jsdom";
import LZString from "lz-string";

import { buildScormFiles } from "../../src/index.js";
import { loadAssets } from "./assets.js";
import { makeLms } from "./lms.js";

const assets = loadAssets();

export const ACTIVITY_ID = "test-activity";

/**
 * Build the package, inline its scripts into index.html (JSDOM does not fetch
 * subresources), and run it with the fake API already installed — the bridge
 * discovers the API at load time, so it has to be there before parsing.
 */
export function launchSco({
  lmsOptions = {},
  doenetML = "<p>hi</p>",
  breakLocalStorage = false,
} = {}) {
  let api;
  const files = buildScormFiles(assets, {
    doenetML,
    title: "Test Activity",
    id: ACTIVITY_ID,
  });

  const html = files["index.html"].replace(
    /<script src="([^"]+)"><\/script>/g,
    (_, src) => `<script>${files[src]}</script>`,
  );

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://lms.example/courses/1/sco/index.html",
    beforeParse(window) {
      // The API has to exist before parsing: the bridge discovers it at load
      // time.  It is also built against this window, since scorm-again reads
      // browser globals as it initializes.
      api = makeLms({ window, ...lmsOptions });
      window.API_1484_11 = api;
      if (breakLocalStorage) {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          value: {
            getItem: () => null,
            removeItem: () => {},
            setItem() {
              throw new DOMException("quota", "QuotaExceededError");
            },
          },
        });
      }
      window.__warnings = [];
      const warn = window.console.warn.bind(window.console);
      window.console.warn = (...args) => {
        window.__warnings.push(args.map(String).join(" "));
        void warn;
      };
      window.console.log = () => {};
    },
  });

  const { window } = dom;
  const iframe = window.document.querySelector("iframe");

  return {
    api,
    dom,
    window,
    warnings: window.__warnings,

    /** The activity reports a score plus a state blob, as DoenetML does. */
    report({ score, state }) {
      window.dispatchEvent(
        new window.MessageEvent("message", {
          data: {
            subject: "SPLICE.reportScoreAndState",
            message_id: "m" + window.__warnings.length,
            score,
            state,
            act: "answered",
          },
          source: iframe.contentWindow,
        }),
      );
    },

    /** The activity asks for its saved state, as it does on (re)load. */
    async requestState() {
      const responses = [];
      iframe.contentWindow.addEventListener("message", (e) =>
        responses.push(e.data),
      );
      window.dispatchEvent(
        new window.MessageEvent("message", {
          data: { subject: "SPLICE.getState", message_id: "g1" },
          source: iframe.contentWindow,
        }),
      );
      await tick();
      return responses.find((r) => r?.subject === "SPLICE.getState.response");
    },

    /**
     * The student closes the tab.  pagehide with persisted=false is the case
     * the bridge treats as a real unload (persisted=true means bfcache, which
     * it deliberately ignores).
     */
    leave({ persisted = false } = {}) {
      const event = new window.Event("pagehide");
      Object.defineProperty(event, "persisted", { value: persisted });
      window.dispatchEvent(event);
    },

    /** What the LMS currently holds, parsed. Throws if it is not valid JSON. */
    suspendData() {
      return JSON.parse(api.get("cmi.suspend_data"));
    },

    /** The Doenet state map the LMS copy would restore, or null. */
    restoredStates() {
      const parsed = this.suspendData();
      if (!parsed.dz) return null;
      return JSON.parse(LZString.decompressFromBase64(parsed.dz));
    },

    close() {
      window.close();
    },
  };
}

export function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * A state blob of a given size with low internal repetition, because real
 * Doenet state compresses only ~1.2-1.8x — repetitive filler compresses 5-20x
 * and would put the budget boundary in the wrong place entirely.
 */
export function stateOfSize(bytes, seed = 1) {
  let out = "";
  let x = seed * 7919 + 12345;
  while (out.length < bytes) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out += x.toString(36) + ":" + (x % 97) + ",";
  }
  return { cid: "c" + seed, work: out.slice(0, bytes) };
}
