// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import process from "node:process";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { loadEnv } from "vite";

import react from "@astrojs/react";

const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "production";
const env = loadEnv(mode, process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  site: env.PUBLIC_SITE_URL,
  integrations: [mdx(), sitemap(), react()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
