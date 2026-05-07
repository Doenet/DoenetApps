import { useCallback, useEffect, useRef } from "react";
import { useBlocker, useLoaderData, useOutletContext } from "react-router";
import { DoenetmlVersion } from "../../types";
import { DoenetEditor } from "@doenet/doenetml-iframe";
import axios, { AxiosError } from "axios";
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
 * This page allows you to edit your doenetml and save it to the server.
 * Context: `documentEditor`
 */
export function DocEditorEditMode() {
  const { contentId, assignmentStatus } = useOutletContext<EditorContext>();
  const readOnly = assignmentStatus !== "Unassigned";

  const { source, doenetmlVersion } = useLoaderData() as {
    source: string;
    doenetmlVersion: DoenetmlVersion;
  };

  return (
    <DocumentEditor
      contentId={contentId}
      source={source}
      readOnly={readOnly}
      doenetmlVersion={doenetmlVersion}
    />
  );
}

function DocumentEditor({
  contentId,
  source,
  readOnly,
  doenetmlVersion,
}: {
  contentId: string;
  source: string;
  readOnly: boolean;
  doenetmlVersion: DoenetmlVersion;
}) {
  const textEditorDoenetML = useRef(source);
  const savedDoenetML = useRef(source);

  const numVariants = useRef(1);
  const documentStructureChanged = useRef(false);

  // const readOnly =
  //   doc.assignmentInfo?.assignmentStatus ?? "Unassigned" !== "Unassigned";
  const readOnlyRef = useRef(readOnly);

  const initialWarnings = doenetmlVersion.deprecated
    ? [
        {
          level: 1,
          message: `DoenetML version
            ${doenetmlVersion.displayedVersion} is deprecated.
            ${doenetmlVersion.deprecationMessage}`,
          doenetMLrange: {},
        },
      ]
    : [];

  const inTheMiddleOfSaving = useRef(false);
  const postponedSaving = useRef(false);

  const handleSaveDoc = useCallback(async () => {
    if (
      readOnlyRef.current ||
      (savedDoenetML.current === textEditorDoenetML.current &&
        !documentStructureChanged.current)
    ) {
      // do not attempt to save doenetml if assigned
      return;
    }

    const newDoenetML = textEditorDoenetML.current;
    if (inTheMiddleOfSaving.current) {
      postponedSaving.current = true;
    } else {
      inTheMiddleOfSaving.current = true;

      //Save in localStorage
      // localStorage.setItem(cid,doenetML)

      try {
        const params = {
          doenetML: newDoenetML,
          contentId,
          numVariants: numVariants.current,
        };
        await axios.post("/api/updateContent/saveDoenetML", params);
        savedDoenetML.current = newDoenetML;
        documentStructureChanged.current = false;
      } catch (error) {
        if (error instanceof AxiosError) {
          alert(error.message);
        }
      }

      inTheMiddleOfSaving.current = false;

      //If we postponed then potentially
      //some changes were saved again while we were saving
      //so save again
      if (postponedSaving.current) {
        postponedSaving.current = false;
        handleSaveDoc();
      }
    }
  }, [contentId]);

  // Block when leaving this page to go to view mode
  const blocker = useBlocker(({ nextLocation }) =>
    nextLocation.pathname.endsWith(`${contentId}/view`),
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      (async () => {
        try {
          await handleSaveDoc(); // wait for save to finish
        } finally {
          blocker.proceed();
        }
      })();
    }
  }, [blocker, handleSaveDoc]);

  // save draft when leave page
  useEffect(() => {
    return () => {
      handleSaveDoc();
    };
  }, [handleSaveDoc]);

  const baseUrl = window.location.protocol + "//" + window.location.host;
  const doenetViewerUrl = `${baseUrl}/activityViewer`;

  return (
    <DoenetEditor
      height="100%"
      width="100%"
      doenetML={textEditorDoenetML.current}
      doenetmlChangeCallback={() => {
        // BUG on DoenetML: This callback is supposed to be called when doenetml saves, but it is also called
        // when doenet ml first renders
        // See https://github.com/Doenet/DoenetML/issues/525
        handleSaveDoc();
      }}
      immediateDoenetmlChangeCallback={(newDoenetML: string) => {
        textEditorDoenetML.current = newDoenetML;
      }}
      documentStructureCallback={(x: any) => {
        if (Array.isArray(x.args?.allPossibleVariants)) {
          numVariants.current = x.args.allPossibleVariants.length;
        }
        documentStructureChanged.current = true;
      }}
      doenetmlVersion={doenetmlVersion.fullVersion}
      initialWarnings={initialWarnings}
      border="none"
      readOnly={readOnly}
      doenetViewerUrl={doenetViewerUrl}
    />
  );
}
