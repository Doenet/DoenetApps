// Legacy (DoenetML 0.6) documents migrated from legacy.doenet.org can contain
// <ref uri="doenet:activityId=<id>"> links to other activities. The 0.6 engine
// builds those links from its `linkSettings` prop, and its baked-in default
// points at legacy-site routes (`/portfolioviewer/...`), so it must be told
// this site's routes. The doenetml-iframe wrapper forwards unrecognized props
// through to whichever engine version it loads, but its prop *type* is derived
// from the 0.7 viewer (which has no `linkSettings`) — hence this loosely typed
// spread helper: <DoenetViewer {...legacyRefLinkProps} ... />. The 0.7 engine
// ignores the extra prop.
//
// Note: @doenet/assignment-viewer does NOT pass unrecognized props through, so
// problem sets rendered via DoenetActivityViewer need that package to expose
// linkSettings before refs work there (same path doenetImagesUrl took).
export const legacyRefLinkProps: Record<string, unknown> = {
  linkSettings: {
    viewURL: "/activityViewer",
    editURL: "/documentEditor",
    useQueryParameters: false,
  },
};
