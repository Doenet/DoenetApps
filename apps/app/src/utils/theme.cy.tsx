import { doenetColorModeManager } from "./theme";

// The production ChakraProviders use this manager so Chakra hydrates its color
// mode from `doenet-theme-setting` (the site's source of truth) instead of its
// own key. The component-test harness mounts with a fixed manager, so this
// manager's resolution logic is exercised directly here.
describe("doenetColorModeManager", { tags: ["@group4"] }, () => {
  const KEY = "doenet-theme-setting";

  function stubPrefersColorScheme(dark: boolean) {
    cy.stub(window, "matchMedia").callsFake(
      (query: string) =>
        ({
          matches: dark,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
  }

  afterEach(() => window.localStorage.removeItem(KEY));

  it("returns the explicit light/dark setting", () => {
    window.localStorage.setItem(KEY, "dark");
    expect(doenetColorModeManager.get()).to.equal("dark");
    window.localStorage.setItem(KEY, "light");
    expect(doenetColorModeManager.get()).to.equal("light");
  });

  it("resolves `system` against the OS preference", () => {
    window.localStorage.setItem(KEY, "system");
    stubPrefersColorScheme(true);
    expect(doenetColorModeManager.get()).to.equal("dark");
  });

  it("resolves `system` to light when the OS prefers light", () => {
    window.localStorage.setItem(KEY, "system");
    stubPrefersColorScheme(false);
    expect(doenetColorModeManager.get()).to.equal("light");
  });

  it("defaults to `system` resolution when nothing is stored", () => {
    stubPrefersColorScheme(true);
    expect(doenetColorModeManager.get()).to.equal("dark");
  });
});
