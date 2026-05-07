import { ContentType } from "../types";

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
