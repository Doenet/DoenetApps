import axios, { type AxiosInstance } from "axios";

/**
 * Which build of the app this tab is running.
 *
 * Each frontend deploy builds its commit into the bundle and stamps
 * `/version.json` with the same commit. Open tabs are not reloaded when a new
 * build is deployed. Instead:
 *
 * - every `/api` request says which build sent it (`X-Client-Build`), and the
 *   API logs it, so before removing an old API shape we can confirm no build
 *   that still uses it is calling (see "Removing an API shape" in
 *   infra/README.md);
 * - when a page fails, the error page checks whether the tab is out of date
 *   and, if so, suggests a reload (`OutdatedBuildNotice`).
 *
 * In local dev there is no built-in commit, so neither happens.
 */
export const CLIENT_BUILD = import.meta.env.VITE_COMMIT_SHA as
  | string
  | undefined;

/**
 * Add `X-Client-Build` to requests to our own `/api`. Only those: the app also
 * sends files straight to S3, where a custom header would force a CORS
 * preflight the bucket isn't set up for.
 */
export function sendClientBuild(
  instance: AxiosInstance = axios,
  build = CLIENT_BUILD,
) {
  if (!build) {
    return;
  }
  instance.interceptors.request.use((config) => {
    if (config.url?.startsWith("/api/")) {
      config.headers.set("X-Client-Build", build);
    }
    return config;
  });
}

/**
 * Whether the deployed build is no longer this tab's: usually a newer one,
 * after a rollback an older one. False when it can't tell: no built-in
 * commit, or `/version.json` missing or unreadable.
 */
export async function isOutdatedBuild(build = CLIENT_BUILD): Promise<boolean> {
  if (!build) {
    return false;
  }
  try {
    const response = await fetch("/version.json", { cache: "no-store" });
    if (!response.ok) {
      return false;
    }
    const { sha } = (await response.json()) as { sha?: unknown };
    return typeof sha === "string" && sha !== "" && sha !== build;
  } catch {
    return false;
  }
}
