import { defineConfig } from "cypress";
//@ts-expect-error no types
import addAccessibilityTasks from "wick-a11y/accessibility-tasks";
import { plugin as cypressGrepPlugin } from "@cypress/grep/plugin";

export default defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
    setupNodeEvents(on, config) {
      addAccessibilityTasks(on);

      cypressGrepPlugin(config);
      return config;
    },
  },
});
