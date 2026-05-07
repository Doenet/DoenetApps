/**
 * Canonical IDs for Chakra menus that participate in iframe-safe dismiss logic.
 *
 * These IDs are the shared keys used by menu state/control helpers
 * (for example `useIframeMenuDismissOverlay` and `useControlledMenu`) to
 * track each menu's open state and coordinate page-level dismiss overlays.
 *
 * Centralizing IDs here avoids duplicated string literals across components
 * and gives us typed, refactor-safe references.
 */
export const IFRAME_MENU_IDS = {
  scratchPadHelp: "scratchPadHelp",
  scratchPadLoad: "scratchPadLoad",
  activityViewerAddTo: "activityViewerAddTo",
  activityViewerAddContent: "activityViewerAddContent",
  activityViewerContributors: "activityViewerContributors",
  editorHeaderHelp: "editorHeaderHelp",
} as const;

/**
 * Union type of all valid iframe menu IDs.
 *
 * Use this type for API boundaries that accept a menu ID so callers must pass
 * one of the centralized values above rather than arbitrary strings.
 */
export type IframeMenuId =
  (typeof IFRAME_MENU_IDS)[keyof typeof IFRAME_MENU_IDS];
