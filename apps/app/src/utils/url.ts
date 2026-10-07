import { ContentType } from "../types";

export type EditorDiagnosticsTab = "errors" | "accessibility";

export const editorDiagnosticsSearchParam = "diagnostics";

/**
 * The url for this content's editor page
 * Default tab is `edit`, but you can specify a different one.
 * You can also specify that you want the special curator mode which
 * gives library editors their special controls.
 */
export function editorUrl(
  contentId: string,
  contentType: ContentType,
  tabPath:
    | "edit"
    | "view"
    | "settings"
    | "history"
    | "remixes"
    | "library" = "edit",
  inCurateMode = false,
) {
  return `/${contentType === "singleDoc" ? "documentEditor" : "compoundEditor"}/${contentId}/${tabPath}${inCurateMode ? "?curate" : ""}`;
}

/**
 * The url for viewing this content.
 * Folders open in the shared-activities browser, which needs the owner id to
 * build the route; all other content opens in the activity viewer. A folder
 * without a known owner falls back to the activity viewer.
 */
export function contentViewerUrl(
  contentType: ContentType,
  contentId: string,
  ownerId: string | undefined,
) {
  return contentType === "folder" && ownerId !== undefined
    ? `/sharedActivities/${ownerId}/${contentId}`
    : `/activityViewer/${contentId}`;
}

export function editorDiagnosticsUrl(
  contentId: string,
  contentType: ContentType,
  diagnosticsTab: EditorDiagnosticsTab,
) {
  const editUrl = editorUrl(contentId, contentType, "edit");
  return contentType === "singleDoc"
    ? `${editUrl}?${editorDiagnosticsSearchParam}=${diagnosticsTab}`
    : editUrl;
}
