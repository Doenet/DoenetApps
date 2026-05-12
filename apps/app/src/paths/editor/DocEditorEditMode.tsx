import {
  type ComponentProps,
  type ComponentType,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  useBlocker,
  useLoaderData,
  useOutletContext,
  useSearchParams,
} from "react-router";
import { DoenetmlVersion } from "../../types";
import { DoenetEditor, type DoenetEditorHandle } from "@doenet/doenetml-iframe";
import axios, { AxiosError } from "axios";
import { EditorContext } from "./EditorHeader";
import {
  editorDiagnosticsSearchParam,
  type EditorDiagnosticsTab,
} from "../../utils/url";

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
type EditorComponent = ComponentType<ComponentProps<typeof DoenetEditor>>;

type DiagnosticsPanelRequest = {
  diagnosticsTab: EditorDiagnosticsTab;
  requestId: number;
};

export interface DocEditorEditModeComponentProps {
  contentId: string;
  source: string;
  readOnly: boolean;
  doenetmlVersion: DoenetmlVersion;
  editorComponent?: EditorComponent;
}

export function DocEditorEditMode() {
  const { contentId, assignmentStatus } = useOutletContext<EditorContext>();
  const readOnly = assignmentStatus !== "Unassigned";

  const { source, doenetmlVersion } = useLoaderData() as {
    source: string;
    doenetmlVersion: DoenetmlVersion;
  };

  return (
    <DocEditorEditModeComponent
      contentId={contentId}
      source={source}
      readOnly={readOnly}
      doenetmlVersion={doenetmlVersion}
    />
  );
}

export function DocEditorEditModeComponent({
  contentId,
  source,
  readOnly,
  doenetmlVersion,
  editorComponent,
}: DocEditorEditModeComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialDiagnosticsTab] = useState<EditorDiagnosticsTab | undefined>(
    () => getRequestedDiagnosticsTab(searchParams) ?? undefined,
  );
  const [diagnosticsPanelRequest, setDiagnosticsPanelRequest] =
    useState<DiagnosticsPanelRequest>(() => ({
      diagnosticsTab: "errors",
      requestId: 0,
    }));
  const hasConsumedInitialDiagnosticsLink = useRef(
    initialDiagnosticsTab === undefined,
  );

  useEffect(() => {
    const requestedTab = getRequestedDiagnosticsTab(searchParams);
    if (!requestedTab) {
      return;
    }

    if (hasConsumedInitialDiagnosticsLink.current) {
      setDiagnosticsPanelRequest((prev) => ({
        diagnosticsTab: requestedTab,
        requestId: prev.requestId + 1,
      }));
    } else {
      hasConsumedInitialDiagnosticsLink.current = true;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete(editorDiagnosticsSearchParam);
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <DocumentEditor
      contentId={contentId}
      source={source}
      readOnly={readOnly}
      doenetmlVersion={doenetmlVersion}
      diagnosticsPanelRequest={diagnosticsPanelRequest}
      initialDiagnosticsTab={initialDiagnosticsTab}
      editorComponent={editorComponent}
    />
  );
}

function DocumentEditor({
  contentId,
  source,
  readOnly,
  doenetmlVersion,
  diagnosticsPanelRequest,
  initialDiagnosticsTab,
  editorComponent: EditorComponent = DoenetEditor,
}: {
  contentId: string;
  source: string;
  readOnly: boolean;
  doenetmlVersion: DoenetmlVersion;
  diagnosticsPanelRequest: DiagnosticsPanelRequest;
  initialDiagnosticsTab?: EditorDiagnosticsTab;
  editorComponent?: EditorComponent;
}) {
  const textEditorDoenetML = useRef(source);
  const savedDoenetML = useRef(source);
  const editorRef = useRef<DoenetEditorHandle>(null);

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

  useLayoutEffect(() => {
    if (diagnosticsPanelRequest.requestId === 0) {
      return;
    }
    editorRef.current?.openDiagnosticsTab(
      diagnosticsPanelRequest.diagnosticsTab,
    );
  }, [diagnosticsPanelRequest]);

  const baseUrl = window.location.protocol + "//" + window.location.host;
  const doenetViewerUrl = `${baseUrl}/activityViewer`;

  return (
    <EditorComponent
      ref={editorRef}
      height="100%"
      width="100%"
      doenetML={textEditorDoenetML.current}
      doenetmlChangeCallback={() => {
        // BUG on DoenetML: This callback is supposed to be called when doenetml saves, but it is also called
        // when doenet ml first renders
        // See https://github.com/Doenet/DoenetML/issues/525
        handleSaveDoc();
      }}
      diagnosticsSummaryCallback={(
        diagnostics: Diagnostics,
        doenetML: string,
      ) => {
        handleDiagnosticsSummary(contentId, doenetML, diagnostics);
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
      initialOpenTab={initialDiagnosticsTab}
      doenetmlVersion={doenetmlVersion.fullVersion}
      initialWarnings={initialWarnings}
      border="none"
      readOnly={readOnly}
      doenetViewerUrl={doenetViewerUrl}
    />
  );
}

function getRequestedDiagnosticsTab(searchParams: URLSearchParams) {
  const requestedTab = searchParams.get(editorDiagnosticsSearchParam);
  if (requestedTab === "errors" || requestedTab === "accessibility") {
    return requestedTab;
  }
  return null;
}

/**
 * Reimplementation of a `DoenetEditor` type since the package doesn't export types correctly
 * The argument of `diagnosticsSummaryCallback`.
 */
type Diagnostics = {
  accessibilityLevel1Count: number;
  accessibilityLevel2Count: number;
  errorsCount: number;
  infosCount: number;
  warningsCount: number;
};

function handleDiagnosticsSummary(
  contentId: string,
  source: string,
  diagnostics: Diagnostics,
) {
  axios.put(`/api/content/${contentId}/audit`, {
    source,
    errorsCheckPasses: diagnostics.errorsCount === 0,
    accessibilityCheckPasses: diagnostics.accessibilityLevel1Count === 0,
  });
}
