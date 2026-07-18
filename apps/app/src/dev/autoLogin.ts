import axios from "axios";

const AUTOLOGIN_PARAM = "autologin";
const DEV_EMAIL = "dev@doenet.org";

/**
 * Dev-only convenience: opening `http://localhost:<port>/?autologin=true` signs
 * you in as a fixed dev user, skipping the mock magic-link dance. `npm run dev`
 * prints the ready-to-click URL once the API is up.
 *
 * Because it is triggered by an explicit URL, logging out and refreshing the
 * plain URL leaves you logged out — there is no automatic re-login.
 *
 * It relies on the API's test-auth bypass, so the API's `.env` needs
 * `ENABLE_TEST_AUTH_BYPASS="true"` (the default in `.env.example`).
 *
 * Gated on the dev-server mode so it is stripped from every real build. NOTE:
 * we deliberately do *not* use `import.meta.env.DEV` — this app's dev script
 * runs `vite` with NODE_ENV=production, which makes Vite report `DEV === false`
 * even for the local dev server. Only the local dev server runs mode
 * "development" (deploys build with `--mode prod`/`--mode dev3`, and
 * `vite build` defaults to mode "production").
 */
export async function ensureDevAutoLogin(): Promise<void> {
  if (import.meta.env.MODE !== "development") {
    return;
  }

  const url = new URL(window.location.href);
  if (!url.searchParams.has(AUTOLOGIN_PARAM)) {
    return;
  }

  // Strip the trigger up front so a refresh (or a failed attempt) doesn't keep
  // re-firing it, and so it never lands in history or a bookmark. This runs
  // before the router initializes, so it starts on the cleaned URL.
  url.searchParams.delete(AUTOLOGIN_PARAM);
  window.history.replaceState(null, "", url.toString());

  try {
    await axios.post("/api/login/createOrLoginAsTest", {
      email: DEV_EMAIL,
      firstNames: "Dev",
      lastNames: "User",
      isAuthor: true,
      isEditor: true,
      canUploadImages: true,
    });
    console.info(`[dev-autologin] Signed in as ${DEV_EMAIL}`);
  } catch (e) {
    const status = axios.isAxiosError(e) ? e.response?.status : undefined;
    if (status === 404) {
      console.warn(
        "[dev-autologin] /api/login/createOrLoginAsTest is not registered. " +
          'Set ENABLE_TEST_AUTH_BYPASS="true" in apps/api/.env and restart the API.',
      );
    } else {
      console.warn("[dev-autologin] Auto-login failed:", e);
    }
  }
}
