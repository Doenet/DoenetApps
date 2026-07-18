import { defineConfig } from "cypress";
//@ts-expect-error no types
import addAccessibilityTasks from "wick-a11y/accessibility-tasks";
import { plugin as cypressGrepPlugin } from "@cypress/grep/plugin";

export default defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      // Pre-bundle heavy deps that only some specs import, so Vite optimizes
      // them once at startup instead of discovering them mid-run. Otherwise,
      // reaching the first spec that imports e.g. math-expressions (~4MB, via
      // AnswerResponseDrawer -> utils/responses) makes Vite re-optimize and
      // full-reload the page, which aborts the in-flight dynamic import of the
      // Cypress support file: "Failed to fetch dynamically imported module:
      // .../support/component.tsx", reported "outside of a test". That was an
      // intermittent component-tests CI failure. See issue #2957.
      viteConfig: {
        optimizeDeps: {
          include: [
            "math-expressions",
            "better-react-mathjax",
            "luxon",
            "axios",
            // ScoreSummaryChart.cy.tsx is the first component spec to import
            // recharts; pre-bundle it so Vite doesn't re-optimize mid-run and
            // full-reload the page (issue #2957).
            "recharts",
          ],
        },
      },
    },
    setupNodeEvents(on, config) {
      addAccessibilityTasks(on);

      cypressGrepPlugin(config);
      return config;
    },
  },
});
