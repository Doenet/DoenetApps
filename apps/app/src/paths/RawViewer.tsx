import { DoenetViewer } from "@doenet/doenetml-iframe";
import axios from "axios";
import { useLoaderData } from "react-router";
import { ActivitySource, isActivitySource } from "@doenet-tools/shared";
import { Content, DoenetmlVersion } from "../types";
import { compileActivityFromContent } from "../utils/activity";
import { useEffect } from "react";
import { ActivityViewer as DoenetActivityViewer } from "@doenet/assignment-viewer";
import short from "short-uuid";

export async function loader({ params }: any) {
  const translator = short();

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
      };
    } else {
      const activityJsonFromRevision = activityData.activityJson
        ? JSON.parse(activityData.activityJson)
        : null;

      const activityJson = isActivitySource(activityJsonFromRevision)
        ? activityJsonFromRevision
        : compileActivityFromContent(activityData);

      return {
        type: activityData.type,
        activityData,
        activityJson,
        contentId,
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
 */
export function RawViewer() {
  const data = useLoaderData() as {
    contentId: string;
    activityData: Content;
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
        attemptNumber={1}
        doenetViewerUrl={doenetViewerUrl}
        includeVariantSelector={true}
        addVirtualKeyboard={false}
      />
    );
  } else {
    const activityData = data.activityData;
    return (
      <DoenetActivityViewer
        source={data.activityJson}
        requestedVariantIndex={1}
        paginate={
          activityData.type === "sequence" ? activityData.paginate : false
        }
        showTitle={false}
        doenetViewerUrl={doenetViewerUrl}
        flags={{
          allowLoadState: true,
          allowSaveState: true,
          allowSaveEvents: true,
          allowSaveSubmissions: true,
        }}
      />
    );
  }
}
