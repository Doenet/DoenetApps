import type { ThemeSetting } from "@doenet/assignment-viewer";
import { useColorMode } from "@chakra-ui/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useFetcher } from "react-router";

export type { ThemeSetting };

/**
 * The user's theme preference is stored under this localStorage key as one of
 * the {@link ThemeSetting} values. It is the source of truth for both the
 * DoenetML viewer `darkMode` prop and the Chakra site chrome. (Chakra keeps its
 * own resolved `light`/`dark` value under `chakra-ui-color-mode`.)
 */
export const THEME_SETTING_STORAGE_KEY = "doenet-theme-setting";

/**
 * The lowest DoenetML `fullVersion` whose CDN rendering engine supports dark
 * mode. Documents pinned to anything older are forced to light, because their
 * engine bundle predates the dark-mode CSS and would render black-on-black.
 */
export const MIN_DARK_MODE_DOENETML_VERSION = "0.7.21";

/**
 * Resolve the `darkMode` value to hand a DoenetML viewer/editor for a document
 * of the given DoenetML `fullVersion`. Old engine versions can't theme, so we
 * force `"light"` for them regardless of the site setting.
 */
export function effectiveDarkMode(
  setting: ThemeSetting,
  fullVersion?: string,
): ThemeSetting {
  if (setting === "light") {
    return "light";
  }
  return supportsDarkMode(fullVersion) ? setting : "light";
}

/**
 * Whether a DoenetML `fullVersion` string is at least
 * {@link MIN_DARK_MODE_DOENETML_VERSION}. Unknown/`"latest"`/`"dev"`/unparseable
 * versions are treated as newest (supported); a `-dev.N`/prerelease suffix is
 * ignored so `"0.7.21-dev.3"` counts as `"0.7.21"`.
 */
export function supportsDarkMode(fullVersion?: string): boolean {
  if (!fullVersion || fullVersion === "latest" || fullVersion === "dev") {
    return true;
  }
  const core = fullVersion.split("-")[0].trim();
  const parts = core.split(".").map(Number);
  if (parts.some(Number.isNaN)) {
    return true;
  }
  const min = MIN_DARK_MODE_DOENETML_VERSION.split(".").map(Number);
  for (let i = 0; i < min.length; i++) {
    const a = parts[i] ?? 0;
    if (a !== min[i]) {
      return a > min[i];
    }
  }
  return true;
}

function isThemeSetting(value: unknown): value is ThemeSetting {
  return value === "system" || value === "light" || value === "dark";
}

function readStoredThemeSetting(): ThemeSetting {
  try {
    const stored = localStorage.getItem(THEME_SETTING_STORAGE_KEY);
    if (isThemeSetting(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (privacy mode); fall through to default.
  }
  return "system";
}

function writeStoredThemeSetting(setting: ThemeSetting) {
  try {
    localStorage.setItem(THEME_SETTING_STORAGE_KEY, setting);
  } catch {
    // Best-effort; a failed write just means no cross-reload persistence.
  }
}

function resolveColorMode(
  setting: ThemeSetting,
  prefersDark: boolean,
): "light" | "dark" {
  if (setting === "dark") return "dark";
  if (setting === "light") return "light";
  return prefersDark ? "dark" : "light";
}

/**
 * Site-wide theme controller. Holds the tri-state {@link ThemeSetting}
 * preference, keeps Chakra's resolved color mode in sync (and follows live OS
 * changes while set to `"system"`), and persists changes to localStorage and —
 * for logged-in users — the server. Call this ONCE, inside the `ChakraProvider`
 * (it uses `useColorMode`); distribute the returned values via `SiteContext`
 * and down the navbar. The `/embed` `RawViewer` route sits outside this tree
 * and intentionally does not use it.
 */
export function useThemeSetting(user?: { theme?: ThemeSetting }): {
  themeSetting: ThemeSetting;
  setThemeSetting: (setting: ThemeSetting) => void;
} {
  const { setColorMode } = useColorMode();
  const fetcher = useFetcher();
  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>(
    readStoredThemeSetting,
  );

  // Keep Chakra's resolved (light/dark) chrome in sync with the preference, and
  // while on "system" follow live OS `prefers-color-scheme` changes. (When the
  // setting is light/dark the listener re-applies the same value — a no-op.)
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      setColorMode(resolveColorMode(themeSetting, mql.matches));
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [themeSetting, setColorMode]);

  // For logged-in users the DB value is authoritative across devices; adopt it
  // once it arrives (and rewrite localStorage so the next first paint matches).
  useEffect(() => {
    if (user?.theme && user.theme !== themeSetting) {
      setThemeSettingState(user.theme);
      writeStoredThemeSetting(user.theme);
    }
    // Intentionally keyed only on the incoming DB value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.theme]);

  const setThemeSetting = useCallback(
    (setting: ThemeSetting) => {
      setThemeSettingState(setting);
      writeStoredThemeSetting(setting);
      if (user) {
        fetcher.submit(
          { path: "user/setTheme", theme: setting },
          { method: "post", encType: "application/json" },
        );
      }
    },
    [fetcher, user],
  );

  return { themeSetting, setThemeSetting };
}

const ThemeSettingContext = createContext<{
  themeSetting: ThemeSetting;
  setThemeSetting: (setting: ThemeSetting) => void;
}>({
  themeSetting: "system",
  setThemeSetting: () => {},
});

/**
 * Provides the site theme to all descendants — including DoenetML render sites
 * behind nested router outlets (the document editor) that shadow `SiteContext`.
 * Mounted in `SiteHeader`. The `/embed` `RawViewer` route sits outside it.
 */
export const ThemeSettingProvider = ThemeSettingContext.Provider;

/**
 * Read the site theme at any DoenetML viewer/editor render site. Outside the
 * provider (e.g. the `/embed` RawViewer) this returns the `"system"` default.
 */
export function useThemeSettingContext() {
  return useContext(ThemeSettingContext);
}
