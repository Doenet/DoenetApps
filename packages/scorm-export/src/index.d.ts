/** Constant package files keyed by output filename, plus the optional probe. */
export type ScormAssets = Record<string, string> & { debugProbe?: string };

export interface ScormOptions {
  /** The DoenetML source for the activity. */
  doenetML: string;
  /** Title shown in the LMS. */
  title?: string;
  /**
   * Stable activity id.  Keys the student's score and saved state in the LMS
   * and in localStorage, so it must not change across re-exports.
   */
  id: string;
  /** @doenet/standalone version to pin.  Defaults to "latest". */
  doenetVersion?: string;
  /** Inline debug/size-probe.html into index.html. */
  debug?: boolean;
}

export const TEMPLATE_FILES: string[];
export const STATIC_FILES: string[];
export const REQUIRED_ASSETS: string[];

export function scormSlug(id: string): string;

export function buildScormFiles(
  assets: ScormAssets,
  options: ScormOptions,
): Record<string, string>;

export function buildScormPackage(
  assets: ScormAssets,
  options: ScormOptions,
): { name: string; zip: Uint8Array };
