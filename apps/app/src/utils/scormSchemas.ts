// The SCORM 2004 4th Edition control documents, inlined for the browser build.
//
// imsmanifest.xml names five of these in its xsi:schemaLocation and a content
// package traditionally carries them at its root, so they ship inside the zip
// (see the scorm-export package's vendor/scorm/VENDORED.md).  Listed one by one
// rather than globbed because they come from a workspace package, where Vite's
// import.meta.glob does not reliably reach.
//
// This is ~88 KB of string, which is why the export path is loaded on demand —
// see downloadScormPackage's caller.

import imscp from "@doenet-tools/scorm-export/vendor/scorm/imscp_v1p1.xsd?raw";
import adlcp from "@doenet-tools/scorm-export/vendor/scorm/adlcp_v1p3.xsd?raw";
import adlseq from "@doenet-tools/scorm-export/vendor/scorm/adlseq_v1p3.xsd?raw";
import adlnav from "@doenet-tools/scorm-export/vendor/scorm/adlnav_v1p3.xsd?raw";
import imsss from "@doenet-tools/scorm-export/vendor/scorm/imsss_v1p0.xsd?raw";
import imsssAuxresource from "@doenet-tools/scorm-export/vendor/scorm/imsss_v1p0auxresource.xsd?raw";
import imsssControl from "@doenet-tools/scorm-export/vendor/scorm/imsss_v1p0control.xsd?raw";
import imsssDelivery from "@doenet-tools/scorm-export/vendor/scorm/imsss_v1p0delivery.xsd?raw";
import imsssLimit from "@doenet-tools/scorm-export/vendor/scorm/imsss_v1p0limit.xsd?raw";
import imsssObjective from "@doenet-tools/scorm-export/vendor/scorm/imsss_v1p0objective.xsd?raw";
import imsssRandom from "@doenet-tools/scorm-export/vendor/scorm/imsss_v1p0random.xsd?raw";
import imsssRollup from "@doenet-tools/scorm-export/vendor/scorm/imsss_v1p0rollup.xsd?raw";
import imsssSeqrule from "@doenet-tools/scorm-export/vendor/scorm/imsss_v1p0seqrule.xsd?raw";
import imsssUtil from "@doenet-tools/scorm-export/vendor/scorm/imsss_v1p0util.xsd?raw";
import xml from "@doenet-tools/scorm-export/vendor/scorm/xml.xsd?raw";

export const schemaAssets: Record<string, string> = {
  "imscp_v1p1.xsd": imscp,
  "adlcp_v1p3.xsd": adlcp,
  "adlseq_v1p3.xsd": adlseq,
  "adlnav_v1p3.xsd": adlnav,
  "imsss_v1p0.xsd": imsss,
  "imsss_v1p0auxresource.xsd": imsssAuxresource,
  "imsss_v1p0control.xsd": imsssControl,
  "imsss_v1p0delivery.xsd": imsssDelivery,
  "imsss_v1p0limit.xsd": imsssLimit,
  "imsss_v1p0objective.xsd": imsssObjective,
  "imsss_v1p0random.xsd": imsssRandom,
  "imsss_v1p0rollup.xsd": imsssRollup,
  "imsss_v1p0seqrule.xsd": imsssSeqrule,
  "imsss_v1p0util.xsd": imsssUtil,
  "xml.xsd": xml,
};
