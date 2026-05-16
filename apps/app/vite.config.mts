import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import react from "@vitejs/plugin-react";
import nodePolyfills from "rollup-plugin-polyfill-node";
import { defineConfig } from "vite";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default defineConfig({
  // Node.js global to browser globalThis
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    // Pre-bundle known heavy/late-loaded deps used by component tests to
    // avoid Vite re-optimization and hot-reload churn during Cypress runs.
    include: [
      "@doenet/v06-to-v07",
      "@doenet/doenetml-iframe",
      "better-react-mathjax",
      "ipfs-only-hash",
      "math-expressions",
      "cssesc",
    ],
  },
  plugins: [
    react(),
    // Enable esbuild polyfill plugins
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
    }),
    NodeModulesPolyfillPlugin(),
  ],
  server: {
    port: 8000,
    proxy: {
      // Route blog pages and Astro-generated assets through the same frontend
      // entry point used by the app in production.
      "/blog": "http://localhost:4321",
      "/_astro": "http://localhost:4321",
      "/_image": "http://localhost:4321",
      "/cyapi": "http://apache",
      //"/media": "http://apache",
      "/api": "http://localhost:3000",
      "/media": "http://localhost:3000",
      //"/api": "http://apache",
    },
  },
  worker: {
    format: "iife",
  },
  build: {
    outDir: "./dist",
    rollupOptions: {
      plugins: [nodePolyfills()],
      input: "index.html",
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      // Bugfix required to handle issue with vite, rollup and libs (like react-datetime)
      // https://github.com/vitejs/vite/issues/2139#issuecomment-1399098579
      defaultIsModuleExports(id) {
        try {
          const module = require(id);
          if (module?.default) return false;
          return "auto";
        } catch (_error) {
          return "auto";
        }
      },
    },
  },
});
