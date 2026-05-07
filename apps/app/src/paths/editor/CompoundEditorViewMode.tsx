import { useLoaderData, useOutletContext } from "react-router";
import { BlueBanner } from "../../widgets/BlueBanner";
import axios from "axios";
import { ActivityViewer as DoenetActivityViewer } from "@doenet/assignment-viewer";
import { ActivitySource } from "@doenet-tools/shared";
import { EditorContext } from "./EditorHeader";

export async function loader({ params }: { params: any }) {
  const {
    data: {
      source,
      paginate,
      activityLevelAttempts,
      itemLevelAttempts,
      maxAttemptsAllowed,
    },
  } = await axios.get(`/api/editor/getCompoundEditorView/${params.contentId}`);

  return {
    source,
    paginate,
    activityLevelAttempts,
    itemLevelAttempts,
    maxAttemptsAllowed,
  };
}

/**
 * This page allows you to view your compound activity (e.g. problem set) as you are editing it.
 * Context: `compoundEditor`
 */
export function CompoundEditorViewMode() {
  const {
    source,
    paginate,
    activityLevelAttempts,
    itemLevelAttempts,
    maxAttemptsAllowed,
  } = useLoaderData() as {
    source: ActivitySource;
    paginate: boolean;
    activityLevelAttempts: boolean;
    itemLevelAttempts: boolean;
    maxAttemptsAllowed?: number;
  };

  const { headerHeight } = useOutletContext<EditorContext>();

  const baseUrl = window.location.protocol + "//" + window.location.host;
  const doenetViewerUrl = `${baseUrl}/activityViewer`;

  return (
    <BlueBanner headerHeight={headerHeight}>
      <DoenetActivityViewer
        source={source}
        requestedVariantIndex={1}
        userId={"hi"}
        doenetViewerUrl={doenetViewerUrl}
        paginate={paginate}
        activityLevelAttempts={activityLevelAttempts}
        itemLevelAttempts={itemLevelAttempts}
        maxAttemptsAllowed={maxAttemptsAllowed}
        showTitle={false}
      />
    </BlueBanner>
  );
}
