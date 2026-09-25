// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import process from "node:process";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { loadEnv } from "vite";

import react from "@astrojs/react";

import { webPort } from "../../scripts/worktree-env.js";

const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "production";
const env = loadEnv(mode, process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  site: env.PUBLIC_SITE_URL,
  // host is unset on a normal checkout (localhost only); the dev container
  // sets DEV_SERVER_HOST=0.0.0.0 so the published port reaches it.
  server: { port: webPort, host: process.env.DEV_SERVER_HOST },
  integrations: [mdx(), sitemap(), react()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
