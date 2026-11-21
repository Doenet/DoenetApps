// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = "Doenet Blog";
export const SITE_DESCRIPTION =
  "A place where the Doenet community shares thoughts and ideas about math education";

export const BLOG_BASE_URL = "/blog";
// Empty in development, where the blog is served by the app at /blog and
// links back to it are relative (they then work on any forwarded host too).
export const APP_URL: string = import.meta.env.PUBLIC_APP_URL || "";
