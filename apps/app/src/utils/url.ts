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
