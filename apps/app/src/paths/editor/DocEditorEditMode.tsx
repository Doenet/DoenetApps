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
  // Capture initial source for the DoenetEditor prop. In the released
  // @doenet/doenetml-iframe (<= 0.7.17), changes to the `doenetML` prop change
  // the iframe's srcDoc and re-mount the iframe, which detaches the editor
  // document mid-typing and crashes Cypress's key event simulator. The dev
  // build memoizes srcDoc against the initial doenetML; remove this stable
  // ref once that fix lands in a release.
  const initialDoenetMLRef = useRef(source);
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
  // CI can pin the DoenetML engine version (e.g. to a dev release under test for
  // the render-stall fix) via VITE_DOENETML_VERSION; defaults to the content's
  // version everywhere else, so dev/prod are unchanged. See issue #2957.
  const editorDoenetmlVersion =
    import.meta.env.VITE_DOENETML_VERSION || doenetmlVersion.fullVersion;

  return (
    <DoenetEditor
      height="100%"
      width="100%"
      doenetML={initialDoenetMLRef.current}
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
      doenetmlVersion={editorDoenetmlVersion}
      initialWarnings={initialWarnings}
      border="none"
      readOnly={readOnly}
      doenetViewerUrl={doenetViewerUrl}
    />
  );
}
