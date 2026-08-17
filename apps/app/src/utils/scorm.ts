// Builds the "Download SCORM" zip entirely in the browser.
//
// A SCORM package is template substitution plus a zip, so there is no reason
// to round-trip through the API: @doenet-tools/scorm-export exposes the same
// pure builder that its CLI (build.mjs) uses, and we hand it the package's
// constant files as strings.  Vite's `?raw` inlines them at build time, so the
// vendored copies in the package stay the single verbatim source (they are
// GPL and must not be edited — see the package's vendor/VENDORED.md).

import {
  buildScormPackage,
  scormSlug,
  type ScormAssets,
} from "@doenet-tools/scorm-export";

import imsmanifestXml from "@doenet-tools/scorm-export/templates/imsmanifest.xml?raw";
import indexHtml from "@doenet-tools/scorm-export/templates/index.html?raw";
import activityHtml from "@doenet-tools/scorm-export/templates/activity.html?raw";
import ptxScormEventsJs from "@doenet-tools/scorm-export/vendor/pretext/ptx_scorm_events.js?raw";
import ltiIframeResizerJs from "@doenet-tools/scorm-export/vendor/pretext/lti_iframe_resizer.js?raw";
// Pinned to the same version the scorm-export package pins; index.html loads
// it under this filename to compress activity state into cmi.suspend_data.
import lzStringJs from "lz-string/libs/lz-string.min.js?raw";

import { schemaAssets } from "./scormSchemas";

const assets: ScormAssets = {
  "imsmanifest.xml": imsmanifestXml,
  "index.html": indexHtml,
  "activity.html": activityHtml,
  "ptx_scorm_events.js": ptxScormEventsJs,
  "lti_iframe_resizer.js": ltiIframeResizerJs,
  "lz-string.min.js": lzStringJs,
  // The SCORM control documents imsmanifest.xml points at, shipped at the zip
  // root so a strict validator can resolve them offline.
  ...schemaAssets,
};

export function downloadScormPackage({
  doenetML,
  title,
  contentId,
  doenetmlVersion,
}: {
  doenetML: string;
  title: string;
  /**
   * The activity's contentId, used as the SCORM activity id.  It keys the
   * student's score and saved state in the LMS and in localStorage, so it has
   * to survive renames — which is exactly why the id is the contentId and not
   * a slug of the title.
   */
  contentId: string;
  doenetmlVersion: string;
}) {
  const { name, zip } = buildScormPackage(assets, {
    doenetML,
    title,
    id: contentId,
    // Pin the viewer the activity was authored against, so an uploaded package
    // does not drift under the LMS the way "latest" would.
    doenetVersion: doenetmlVersion,
  });

  // The id makes a stable but unreadable filename (it is a hash), so name the
  // download after the title instead; only the in-package id must be stable.
  const titleSlug = scormSlug(title);
  const filename = titleSlug ? `${titleSlug}-scorm.zip` : name;

  const url = URL.createObjectURL(
    new Blob([zip as BlobPart], { type: "application/zip" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking synchronously can race the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
