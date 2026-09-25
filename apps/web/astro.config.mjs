// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import process from "node:process";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { loadEnv } from "vite";
import path from "node:path";

import react from "@astrojs/react";

const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "production";
const env = loadEnv(mode, process.cwd(), "");
// Dev ports live in apps/api/.env (see .env.example); the environment wins.
const webPort =
  Number(loadEnv("development", path.resolve("../api"), "").WEB_PORT) || 4321;

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  site: env.PUBLIC_SITE_URL,
  server: { port: webPort },
  integrations: [mdx(), sitemap(), react()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
