import { DoenetViewer } from "@doenet/doenetml-iframe";
import { doenetImagesUrl } from "../utils/media";
import axios from "axios";
import { useLoaderData } from "react-router";
import { ActivitySource, isActivitySource } from "@doenet-tools/shared";
import { Content, DoenetmlVersion } from "../types";
import { compileActivityFromContent } from "../utils/activity";
import { useEffect } from "react";
import { ActivityViewer as DoenetActivityViewer } from "@doenet/assignment-viewer";
import { effectiveDarkMode } from "../utils/theme";
import short from "short-uuid";

/**
 * Display flags an embedding page may set through query parameters, e.g.
 * `/embed/<id>?solutionDisplayMode=none&showHints=false` to show an activity
 * without its solutions, given answers, or hints (as in a diagnostic quiz).
 *
 * Only these display-related flags are accepted. Persistence and event flags
 * stay under the embed's control. Unrecognized parameters or values are
 * ignored, leaving the viewer's default for that flag.
 */
export type EmbedDisplayFlags = {
  solutionDisplayMode?: "button" | "displayed" | "none";
  showHints?: boolean;
  showCorrectness?: boolean;
  showFeedback?: boolean;
};

const solutionDisplayModes = ["button", "displayed", "none"] as const;
const booleanDisplayFlags = [
  "showHints",
  "showCorrectness",
  "showFeedback",
] as const;

export function parseEmbedDisplayFlags(
  searchParams: URLSearchParams,
): EmbedDisplayFlags {
  const flags: EmbedDisplayFlags = {};

  const solutionDisplayMode = searchParams.get("solutionDisplayMode");
  const mode = solutionDisplayModes.find((m) => m === solutionDisplayMode);
  if (mode) {
    flags.solutionDisplayMode = mode;
  }

  for (const name of booleanDisplayFlags) {
    const value = searchParams.get(name);
    if (value === "true" || value === "false") {
      flags[name] = value === "true";
    }
  }

  return flags;
}

export async function loader({ params, request }: any) {
  const translator = short();
  const displayFlags = parseEmbedDisplayFlags(
    new URL(request.url).searchParams,
  );

  if (translator.validate(params.viewId)) {
    // have a valid content id, so get activity data based on that
    const {
      data: { activity: activityData },
    } = await axios.get(
      `/api/activityEditView/getPublicContent/${params.viewId}`,
    );

    const contentId = activityData.contentId;

    if (activityData.type === "singleDoc") {
      const doenetML = activityData.doenetML;
      const doenetmlVersion: DoenetmlVersion = activityData.doenetmlVersion;

      return {
        type: activityData.type,
        activityData,
        doenetML,
        doenetmlVersion,
        contentId,
        displayFlags,
      };
    } else {
      const activityJson = compileActivityFromContent(activityData);

      return {
        type: activityData.type,
        activityData,
        activityJson,
        contentId,
        displayFlags,
      };
    }
  } else {
    // treat as cid
    const {
      data: { activity: activityData },
    } = await axios.get(
      `/api/activityEditView/getPublicContentByCid/${params.viewId}`,
    );

    const contentId = activityData.contentId;

    if (activityData.type === "singleDoc") {
      const doenetML = activityData.doenetML;
      const doenetmlVersion: DoenetmlVersion = activityData.doenetmlVersion;

      return {
        type: activityData.type,
        activityData,
        doenetML,
        doenetmlVersion,
        contentId,
        displayFlags,
      };
    } else {
      const activityJsonFromRevision = JSON.parse(activityData.source);

      if (!isActivitySource(activityJsonFromRevision)) {
        throw new Error("Activity JSON from revision is not valid");
      }

      return {
        type: activityData.type,
        activityData,
        activityJson: activityJsonFromRevision,
        contentId,
        displayFlags,
      };
    }
  }
}

/**
 * Serves the `embed/[contentId]` endpoint so external websites can embed a
 * raw DoenetML activity without additional Doenet site chrome (navbar, menu,
 * footer, etc.).
 *
 * This route is intended to be loaded in an iframe by another web app. When
 * embedded, RawViewer relays SPLICE messages to `window.parent` (if present)
 * so the containing app can communicate with the document.
 *
 * The embedding page can adjust what is displayed with query parameters; see
 * `parseEmbedDisplayFlags`.
 */
export function RawViewer() {
  const data = useLoaderData() as {
    contentId: string;
    activityData: Content;
    displayFlags: EmbedDisplayFlags;
  } & (
    | {
        type: "singleDoc";
        doenetML: string;
        doenetmlVersion: DoenetmlVersion;
      }
    | {
        type: "select" | "sequence";
        activityJson: ActivitySource;
      }
  );

  const baseUrl = window.location.protocol + "//" + window.location.host;
  const doenetViewerUrl = `${baseUrl}/embed`;

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // If we have a parent, relay SPLICE and lti messages
      // between parent and window or, if singleDoc, between parent and iframe
      if (window.parent !== window) {
        // ignore any messages that aren't SPLICE or lti messages
        if (
          !event.data.subject?.startsWith("SPLICE") &&
          !event.data.subject?.startsWith("lti")
        ) {
          return;
        }

        const iframe = document.querySelector("iframe");

        // If we have a single doc, and there is no iframe, we can't proceed
        if (data.type === "singleDoc") {
          if (!iframe) {
            return;
          }
        }

        // If message originates from parent window
        if (event.source === window.parent) {
          if (data.type === "singleDoc") {
            // If we have a single doc, relay to our iframe
            iframe!.contentWindow!.postMessage(
              event.data,
              window.location.origin,
            );
          }
        } else {
          if (data.type === "singleDoc") {
            // If we have a single doc, verify message is from our iframe
            if (event.source !== iframe!.contentWindow) {
              return;
            }
          }

          window.parent.postMessage(event.data, "*");
        }
      }
    };

    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, [data]);

  if (data.type === "singleDoc") {
    return (
      <DoenetViewer
        doenetML={data.doenetML}
        doenetmlVersion={data.doenetmlVersion.fullVersion}
        // Embed follows the host/OS ("system"), but still force light for
        // versions that predate dark-mode support so old docs aren't defective.
        darkMode={effectiveDarkMode("system", data.doenetmlVersion.fullVersion)}
        attemptNumber={1}
        doenetViewerUrl={doenetViewerUrl}
        doenetImagesUrl={doenetImagesUrl}
        includeVariantSelector={true}
        addVirtualKeyboard={false}
        flags={data.displayFlags}
      />
    );
  } else {
    const activityData = data.activityData;
    return (
      <DoenetActivityViewer
        source={data.activityJson}
        // Compound activity: per-leaf version, so we can't gate here; keep the
        // embed's "system" behavior.
        darkMode={effectiveDarkMode("system")}
        requestedVariantIndex={1}
        paginate={
          activityData.type === "sequence" ? activityData.paginate : false
        }
        showTitle={false}
        doenetViewerUrl={doenetViewerUrl}
        doenetImagesUrl={doenetImagesUrl}
        flags={{
          allowLoadState: true,
          allowSaveState: true,
          allowSaveEvents: true,
          allowSaveSubmissions: true,
          ...data.displayFlags,
        }}
      />
    );
  }
}
