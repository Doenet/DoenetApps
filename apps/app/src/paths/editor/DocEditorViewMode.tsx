import { useRef } from "react";
import { useLoaderData, useOutletContext } from "react-router";
import { DoenetmlVersion } from "../../types";
import { DoenetViewer } from "@doenet/doenetml-iframe";
import { BlueBanner } from "../../widgets/BlueBanner";
import axios from "axios";
import { Box } from "@chakra-ui/react";
import { EditorContext } from "./EditorHeader";

export async function loader({ params }: { params: any }) {
  const {
    data: { source, doenetmlVersion },
  } = await axios.get(`/api/editor/getDocEditorDoenetML/${params.contentId}`);

  return {
    source,
    doenetmlVersion,
  };
}

/**
 * This page allows you to view your document as you are editing it.
 * Context: `documentEditor`
 */
export function DocEditorViewMode() {
  const { source, doenetmlVersion } = useLoaderData() as {
    source: string;
    doenetmlVersion: DoenetmlVersion | null;
  };

  const { headerHeight } = useOutletContext<EditorContext>();

  const doenetViewerContainer = useRef<HTMLDivElement>(null);
  const scrollingContainer = useRef<HTMLDivElement>(null);
  const baseUrl = window.location.protocol + "//" + window.location.host;
  const doenetViewerUrl = `${baseUrl}/activityViewer`;

  function requestScrollTo(offset: number) {
    if (doenetViewerContainer.current && scrollingContainer.current) {
      const iframeTop =
        doenetViewerContainer.current.getBoundingClientRect().top +
        scrollingContainer.current.scrollTop;
      const targetAbsoluteTop = iframeTop + offset;

      scrollingContainer.current.scrollTo({
        top: targetAbsoluteTop - 90,
        behavior: "smooth",
      });
    }
  }

  return (
    <Box
      height={`calc(100vh - ${headerHeight})`}
      ref={scrollingContainer}
      overflowY="scroll"
      width="100%"
    >
      <Box ref={doenetViewerContainer}>
        <BlueBanner headerHeight={headerHeight}>
          <DoenetViewer
            doenetML={source}
            doenetmlVersion={doenetmlVersion!.fullVersion}
            flags={{
              showCorrectness: true,
              solutionDisplayMode: "button",
              showFeedback: true,
              showHints: true,
              autoSubmit: false,
              allowLoadState: false,
              allowSaveState: false,
              allowLocalState: false,
              allowSaveEvents: false,
            }}
            attemptNumber={1}
            doenetViewerUrl={doenetViewerUrl}
            includeVariantSelector={true}
            requestScrollTo={requestScrollTo}
          />
        </BlueBanner>
      </Box>
    </Box>
  );
}
