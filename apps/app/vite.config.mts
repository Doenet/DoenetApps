import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import react from "@vitejs/plugin-react";
import nodePolyfills from "rollup-plugin-polyfill-node";
import { defineConfig } from "vite";

import { createRequire } from "module";
import path from "node:path";
import { loadEnv } from "vite";
const require = createRequire(import.meta.url);

// Dev ports live in apps/api/.env (see .env.example); the environment wins.
const env = loadEnv("development", path.resolve("../api"), "");
const apiPort = Number(env.PORT) || 3000;
const appPort = Number(env.APP_PORT) || 8000;
const webPort = Number(env.WEB_PORT) || 4321;

export default defineConfig(({ command }) => ({
  // Quiet the dev server: `command === "serve"` suppresses info-level chatter
  // (the `[vite] page reload` flood from the shared-package watcher and the
  // startup "ready" line — we print our own URL banner). Warnings and errors
  // still show, and `vite build` output is left untouched.
  logLevel: command === "serve" ? "warn" : "info",
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
    port: appPort,
    proxy: {
      // Route blog pages and Astro-generated assets through the same frontend
      // entry point used by the app in production.
      "/blog": `http://localhost:${webPort}`,
      "/_astro": `http://localhost:${webPort}`,
      "/_image": `http://localhost:${webPort}`,
      "/cyapi": "http://apache",
      //"/media": "http://apache",
      "/api": `http://localhost:${apiPort}`,
      "/media": `http://localhost:${apiPort}`,
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
}));
