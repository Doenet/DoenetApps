# Web — Agent Instructions

See root `AGENTS.md` for commands and overall architecture.

## Stack

Astro static site with React islands (`@astrojs/react`), MDX support, and math rendering via KaTeX (`remark-math` + `rehype-katex`).

## Content

Blog posts live in `src/content/` as `.md` or `.mdx` files. Required frontmatter fields (enforced by Zod schema in `src/content.config.ts`):

```ts
title: string
description: string
author: string
pubDate: date
heroImage: string
organization?: string
updatedDate?: date
```
