/**
 * Inline style strings for dynamically generated newsletter HTML
 * (Used in generate-newsletter.astro for client-side HTML generation)
 */

export const newsletterStyles = {
  // Top-level newsletter layout styles
  newsletterTable:
    "width: 600px; margin: 0 auto; border-collapse: collapse; font-family: sans-serif;",
  newsletterHeaderCell:
    "padding: 27px 18px 2px 18px; background: #ffffff; border-bottom: 3px solid #0066cc;",
  newsletterHeaderTable: "width: 100%; border-collapse: collapse;",
  newsletterHeaderLeftCell:
    "text-align: left; vertical-align: bottom; font-size: 22px; color: #666; font-family: sans-serif; padding-bottom: 10px;",
  newsletterHeaderRightCell: "text-align: right; vertical-align: bottom;",
  newsletterLogoImage:
    "height: 50px; width: auto; display: inline-block; margin: 0 0 0 0;",
  newsletterSpacerCell: "height: 54px;",
  newsletterFooterTable:
    "width: 600px; margin: 36px auto 0 auto; border-collapse: collapse; font-family: sans-serif;",
  newsletterFooterCell:
    "padding: 27px 18px; text-align: center; background: #f8f9fa; border-top: 1px solid #e0e0e0;",
  newsletterFooterText:
    "margin: 0; font-size: 15px; color: #666; font-family: sans-serif;",
  newsletterFooterLink: "color: #0066cc; text-decoration: underline;",

  // Download/copy wrapper styles
  wrapperBody:
    "margin: 0; padding: 0; font-family: sans-serif; font-size: 18px; background-color: #f5f5f5;",
  wrapperOuterTable: "margin: 0; padding: 0;",
  wrapperOuterCell: "padding: 40px 0;",
  wrapperInnerTable: "width: 600px; background-color: #ffffff;",

  // Table and cell styles
  table:
    "width: 600px; margin: 0 auto 54px auto; border-collapse: collapse; table-layout: fixed;",
  headerCell:
    "padding: 36px 22px 14px 22px; background: #ffffff; border: none; border-radius: 0; word-break: break-word; overflow-wrap: anywhere;",
  headerInnerTable:
    "width: 100%; border-collapse: collapse; vertical-align: middle;",
  headerImageCell: "width: 150px; padding: 0 18px 0 0; vertical-align: middle;",
  headerContentCell: "vertical-align: middle; padding: 0;",
  cell: "padding: 10px 22px; background: #ffffff; border: none; border-radius: 0; word-break: break-word; overflow-wrap: anywhere;",
  separator:
    "width: 600px; margin: 0 auto 36px auto; border-collapse: collapse;",
  separatorCell: "height: 2px; background: #c0c0c0;",
  heroImage: "width: 150px; height: auto; display: block; border-radius: 4px;",

  // Text styles
  title:
    "margin: 0 0 5px 0; font-size: 28px; line-height: 1.3; color: #1a1a1a; font-family: sans-serif;",
  titleLink: "color: #1a1a1a; text-decoration: none; font-size: 28px;",
  meta: "margin: 0 0 0px 0; font-size: 16px; color: #666; font-style: italic; font-family: sans-serif;",
  description:
    "margin: 0 0 18px 0; font-size: 18px; line-height: 1.6; color: #555; font-family: sans-serif;",
  body: "margin: 0 0 18px 0; font-family: sans-serif; font-size: 18px; line-height: 1.6; color: #333; word-break: break-word; overflow-wrap: anywhere;",

  // Excerpt element styles
  paragraph:
    "margin: 0 0 18px 0; line-height: 1.6; color: #333; font-size: 18px;",
  heading1:
    "margin: 27px 0 9px 0; line-height: 1.3; color: #1a1a1a; font-size: 32px;",
  heading2:
    "margin: 27px 0 9px 0; line-height: 1.3; color: #1a1a1a; font-size: 28px;",
  heading3:
    "margin: 27px 0 9px 0; line-height: 1.3; color: #1a1a1a; font-size: 24px;",
  heading4:
    "margin: 27px 0 9px 0; line-height: 1.3; color: #1a1a1a; font-size: 20px;",
  link: "color: #0066cc; text-decoration: underline; font-size: 18px;",
  list: "margin: 0 0 18px 0; padding-left: 36px; font-size: 18px;",
  listItem: "margin: 0 0 9px 0; line-height: 1.6; font-size: 18px;",
  codeBlock:
    "background: #f5f5f5; padding: 18px; border-radius: 4px; overflow-x: auto; margin: 18px 0; font-size: 16px;",
  codeInline:
    "background: #f5f5f5; padding: 4px 7px; border-radius: 3px; font-family: monospace; font-size: 16px;",
  blockquote:
    "border-left: 4px solid #ddd; padding-left: 18px; margin: 18px 0; color: #666; font-size: 18px;",
  image: "max-width: 100%; height: auto; display: block; margin: 18px 0;",

  // Button styles
  buttonWrap: "margin: 27px 0 0 0; font-family: sans-serif; font-size: 18px;",
  button:
    "display: inline-block; padding: 11px 22px; background: #0066cc; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 18px;",

  // Events section styles
  eventsSection:
    "width: 600px; margin: 0 auto 54px auto; border-collapse: collapse; table-layout: fixed; background: #f8f9fa;",
  eventsHeader: "padding: 18px 22px; background: #0066cc; color: #ffffff;",
  eventsTitle:
    "margin: 0; font-size: 24px; line-height: 1.3; color: #ffffff; font-family: sans-serif; font-weight: bold;",
  eventsContent: "padding: 36px 22px;",
  eventsBody:
    "margin: 0 0 18px 0; font-family: sans-serif; font-size: 18px; line-height: 1.6; color: #333;",
};
