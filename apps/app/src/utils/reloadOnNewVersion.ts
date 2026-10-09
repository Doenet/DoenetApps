import { createPath, type createBrowserRouter } from "react-router";

/**
 * Keep open tabs on the latest deployed version of the app.
 *
 * Each frontend deploy builds its commit into the bundle and stamps
 * `/version.json` with the same commit. We compare the two when the tab starts
 * and again in the background, and once they differ turn the next navigation
 * into a full page load, so the tab picks up the new build at a moment when
 * nothing is lost. Without this, a tab left open keeps calling the API the way
 * an old build did; the API contract only stays compatible with old builds for
 * a limited time.
 *
 * The check at startup catches a tab that loaded an old build from a cache.
 * That's why the tab's commit comes from the bundle, not from `/version.json`:
 * a fresh `/version.json` next to a cached bundle would hide the difference.
 *
 * In local dev there is no built-in commit, so this does nothing.
 */

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

type Router = ReturnType<typeof createBrowserRouter>;

async function fetchDeployedCommit(): Promise<string | null> {
  try {
    const response = await fetch("/version.json", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const { sha } = (await response.json()) as { sha?: unknown };
    return typeof sha === "string" && sha !== "" ? sha : null;
  } catch {
    return null;
  }
}

/**
 * Starts watching for new deploys. The returned handle exists for tests: the
 * app ignores it, since the watch lasts for the life of the tab.
 */
export function reloadOnNewVersion(
  router: Router,
  {
    buildCommit = import.meta.env.VITE_COMMIT_SHA as string | undefined,
    // Swappable so component tests can observe the reload without leaving the page.
    reload = (path) => window.location.assign(path),
  }: {
    /** The commit this bundle was built from. */
    buildCommit?: string;
    reload?: (path: string) => void;
  } = {},
): {
  /** Resolves once the first check is done. */
  ready: Promise<void>;
  /** Re-checks the deployed commit now. */
  check: () => Promise<void>;
  stop: () => void;
} {
  let newVersionDeployed = false;

  async function check() {
    if (!buildCommit || newVersionDeployed || document.hidden) {
      return;
    }
    const deployed = await fetchDeployedCommit();
    if (deployed && deployed !== buildCommit) {
      newVersionDeployed = true;
    }
  }

  if (!buildCommit) {
    return { ready: Promise.resolve(), check, stop() {} };
  }

  const interval = setInterval(check, CHECK_INTERVAL_MS);
  document.addEventListener("visibilitychange", check);

  const unsubscribe = router.subscribe((state) => {
    const { location, state: navigationState, formMethod } = state.navigation;
    // Skip the "loading" that follows a form submission (POST etc.): its
    // action has run, and reloading would drop the result it returned and any
    // request the action started without awaiting. The next plain navigation
    // reloads instead. A GET submission is an ordinary navigation.
    const afterSubmission =
      formMethod !== undefined && formMethod.toUpperCase() !== "GET";
    if (
      newVersionDeployed &&
      navigationState === "loading" &&
      location &&
      !afterSubmission
    ) {
      reload(createPath(location));
    }
  });

  return {
    ready: check(),
    check,
    stop() {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      unsubscribe();
    },
  };
}
