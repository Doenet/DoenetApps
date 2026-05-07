import { ReactElement, useState } from "react";
import { Box } from "@chakra-ui/react";
import { DoenetViewer } from "@doenet/doenetml-iframe";
import { DoenetmlVersion } from "../types";
import { ActivitySource } from "@doenet-tools/shared";
import { ActivityViewer as DoenetActivityViewer } from "@doenet/assignment-viewer";

export default function AssignmentPreview({
  data,
  active = true,
  maxHeight = 600,
  disableShuffle = true,
}: {
  data:
    | {
        type: "singleDoc";
        doenetML: string;
        doenetmlVersion: DoenetmlVersion;
      }
    | {
        type: "select" | "sequence";
        activityJson: ActivitySource;
      };
  active?: boolean;
  maxHeight?: number;
  disableShuffle?: boolean;
}) {
  const [variants, setVariants] = useState({
    index: 1,
    numVariants: 1,
    allPossibleVariants: ["a"],
  });

  let viewer: ReactElement<any> | null = null;

  const baseUrl = window.location.protocol + "//" + window.location.host;
  const doenetViewerUrl = `${baseUrl}/activityViewer`;

  if (active) {
    if (data.type === "singleDoc") {
      viewer = (
        <DoenetViewer
          doenetML={data.doenetML}
          doenetmlVersion={data.doenetmlVersion.fullVersion}
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
          generatedVariantCallback={setVariants}
          requestedVariantIndex={variants.index}
          doenetViewerUrl={doenetViewerUrl}
        />
      );
    } else {
      const source =
        disableShuffle && data.activityJson.type === "sequence"
          ? { ...data.activityJson, shuffle: false }
          : data.activityJson;

      viewer = (
        <DoenetActivityViewer
          source={source}
          requestedVariantIndex={1}
          doenetViewerUrl={doenetViewerUrl}
          paginate={false}
          showTitle={false}
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
        />
      );
    }
  }

  return (
    <Box
      background="var(--canvas)"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="doenet.mediumGray"
      width="100%"
      overflow="scroll"
      maxHeight={maxHeight}
    >
      {viewer}
    </Box>
  );
}
